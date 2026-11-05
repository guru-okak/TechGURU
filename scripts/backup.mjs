import {DatabaseSync,backup} from 'node:sqlite'
import {mkdirSync,readdirSync,existsSync,writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('../',import.meta.url))
function exportSql(filename){
 const output=filename.replace(/\.sqlite$/,'.sql');if(existsSync(output))return
 const db=new DatabaseSync(filename,{readOnly:true})
 try{
  const tables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()
  const quote=v=>v===null?'NULL':typeof v==='number'?String(v):v instanceof Uint8Array?"X'"+Buffer.from(v).toString('hex')+"'":"'"+String(v).replaceAll("'","''")+"'"
  const lines=['PRAGMA foreign_keys=OFF;','BEGIN TRANSACTION;',...tables.map(t=>t.sql+';')]
  for(const table of tables)for(const row of db.prepare(`SELECT * FROM "${table.name}"`).all())lines.push(`INSERT INTO "${table.name}" (${Object.keys(row).map(k=>'"'+k+'"').join(',')}) VALUES (${Object.values(row).map(quote).join(',')});`)
  lines.push(...db.prepare("SELECT sql FROM sqlite_master WHERE type IN ('trigger','index','view') AND sql IS NOT NULL AND name NOT LIKE '_cf_%'").all().map(o=>o.sql+';'),'COMMIT;','PRAGMA foreign_keys=ON;')
  const sql=lines.join('\n'),restored=new DatabaseSync(':memory:')
  try{restored.exec(sql);if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||restored.prepare('PRAGMA foreign_key_check').all().length)throw Error('SQL restore verification failed')}finally{restored.close()}
  writeFileSync(output,sql,{encoding:'utf8',mode:0o600})
 }finally{db.close()}
}
export async function backupLocal(){
 const directory=path.join(root,'.local/d1/v3/d1/miniflare-D1DatabaseObject')
 if(!existsSync(directory))return
 const output=path.join(root,'.local/backups');mkdirSync(output,{recursive:true})
 for(const file of readdirSync(directory).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){
  const db=new DatabaseSync(path.join(directory,file),{readOnly:true})
  try{
   if(!db.prepare("SELECT name FROM sqlite_master WHERE name='requests'").get())continue
   const target=path.join(output,'TechGURU-'+new Date().toISOString().slice(0,10)+'.sqlite')
   if(existsSync(target)){exportSql(target);return target}
   await backup(db,target)
   const check=new DatabaseSync(target,{readOnly:true})
   try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup integrity verification failed')}finally{check.close()}
   exportSql(target);return target
  }finally{db.close()}
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await backupLocal()??'Local database not initialized')
