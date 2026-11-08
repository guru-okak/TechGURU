import {demoAccounts,buildDemoSeed} from '../db/seeds/demo.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('.local',{recursive:true});
for(const a of demoAccounts)a.password=crypto.randomUUID()+'!aA9';
writeFileSync('.local/production-accounts.json',JSON.stringify(demoAccounts.map(({email,role,password})=>({email,role,password})),null,2));
writeFileSync('.local/production-seed.sql',await buildDemoSeed());
console.log('Private credentials and seed prepared');
