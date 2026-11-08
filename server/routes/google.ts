import {SignJWT,jwtVerify,createRemoteJWKSet} from 'jose'
import {z} from 'zod'
import type {Env} from '../env.ts'
import {HttpError,json,readJson} from '../middleware/http.ts'
import {authHeaders,getCookie,requireCsrf} from '../security/cookies.ts'
import {randomToken,tokenHash,signingKey,createRefresh,createAccess,REFRESH_TTL} from '../security/tokens.ts'
import {AuthRepository,publicUser} from '../repositories/auth.ts'
import {auditMetadata,requireGuest} from '../services/auth.ts'
import {hashPassword,verifyPassword} from '../security/passwords.ts'
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const issuer='techguru-google'
async function signed(env:Env,data:Record<string,unknown>){return new SignJWT(data).setProtectedHeader({alg:'HS256'}).setIssuer(issuer).setExpirationTime('10m').sign(signingKey(env))}
async function claims(env:Env,token:string){return (await jwtVerify(token,signingKey(env),{algorithms:['HS256'],issuer})).payload}
function stateCookie(value:string,age=600){return `google_flow=${value}; Path=/api/auth/google; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`}
export async function identitySession(request:Request,env:Env,userId:number){
 const repo=new AuthRepository(env.DB),u=await env.DB.prepare('SELECT email FROM users WHERE id=? AND is_active=1').bind(userId).first<{email:string}>()
 if(!u)throw new HttpError(403,'ACCOUNT_DISABLED','Аккаунт недоступен')
 const user=await repo.userByEmail(u.email);if(!user)throw new HttpError(401,'UNAUTHENTICATED','Требуется вход')
 const refresh=await createRefresh(),sid=await repo.createSession(user,refresh,new Date(Date.now()+REFRESH_TTL*1000).toISOString(),auditMetadata(request,env))
 return {user:publicUser(user),headers:authHeaders(request,env,await createAccess(env,user.id,user.role,sid),refresh.token)}
}
export async function googleRoute(request:Request,env:Env):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname
 if(!path.startsWith('/api/auth/google/'))return null
 if(path==='/api/auth/google/config')return json({data:{enabled:!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET)}})
 if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)throw new HttpError(503,'GOOGLE_UNAVAILABLE','Вход через Google временно недоступен')
 const callback=url.origin+'/api/auth/google/callback'
 if(path==='/api/auth/google/start'&&request.method==='GET'){
  await requireGuest(request,env)
  const state=randomToken(),nonce=randomToken(),verifier=randomToken()
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))
  const challenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
  const target=new URL('https://accounts.google.com/o/oauth2/v2/auth')
  target.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:callback,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}).toString()
  return new Response(null,{status:302,headers:{Location:target.href,'Set-Cookie':stateCookie(await signed(env,{kind:'flow',state,nonce,verifier})),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
 }
 if(path==='/api/auth/google/callback'&&request.method==='GET'){
  let location='/login?google_error=1',headers=new Headers({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'})
  try{
   const flow=await claims(env,getCookie(request,'google_flow')??'')
   if(flow.kind!=='flow'||flow.state!==url.searchParams.get('state')||!url.searchParams.get('code'))throw Error('Invalid flow')
   const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,code:url.searchParams.get('code')!,redirect_uri:callback,grant_type:'authorization_code',code_verifier:String(flow.verifier)}),signal:AbortSignal.timeout(12000)})
   const tokens=await r.json() as {id_token?:string};if(!r.ok||!tokens.id_token)throw Error('Token exchange failed')
   const {payload:p}=await jwtVerify(tokens.id_token,keys,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID,requiredClaims:['sub','email','email_verified','nonce','iat','exp']})
   if(p.nonce!==flow.nonce||p.email_verified!==true||typeof p.email!=='string'||!p.sub)throw Error('Unverified identity')
   const linked=await env.DB.prepare('SELECT id FROM users WHERE google_sub=?').bind(p.sub).first<{id:number}>()
   if(linked){const s=await identitySession(request,env,linked.id);s.headers.forEach((v,k)=>{if(k!=='set-cookie')headers.set(k,v)});for(const v of s.headers.getSetCookie())headers.append('Set-Cookie',v);location='/'+s.user.role}
   else{
    const ticket=await signed(env,{kind:'profile',sub:p.sub,email:p.email.toLowerCase(),name:typeof p.name==='string'?p.name:'',jti:randomToken()})
    headers.append('Set-Cookie',`google_profile=${ticket}; Path=/api/auth/google; Max-Age=600; HttpOnly; Secure; SameSite=Strict`)
    location='/google-complete'
   }
  }catch{ /* Do not expose Google credentials or token responses. */ }
  headers.append('Set-Cookie',stateCookie('',0));headers.set('Location',location)
  return new Response(null,{status:302,headers})
 }
 if(path==='/api/auth/google/profile'&&request.method==='GET'){
  try{const p=await claims(env,getCookie(request,'google_profile')??'');if(p.kind!=='profile')throw Error();const exists=!!await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(p.email).first();return json({data:{email:p.email,name:p.name,exists}})}catch{throw new HttpError(401,'GOOGLE_EXPIRED','Вход Google истёк. Попробуйте ещё раз.')}
 }
 if(path==='/api/auth/google/complete'&&request.method==='POST'){
  requireCsrf(request);await requireGuest(request,env)
  let p;try{p=await claims(env,getCookie(request,'google_profile')??'');if(p.kind!=='profile')throw Error()}catch{throw new HttpError(401,'GOOGLE_EXPIRED','Вход Google истёк')}
  const input=z.object({full_name:z.string().trim().min(2).max(150).optional(),phone:z.string().regex(/^\+[1-9]\d{9,14}$/).optional(),password:z.string().max(128).optional()}).strict().parse(await readJson(request))
  const repo=new AuthRepository(env.DB);let user=await repo.userByEmail(String(p.email))
  if(user){
   const metadata=auditMetadata(request,env),cutoff=new Date(Date.now()-300000).toISOString()
   if(await repo.blockedUntil(metadata.ip,cutoff))throw new HttpError(429,'LOGIN_RATE_LIMITED','Повторите через 5 минут')
   if(!user.is_active||!await verifyPassword(input.password??'',user.password_hash)){await repo.failedLogin(metadata,await tokenHash(String(p.email)),cutoff);throw new HttpError(401,'INVALID_CREDENTIALS','Для привязки введите пароль существующего аккаунта')}
   if(user.google_sub&&user.google_sub!==p.sub)throw new HttpError(409,'GOOGLE_ALREADY_LINKED','Аккаунт уже связан с другим Google')
  }else{
   if(!input.phone||!input.full_name)throw new HttpError(422,'PROFILE_REQUIRED','Укажите имя и телефон')
   if(await repo.duplicate(String(p.email),input.phone))throw new HttpError(409,'ACCOUNT_EXISTS','Телефон уже используется')
   const created=await repo.register({email:String(p.email),phone:input.phone,full_name:input.full_name,password:''},await hashPassword(randomToken()+randomToken()),auditMetadata(request,env))
   user=await repo.userByEmail(created.email!);if(!user)throw Error('Account not created')
  }
  await env.DB.prepare('UPDATE users SET google_sub=?,email_verified=1 WHERE id=? AND (google_sub IS NULL OR google_sub=?)').bind(p.sub,user.id,p.sub).run()
  const result=await identitySession(request,env,user.id)
  result.headers.append('Set-Cookie','google_profile=; Path=/api/auth/google; Max-Age=0; Secure; HttpOnly; SameSite=Strict')
  return json({data:{user:result.user}},200,result.headers)
 }
 throw new HttpError(404,'NOT_FOUND','Маршрут не найден')
}
