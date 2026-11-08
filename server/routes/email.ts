import {identitySession} from './google.ts'
import {pendingEmailUser} from '../security/pending-email.ts'
import type {Env} from '../env.ts'
import {z} from 'zod'
import {HttpError,json,readJson} from '../middleware/http.ts'
import {requireCsrf} from '../security/cookies.ts'
import {hashPassword,verifyPassword,DUMMY_PASSWORD_HASH} from '../security/passwords.ts'
import {tokenHash,randomToken,signingKey} from '../security/tokens.ts'
import {sendAccountEmail} from '../services/mail.ts'
import {SignJWT,jwtVerify} from 'jose'
const email=z.string().trim().toLowerCase().email().max(254)
const sendSchema=z.object({email}).strict()
const confirmSchema=z.object({ticket:z.string().max(2000),code:z.string().regex(/^\d{6}$/),password:z.string().min(8).max(128).optional()}).strict()
export async function emailRoute(request:Request,env:Env):Promise<Response|null>{
 const match=/^\/api\/auth\/email\/(verify|reset)\/(send|confirm)$/.exec(new URL(request.url).pathname)
 if(!match)return null
 if(request.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Используйте POST')
 requireCsrf(request)
 const [,purpose,action]=match
 if(action==='send'){
  const input=sendSchema.parse(await readJson(request)), now=new Date().toISOString()
  const ip=request.headers.get('CF-Connecting-IP')??'local'
  const count=await env.DB.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='email_code_request' AND ip_address=? AND created_at>?").bind(ip,new Date(Date.now()-3600000).toISOString()).first<{n:number}>()
  if((count?.n??0)>=15)throw new HttpError(429,'EMAIL_RATE_LIMITED','Слишком много запросов. Попробуйте позже.')
  await env.DB.prepare("INSERT INTO audit_log(role,action,entity_type,details,ip_address) VALUES('system','email_code_request','authentication','{}',?)").bind(ip).run()
  const pending=purpose==='verify'?await pendingEmailUser(request,env):null
  if(purpose==='verify'&&!pending)throw new HttpError(401,'PENDING_EXPIRED','Вернитесь ко входу: срок подтверждения истёк')
  const u=await env.DB.prepare('SELECT id,email_verified,is_active FROM users WHERE '+(purpose==='verify'?'id=?':'email=?')).bind(purpose==='verify'?pending:input.email).first<{id:number,email_verified:number,is_active:number}>()
  if(purpose==='verify'&&(!u?.is_active||u.email_verified))throw new HttpError(401,'PENDING_EXPIRED','Вернитесь ко входу')
  const id=randomToken(),target=input.email
  // Always return a plausible ticket for password recovery; never disclose account existence.
  if(u?.is_active&&(purpose==='verify'||u.email_verified)){
   const recent=await env.DB.prepare('SELECT id FROM auth_challenges WHERE user_id=? AND created_at>? LIMIT 1').bind(u.id,new Date(Date.now()-60000).toISOString()).first()
   if(recent)throw new HttpError(429,'EMAIL_COOLDOWN','Повторная отправка доступна через 60 секунд')
   if(purpose==='verify'&&await env.DB.prepare('SELECT id FROM users WHERE email=? AND id<>?').bind(target,u.id).first())throw new HttpError(409,'ACCOUNT_EXISTS','Этот адрес уже используется')
   const bytes=crypto.getRandomValues(new Uint32Array(1));const code=String(bytes[0]%1000000).padStart(6,'0')
   await env.DB.prepare('UPDATE auth_challenges SET consumed_at=? WHERE user_id=? AND purpose=? AND consumed_at IS NULL').bind(now,u.id,purpose).run()
   await env.DB.prepare('INSERT INTO auth_challenges(id,user_id,purpose,target_email,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,u.id,purpose,target,await tokenHash(id+code),new Date(Date.now()+300000).toISOString(),now).run()
   try{await sendAccountEmail(env,target,purpose==='verify'?'Подтверждение почты TechGURU':'Восстановление пароля TechGURU',`Ваш код: ${code}\n\nОн действует 5 минут. Никому не сообщайте код. Если вы не отправляли запрос, проигнорируйте письмо.`)}catch{
    await env.DB.prepare('DELETE FROM auth_challenges WHERE id=?').bind(id).run()
    throw new HttpError(503,'MAIL_UNAVAILABLE','Не удалось отправить письмо. Повторите позже.')
   }
  }
  const ticket=await new SignJWT({purpose}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('techguru-email').setExpirationTime('5m').sign(signingKey(env))
  return json({data:{ticket,message:'Если адрес подходит для этого действия, на него отправлен код.'}})
 }
 const input=confirmSchema.parse(await readJson(request));let id:string
 try{const {payload}=await jwtVerify(input.ticket,signingKey(env),{algorithms:['HS256'],issuer:'techguru-email'});if(payload.purpose!==purpose||!payload.sub)throw Error();id=payload.sub}catch{throw new HttpError(400,'CODE_INVALID','Код истёк. Запросите новый.')}
 const row=await env.DB.prepare('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=? AND purpose=? AND consumed_at IS NULL AND expires_at>? AND attempts<5 RETURNING *').bind(id,purpose,new Date().toISOString()).first<{user_id:number,code_hash:string,target_email:string}>()
 if(!row||await tokenHash(id+input.code)!==row.code_hash)throw new HttpError(400,'CODE_INVALID','Неверный или просроченный код')
 if(purpose==='reset'&&!input.password)throw new HttpError(422,'PASSWORD_REQUIRED','Укажите новый пароль')
 const hash=purpose==='reset'?await hashPassword(input.password!):''
 const marker=new Date().toISOString()
 const claim=await env.DB.prepare('UPDATE auth_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL RETURNING id').bind(marker,id).first()
 if(!claim)throw new HttpError(400,'CODE_INVALID','Код уже использован')
 await env.DB.batch([
  purpose==='verify'?env.DB.prepare('UPDATE users SET email=?,email_verified=1 WHERE id=?').bind(row.target_email,row.user_id):env.DB.prepare('UPDATE users SET password_hash=? WHERE id=? AND email_verified=1').bind(hash,row.user_id),
  env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(row.user_id),
  env.DB.prepare('UPDATE auth_challenges SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(marker,row.user_id),
 ])
 if(purpose==='verify'){const s=await identitySession(request,env,row.user_id);s.headers.append('Set-Cookie','pending_email=; Path=/api/auth/email; Max-Age=0; Secure; HttpOnly; SameSite=Strict');return json({data:{complete:true,user:s.user}},200,s.headers)}
 return json({data:{complete:true}})
}
