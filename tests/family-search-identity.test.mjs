import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// Isolate the registry's matching logic from the directory's full data bundle.
const canonicalizeDirectoryQuery=value=>value.replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const module={exports:{}};
const source=fs.readFileSync(new URL('../lib/family-search.ts',import.meta.url),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:()=>({canonicalizeDirectoryQuery})});
const {searchFamilyRegistry,isFamilyQuery}=module.exports;
const article={slug:'existing-registry',sections:[{id:'island',heading:'عائلات جزيرة أولاد حمزة',entries:[{name:'آل حمد',description:'عائلة مستقلة'},{name:'آل أحمد',description:'لا ترتبط بآل حمد'},{name:'بيت حماد',description:'ليس آل حمد'}]}]};
test('family queries return name tokens, not another family mentioned in the description',()=>{
 assert.equal(isFamilyQuery('عائلة آل حمد'),true);
 assert.deepEqual(Array.from(searchFamilyRegistry(article,'عائلة آل حمد'),item=>item.title),['آل حمد']);
 assert.equal(searchFamilyRegistry(article,'عائلة مجهولة').length,0);
});
test('registry results retain existing section links and locality searches',()=>{
 assert.equal(searchFamilyRegistry(article,'عائلات جزيرة أولاد حمزة').length,3);
 assert.equal(searchFamilyRegistry(article,'عائلة آل حمد')[0].href,'/blog/existing-registry#island');
});
