import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
function fixture(){
 let user={id:1},calls=[],applied=[]
 const source=readFileSync(new URL('../../src/api/workspace.js',import.meta.url),'utf8')
 const code=source.slice(source.indexOf('let workspaceScreen'),source.indexOf('export async function loadPublic')).replaceAll('export ','')
 const context=vm.createContext({useSession:()=>({user:{get value(){return user}}}),api:()=>new Promise((resolve,reject)=>calls.push({resolve,reject})),apply:data=>applied.push(data),workspaceError:{value:''},requests:{setCurrentMaster(){}},profile:{setCurrentMaster(){},profileSkills:[]}})
 vm.runInContext(code,context)
 return {context,calls,applied,setUser:value=>{user=value}}
}
test('workspace combines concurrent reads',async()=>{
 const f=fixture(),a=f.context.refreshWorkspace(),b=f.context.refreshWorkspace()
 assert.equal(f.calls.length,1)
 f.calls[0].resolve({user:{id:1},marker:1});await Promise.all([a,b]);assert.equal(f.applied.length,1)
})
test('workspace reads again after a mutation during an older read',async()=>{
 const f=fixture(),old=f.context.refreshWorkspace(),fresh=f.context.refreshWorkspace({fresh:true})
 f.calls[0].resolve({user:{id:1},marker:'old'});await old;await new Promise(resolve=>setImmediate(resolve))
 assert.equal(f.calls.length,2)
 f.calls[1].resolve({user:{id:1},marker:'fresh'});await fresh;assert.equal(f.applied.at(-1).marker,'fresh')
})
test('workspace never applies a response after logout and another login',async()=>{
 const f=fixture(),old=f.context.refreshWorkspace();f.context.clearWorkspace();f.setUser({id:2})
 const current=f.context.refreshWorkspace();f.calls[0].resolve({user:{id:1}});await old
 assert.equal(f.applied.filter(Boolean).length,0)
 f.calls[1].resolve({user:{id:2}});await current;assert.equal(f.applied.at(-1).user.id,2)
})

test('workspace ignores a response for a page left during loading',async()=>{
 const f=fixture(),old=f.context.refreshWorkspace();f.context.setWorkspaceScreen('/client/services')
 const current=f.context.refreshWorkspace();assert.equal(f.calls.length,2)
 f.calls[0].resolve({user:{id:1},marker:'old'});await old;assert.equal(f.applied.length,0)
 f.calls[1].resolve({user:{id:1},marker:'catalog'});await current;assert.equal(f.applied.at(-1).marker,'catalog')
})
