import type {Env} from '../env.ts'
export async function dumpDatabase(env:Env){
 const tables=(await env.DB.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all<{name:string;sql:string}>()).results
 const queries=tables.map(t=>env.DB.prepare(`SELECT * FROM "${t.name.replaceAll('"','""')}"`))
 queries.push(env.DB.prepare("SELECT sql FROM sqlite_master WHERE type IN ('index','trigger','view') AND sql IS NOT NULL AND name NOT LIKE '_cf_%'"))
 const results=await env.DB.batch<Record<string,unknown>>(queries)
 const quote=(v:unknown)=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'"
 const dump=['PRAGMA foreign_keys=OFF;','BEGIN TRANSACTION;',...tables.map(t=>t.sql+';')]
 tables.forEach((t,i)=>{for(const row of results[i].results)dump.push(`INSERT INTO "${t.name}" (${Object.keys(row).map(k=>'"'+k+'"').join(',')}) VALUES (${Object.values(row).map(quote).join(',')});`)})
 dump.push(...results.at(-1)!.results.map(o=>String(o.sql)+';'),'COMMIT;','PRAGMA foreign_keys=ON;')
 return dump.join('\n')
}
