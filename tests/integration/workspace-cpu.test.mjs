import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import vm from 'node:vm'
import {tmpdir} from 'node:os'
import path from 'node:path'
const source=readFileSync(new URL('../../src/api/workspace.js',import.meta.url),'utf8')
const code=source.slice(source.indexOf('function replace('),source.indexOf('const noticeDay='))
const context=vm.createContext({});vm.runInContext(code,context)
test('list reconciliation preserves existing row identity, order, removal and new values',()=>{
 const retained={id:2,name:'old'},removed={id:1},rows=[removed,retained]
 context.replace(rows,[{id:2,name:'new'},{id:3,name:'added'}])
 assert.equal(rows[0],retained);assert.equal(retained.name,'new');assert.equal(rows[1].id,3);assert.equal(rows.length,2)
 context.replace(rows,[]);assert.equal(rows.length,0)
})
test('reused notification date format matches existing Russian Moscow output',()=>{
 const formatter=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
 for(const value of ['2026-11-05T00:00:00Z','2026-01-01T21:30:00Z'])assert.equal(formatter.format(new Date(value)),new Date(value).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}))
})
test('profile browser reconciliation and repeated date formatting',()=>{
 const make=()=>Array.from({length:10000},(_,id)=>({id,name:'old'})),incoming=make().reverse()
 const old=make(),updated=make()
 let start=performance.now();const records=incoming.map(row=>{const previous=old.find(r=>r.id===row.id);return previous?Object.assign(previous,row):row});old.splice(0,old.length,...records);const before=performance.now()-start
 start=performance.now();context.replace(updated,incoming);const after=performance.now()-start
 const dates=Array.from({length:1000},(_,i)=>new Date(1762300800000+i*60000)),fmt=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
 start=performance.now();dates.map(d=>d.toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}));const dateBefore=performance.now()-start
 start=performance.now();dates.map(d=>fmt.format(d));const dateAfter=performance.now()-start
 writeFileSync(path.join(tmpdir(),'techguru-browser-cpu-profile.json'),JSON.stringify({scope:'Node/V8 synthetic operations, not total browser page load',rows:10000,listMs:{before,after},notifications:1000,dateMs:{before:dateBefore,after:dateAfter}},null,2))
 console.log(JSON.stringify({listMs:{before,after},dateMs:{before:dateBefore,after:dateAfter}}))
})
