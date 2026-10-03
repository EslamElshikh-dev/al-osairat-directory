import test from 'node:test';
import assert from 'node:assert/strict';
import { placeFor } from '../supabase/functions/osairat-jobs/places.ts';
import { readStructuredJob } from '../supabase/functions/osairat-jobs/structured-job.ts';
import { readForasna } from '../supabase/functions/osairat-jobs/forasna.ts';
import { dedupeJobs } from '../supabase/functions/osairat-jobs/job-dedupe.ts';
const now=Date.parse('2026-10-03T12:00:00Z');
const source={name:'Verified fixture',accepts:url=>url.startsWith('https://example.com/jobs/')};
const schema={ '@type':'JobPosting',title:'محاسب خبرة',hiringOrganization:{name:'شركة محلية'},datePosted:'2026-10-02',description:'وظيفة في سوهاج',jobLocation:{address:{addressRegion:'سوهاج',addressLocality:'العسيرات',addressCountry:'EG'}} };
const read=changes=>readStructuredJob(`<script type="application/ld+json">${JSON.stringify({...schema,...changes})}</script>`,'https://example.com/jobs/1',source,now);
test('job location requires Sohag evidence and distinguishes shared village names',()=>{
 assert.equal(placeFor('نجع موسى حمد العسيرات سوهاج'),'موسى حمد');
 assert.equal(placeFor('مطلوب موظف بشركة حمزة سوهاج'),'محافظة سوهاج');
 assert.equal(placeFor('دار السلام القاهرة'),'');
 assert.equal(placeFor('أولاد حمزة سوهاج'),'أولاد حمزة');
 assert.equal(placeFor('وظائف في أخميم وجرجا سوهاج'),'محافظة سوهاج');
});
test('structured jobs validate actual location, freshness and closed/invalid dates',()=>{
 assert.equal(read({})?.village,'مركز العسيرات');
 assert.equal(read({jobLocation:{address:{addressRegion:'القاهرة',addressCountry:'EG'}}}),null);
 assert.equal(read({datePosted:'2026-09-01'}),null);
 assert.equal(read({datePosted:'2026-09-31'}),null);
 assert.equal(read({validThrough:'2026-10-01'}),null);
 assert.equal(read({validThrough:'2026-09-31'}),null);
 assert.equal(read({jobLocation:[schema.jobLocation,{address:{addressRegion:'قنا'}}]}),null);
});
const card=(location,date='2026-10-02')=>`<div class="result-wrp"><h2 class="job-title"><a href="https://forasna.com/job/p/accountant-123">محاسب محلي</a></h2><span class="company-name"><a>شركة محلية</a></span><span class="location location-desktop"><span>${location}</span></span><time datetime="${date}"></time></div>`;
test('Forasna parses actual location and publication date',()=>{
 assert.equal(readForasna(card('العسيرات - سوهاج'),now).length,1);
 assert.equal(readForasna(card('القاهرة'),now).length,0);
 assert.equal(readForasna(card('سوهاج','2026-09-01'),now).length,0);
});
const job={title:'محاسب',organization:'شركة محلية',village:'العسيرات',published_at:'2026-10-02T00:00:00Z',source_url:'https://forasna.com/job/p/old-name-123'};
test('renamed job links cannot duplicate or revive existing moderated records',()=>{
 assert.equal(dedupeJobs([{...job,source_url:'https://forasna.com/job/p/new-name-123'}],[job]).length,0);
 assert.equal(dedupeJobs([{...job,source_url:'https://example.com/job?utm_source=fb'}],[{...job,organization:null,source_url:'https://example.com/job'}]).length,0);
 assert.equal(dedupeJobs([job,{...job,source_url:'https://another.com/job'}]).length,1);
 assert.equal(dedupeJobs([{...job,organization:'جهة غير معلنة'},{...job,organization:'جهة غير معلنة',source_url:'https://another.com/job'}]).length,2);
});
