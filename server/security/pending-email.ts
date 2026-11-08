import {SignJWT,jwtVerify} from 'jose'
import type {Env} from '../env.ts'
import {signingKey} from './tokens.ts'
import {getCookie} from './cookies.ts'
export async function pendingEmailCookie(env:Env,id:number){
 const value=await new SignJWT({kind:'pending-email'}).setSubject(String(id)).setProtectedHeader({alg:'HS256'}).setIssuer('techguru-pending').setExpirationTime('30m').sign(signingKey(env))
 return `pending_email=${value}; Path=/api/auth/email; Max-Age=1800; HttpOnly; SameSite=Strict${env.APP_ENV==='local'?'':'; Secure'}`
}
export async function pendingEmailUser(request:Request,env:Env):Promise<number|null>{
 try{const {payload}=await jwtVerify(getCookie(request,'pending_email')??'',signingKey(env),{algorithms:['HS256'],issuer:'techguru-pending'});return payload.kind==='pending-email'&&/^[1-9]\d*$/.test(payload.sub??'')?Number(payload.sub):null}catch{return null}
}
