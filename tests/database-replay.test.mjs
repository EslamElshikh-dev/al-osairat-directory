import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh,replayMigrations,asRole,denied,assertRls } from './helpers/supabase-postgres.mjs';

test('complete migration replay starts from no application tables and preserves public/private boundaries', {timeout:60000}, async()=>{
 const db=await fresh();
 try {
  const files=await replayMigrations(db);assert.ok(files.length>=79);
  // This repo owns the 34 directory tables; other apps sharing production are
  // recovered and tested in their own repositories.
  await assertRls(db,34);
  assert.equal((await db.query('select count(*)::int n from directory_internal.settings')).rows[0].n,0,'A fresh install must not invent an owner');
  const owner='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',admin='20000000-0000-4000-8000-000000000003';
  for(const [id,email,name] of [[owner,'owner@example.invalid','Synthetic owner'],[other,'other@example.invalid','Synthetic other'],[admin,'admin@example.invalid','Synthetic admin']]){
   await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,email,JSON.stringify({full_name:name})]);
  }
  await db.query('insert into public.admin_members(user_id) values($1)',[admin]);
  await db.query('insert into directory_internal.settings(owner_id) values($1)',[admin]);
  await denied(db,'authenticated',owner,'insert into directory_internal.settings(owner_id) values($1)',[owner]);
  assert.equal((await asRole(db,'authenticated',owner,'select public.is_directory_owner() allowed')).rows[0].allowed,false);
  assert.equal((await asRole(db,'authenticated',admin,'select public.is_directory_owner() allowed')).rows[0].allowed,true);
  await asRole(db,'authenticated',owner,'insert into public.community_feed_state(user_id,last_seen_at) values($1,now())',[owner]);
  await asRole(db,'authenticated',owner,'update public.community_feed_state set last_seen_at=now() where user_id=$1',[owner]);
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.community_feed_state')).rows[0].n,0);
  await denied(db,'anon',null,'select * from public.community_feed_state');
  await denied(db,'authenticated',owner,'update public.community_feed_state set user_id=$1 where user_id=$2',[other,owner]);
  await asRole(db,'authenticated',owner,"update public.member_public_profiles set bio='Synthetic biography',is_public=true where user_id=auth.uid()");
  assert.equal((await asRole(db,'anon',null,'select count(*)::int n from public.member_public_profiles')).rows[0].n,1);
  await denied(db,'authenticated',owner,"update public.member_public_profiles set display_name='Forged identity' where user_id=auth.uid()");
  await denied(db,'anon',null,'select * from public.profiles');
  const job='20000000-0000-4000-8000-000000000004';
  await asRole(db,'authenticated',owner,"insert into public.osairat_jobs(id,user_id,kind,title,village,field,description,contact_kind,contact_value) values($1,$2,'offer','Synthetic vacancy','Test village','Test field','Synthetic description for an isolated test','email','test@example.invalid')",[job,owner]);
  assert.equal((await asRole(db,'anon',null,'select count(*)::int n from public.osairat_jobs')).rows[0].n,0);
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.osairat_jobs')).rows[0].n,0);
  await asRole(db,'service_role',null,"update public.osairat_jobs set status='approved',published_at=now() where id=$1",[job]);
  assert.equal((await asRole(db,'anon',null,'select count(*)::int n from public.osairat_jobs')).rows[0].n,1);
  await denied(db,'anon',null,'select * from public.osairat_job_feed_state');
  await asRole(db,'service_role',null,"insert into public.news_items(id,title,url,source,source_url,published_at,village,topic,source_text) values('synthetic','Synthetic news','https://example.invalid/news','Synthetic','https://example.invalid',now(),'Test village','test','PRIVATE RAW SOURCE')");
  assert.equal((await asRole(db,'anon',null,'select id,title from public.news_items')).rows.length,1);
  await denied(db,'anon',null,'select source_text from public.news_items');
  await denied(db,'authenticated',owner,'select * from public.news_ingestion_runs');
  await denied(db,'anon',null,'select * from public.news_sources');
  assert.ok((await asRole(db,'service_role',null,"select public.claim_news_ingestion('manual',25) id")).rows[0].id);
  await asRole(db,'anon',null,"insert into public.sand_requests(mode,intent,data_source,result_count,duration_ms) values('direct','directory','none',0,10)");
  await denied(db,'anon',null,'select * from public.sand_requests');
  assert.equal((await asRole(db,'authenticated',owner,'select count(*)::int n from public.sand_requests')).rows[0].n,0);
  assert.equal((await asRole(db,'authenticated',admin,'select count(*)::int n from public.sand_requests')).rows[0].n,1);
  // Restored legacy paths also need explicit grants with default exposure off.
  await asRole(db,'authenticated',owner,"insert into public.favorites(user_id,listing_id) values($1,'synthetic-listing')",[owner]);
  assert.equal((await asRole(db,'authenticated',owner,'select count(*)::int n from public.favorites')).rows[0].n,1);
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.favorites')).rows[0].n,0);
  await asRole(db,'authenticated',owner,"delete from public.favorites where listing_id='synthetic-listing'");
  await denied(db,'anon',null,'select * from public.admin_members');
 } finally { await db.close(); }
});
