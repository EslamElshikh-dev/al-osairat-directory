import assert from 'node:assert/strict';
import test from 'node:test';
import { nuwairatFollowupScan20260916 } from '../lib/data/nuwairat-followup-scan-2026-09-16.ts';
import { awladHamzaFollowupScan20260916 } from '../lib/data/awlad-hamza-followup-scan-2026-09-16.ts';
import { gaziratAwladHamzaFollowup20260916 } from '../lib/data/gazirat-awlad-hamza-followup-2026-09-16.ts';
import { rashaidaFollowupScan20260916 } from '../lib/data/rashaida-followup-scan-2026-09-16.ts';
import { shuhadaFollowupScan20260916 } from '../lib/data/shuhada-followup-scan-2026-09-16.ts';
import { masaeedFollowupScan20260916 } from '../lib/data/masaeed-followup-scan-2026-09-16.ts';
import { awladBahigFollowupScan20260916 } from '../lib/data/awlad-bahig-followup-scan-2026-09-16.ts';

function assertUnique(scan) {
  assert.equal(new Set(scan.map((x) => x.id)).size, scan.length);
  assert.equal(new Set(scan.map((x) => x.slug)).size, scan.length);
  assert.ok(scan.every((x) => ['2026-09-16', '2026-09-17'].includes(x.lastUpdatedAt)));
}

test('Nuwairat follow-up adds five duplicate-safe current records', () => {
  assert.equal(nuwairatFollowupScan20260916.length, 5);
  assertUnique(nuwairatFollowupScan20260916);
  assert.ok(nuwairatFollowupScan20260916.every((x) => x.village === 'النويرات'));
});

test('Awlad Hamza follow-up adds eight duplicate-safe service records', () => {
  assert.equal(awladHamzaFollowupScan20260916.length, 8);
  assertUnique(awladHamzaFollowupScan20260916);
  assert.ok(awladHamzaFollowupScan20260916.every((x) => x.village === 'أولاد حمزة'));
});

test('Gazirat Awlad Hamza follow-up stays conservative and cross-checked', () => {
  assert.equal(gaziratAwladHamzaFollowup20260916.length, 1);
  assertUnique(gaziratAwladHamzaFollowup20260916);
  assert.equal(gaziratAwladHamzaFollowup20260916[0].sourceStatus, 'cross_checked');
});

test('Rashaida follow-up adds current cross-checked education gaps', () => {
  assert.equal(rashaidaFollowupScan20260916.length, 3);
  assertUnique(rashaidaFollowupScan20260916);
  assert.ok(rashaidaFollowupScan20260916.every((x) => x.village === 'الرشايدة'));
});

test('Shuhada follow-up adds five cross-checked essential village records', () => {
  assert.equal(shuhadaFollowupScan20260916.length, 5);
  assertUnique(shuhadaFollowupScan20260916);
  assert.ok(shuhadaFollowupScan20260916.every((x) => x.village === 'الشهداء'));
  assert.ok(shuhadaFollowupScan20260916.every((x) => x.sourceStatus === 'cross_checked'));
  assert.ok(shuhadaFollowupScan20260916.some((x) => x.id === 'worship-كنيسة-السيدة-العذراء-مريم-والشهيد-ابانوب-الشهداء'));
});

test('Masaeed follow-up adds five verified or cross-checked gaps', () => {
  assert.equal(masaeedFollowupScan20260916.length, 5);
  assertUnique(masaeedFollowupScan20260916);
  assert.ok(masaeedFollowupScan20260916.every((x) => x.village === 'المساعيد'));
  assert.equal(masaeedFollowupScan20260916.filter((x) => x.category === 'worship').length, 2);
});

test('Awlad Bahig follow-up adds twelve evidence-backed gaps', () => {
  assert.equal(awladBahigFollowupScan20260916.length, 12);
  assertUnique(awladBahigFollowupScan20260916);
  assert.ok(awladBahigFollowupScan20260916.every((x) => x.village === 'أولاد بهيج'));
  assert.equal(awladBahigFollowupScan20260916.filter((x) => x.category === 'worship').length, 5);
  assert.ok(awladBahigFollowupScan20260916.some((x) => x.title === 'مركز الرحمة للغسيل الكلوي بأولاد بهيج' && x.googlePlaceId));
  assert.ok(awladBahigFollowupScan20260916.some((x) => x.title === 'جمعية أولاد بهيج الخيرية' && x.phone === '0934873030'));
});

test('follow-up scans do not reuse IDs or slugs across villages', () => {
  const all = [
    ...nuwairatFollowupScan20260916,
    ...awladHamzaFollowupScan20260916,
    ...gaziratAwladHamzaFollowup20260916,
    ...rashaidaFollowupScan20260916,
    ...shuhadaFollowupScan20260916,
    ...masaeedFollowupScan20260916,
    ...awladBahigFollowupScan20260916,
  ];
  assert.equal(new Set(all.map((x) => x.id)).size, all.length);
  assert.equal(new Set(all.map((x) => x.slug)).size, all.length);
});