import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../components/auth/client-session.ts', import.meta.url),'utf8');
async function fresh() {
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js+'\n//'+Math.random()).toString('base64'));
}
const user={displayName:'عضو للاختبار',email:'qa@example.invalid',avatarUrl:'https://example.invalid/avatar.webp'};
test('header and account share one verified request and reuse it',async()=>{
 let requests=0;
 globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({user})}};
 const s=await fresh();
 await Promise.all([s.ensureClientSession(),s.ensureClientSession()]);
 await s.ensureClientSession();
 assert.equal(requests,1);
});
test('logout prevents an older in-flight request restoring a user',async()=>{
 let finish;
 globalThis.fetch=()=>new Promise(resolve=>{finish=resolve});
 const s=await fresh();
 const seen=[];s.subscribeClientSession(u=>seen.push(u));
 const old=s.ensureClientSession();
 s.setClientSessionUser(null);
 finish({ok:true,json:async()=>({user})});
 await old;
 assert.equal(seen.at(-1),null);
 assert.equal(await s.ensureClientSession(),null);
});
test('forced refresh wins over an earlier verification request',async()=>{
 const finish=[];globalThis.fetch=()=>new Promise(resolve=>finish.push(resolve));
 const s=await fresh();const seen=[];s.subscribeClientSession(u=>seen.push(u));
 const older=s.ensureClientSession();const newer=s.refreshClientSession();
 finish[1]({ok:true,json:async()=>({user})});await newer;
 finish[0]({ok:true,json:async()=>({user:null})});await older;
 assert.deepEqual(seen.at(-1),user);
});
test('successful login replaces a cached visitor before account navigation',async()=>{
 let requests=0;
 globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({user:null})}};
 const s=await fresh();
 assert.equal(await s.ensureClientSession(),null);
 s.setClientSessionUser(user);
 assert.deepEqual(await s.ensureClientSession(),user);
 assert.equal(requests,1);
});
