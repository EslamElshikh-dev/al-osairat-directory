import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const manifest = {};
const output = 'public/images/mobile';
await mkdir(output, {recursive:true});
async function walk(dir) {
  const result=[];
  for (const e of await readdir(dir,{withFileTypes:true})) {
    if (e.name==='mobile') continue;
    const file=path.join(dir,e.name);
    if (e.isDirectory()) result.push(...await walk(file));
    else if (/\.(webp|jpe?g|png)$/i.test(file)) result.push(file);
  }
  return result;
}
const files=(await Promise.all(['public/images','public/brand','public/app-icons'].map(walk))).flat();
let bytesBefore=0,bytesMobile=0;
async function prepare(file) {
  const bytes=await readFile(file);
  const meta=await sharp(bytes).metadata();
  if (!meta.width || meta.width<160 || meta.pages>1) return;
  const hash=createHash('sha256').update(bytes).update('usayrat-mobile-v1').digest('hex').slice(0,16);
  const widths=[64,128,320,640,960,1280].filter(w=>w<=meta.width);
  if (!widths.length) return;
  manifest['/'+file.slice(7)]={hash,widths};
  bytesBefore+=bytes.length;
  for (const width of widths) {
    const target=`${output}/${hash}-${width}.webp`;
    if (!await access(target).then(()=>true,()=>false)) await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:80}).toFile(target);
    if(width===Math.min(...widths.filter(w=>w>=320))) bytesMobile+=(await readFile(target)).length;
  }
}
for (let i=0;i<files.length;i+=8) await Promise.all(files.slice(i,i+8).map(prepare));
await writeFile('lib/site-image-manifest.json',JSON.stringify(manifest));
console.log(`Prepared ${Object.keys(manifest).length} responsive images; 320px media ${bytesMobile} bytes versus ${bytesBefore} original bytes.`);
