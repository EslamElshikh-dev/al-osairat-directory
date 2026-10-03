import { scanForasna } from './forasna.ts';
import { readStructuredJob, structuredListingLinks } from './structured-job.ts';
const sources = [
 {name:'بنك الوظائف المصري',url:'https://egjobank.com/jobs/in/sohag',accepts:(url:string)=>/^https:\/\/egjobank\.com\/(?:en\/)?jobs\/[a-z0-9-]+$/.test(url)},
 {name:'تنقيب',url:'https://egypt.tanqeeb.com/ar/s/'+encodeURIComponent('وظائف')+'/'+encodeURIComponent('وظائف-مصر')+'/'+encodeURIComponent('وظائف-فى-سوهاج'),accepts:(url:string)=>/^https:\/\/egypt\.tanqeeb\.com\/ar\/jobs-in-middle-east\/all\/jobs\/\d+\.html$/.test(url)},
];
export async function scanVerifiedSources() {
 const scans=await Promise.all([scanForasna(),...sources.map(async source=>{
  try {
   const reply=await fetch(source.url,{signal:AbortSignal.timeout(7000)});
   if(!reply.ok) return {ok:false,jobs:[]};
   const html=(await reply.text()).slice(0,600000);
   if(!html.includes('ItemList')) return {ok:false,jobs:[]};
   const links=structuredListingLinks(html,source.url,source.accepts,8);
   const jobs=await Promise.all(links.map(async url=>{
    try {const response=await fetch(url,{signal:AbortSignal.timeout(6500)});return response.ok?readStructuredJob((await response.text()).slice(0,250000),url,source):null;} catch{return null;}
   }));
   return {ok:true,jobs:jobs.filter((job):job is NonNullable<typeof job>=>job!==null)};
  } catch {return {ok:false,jobs:[]};}
 })]);
 return {ok:scans.some(scan=>scan.ok),jobs:scans.flatMap(scan=>scan.jobs)};
}
