import type {Env} from '../env.ts'
import type {PublicUser} from '../../shared/contracts/auth.ts'
import {BusinessRepository} from '../repositories/business.ts'
import {dumpDatabase} from '../repositories/backup.ts'
export async function scheduledJobs(env:Env,cron:string){
 if(cron==='0 0 * * *'){if(env.BACKUPS){const date=new Date().toISOString().slice(0,10);await env.BACKUPS.put('techguru/'+date+'.sql',await dumpDatabase(env),{httpMetadata:{contentType:'application/sql'}})}return}
 const actor=await env.DB.prepare("SELECT id,full_name,email,phone,role,address,created_at FROM users WHERE role='admin' AND is_active=1 ORDER BY id LIMIT 1").first<PublicUser>()
 if(!actor)return
 const repo=new BusinessRepository(env,actor,new Request('http://127.0.0.1/internal/scheduled'),true)
 await repo.jobs()
}
