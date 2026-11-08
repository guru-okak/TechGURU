import { connect } from 'cloudflare:sockets'
import type { Env } from '../env.ts'

/** Dedicated Gmail submission over TLS. Never log SMTP traffic: it contains credentials. */
export async function sendAccountEmail(env:Env,to:string,subject:string,text:string):Promise<void>{
 if(!env.SMTP_USER||!env.SMTP_PASSWORD)throw new Error('MAIL_NOT_CONFIGURED')
 if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+$/.test(to)||/[\r\n]/.test(subject))throw new Error('INVALID_MAIL_HEADERS')
 const socket=connect({hostname:'smtp.gmail.com',port:465},{secureTransport:'on',allowHalfOpen:false})
 const timer=setTimeout(()=>{void socket.close().catch(()=>{})},12000)
 const reader=socket.readable.getReader(),writer=socket.writable.getWriter(),decoder=new TextDecoder()
 let buffer=''
 const line=async()=>{while(!buffer.includes('\r\n')){const r=await reader.read();if(r.done)throw new Error('SMTP_CLOSED');buffer+=decoder.decode(r.value,{stream:true});if(buffer.length>65536)throw new Error('SMTP_RESPONSE_TOO_LARGE')}const i=buffer.indexOf('\r\n'),s=buffer.slice(0,i);buffer=buffer.slice(i+2);return s}
 const reply=async(expected:number)=>{let s=await line();while(/^\d{3}-/.test(s))s=await line();if(Number(s.slice(0,3))!==expected)throw new Error('SMTP_REJECTED_'+s.slice(0,3))}
 const command=async(value:string,expected:number)=>{await writer.write(new TextEncoder().encode(value+'\r\n'));await reply(expected)}
 const base64=(s:string)=>btoa(String.fromCharCode(...new TextEncoder().encode(s)))
 try{
  await socket.opened;await reply(220);await command('EHLO techguru.techguru-w.workers.dev',250)
  await command('AUTH LOGIN',334);await command(base64(env.SMTP_USER),334);await command(base64(env.SMTP_PASSWORD),235)
  await command('MAIL FROM:<'+env.SMTP_USER+'>',250);await command('RCPT TO:<'+to+'>',250);await command('DATA',354)
  const body=['From: TechGURU <'+env.SMTP_USER+'>','To: <'+to+'>','Subject: =?UTF-8?B?'+base64(subject)+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(text).match(/.{1,76}/g)?.join('\r\n')??''].join('\r\n')
  await command(body+'\r\n.',250);await command('QUIT',221)
 }finally{clearTimeout(timer);reader.releaseLock();writer.releaseLock();await socket.close().catch(()=>{})}
}

