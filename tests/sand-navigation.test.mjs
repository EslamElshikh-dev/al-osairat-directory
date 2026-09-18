import test from 'node:test';
import assert from 'node:assert/strict';
import { isSandContextResetCommand, sandNavigationHref } from '../lib/sand/navigation.ts';

test('Sand navigation understands normalized site destinations', () => {
  assert.equal(sandNavigationHref('أخبار العسيرات'), '/news');
  assert.equal(sandNavigationHref('الاخبار'), '/news');
  assert.equal(sandNavigationHref('افتح القرى'), '/villages');
  assert.equal(sandNavigationHref('النجوع'), '/localities');
  assert.equal(sandNavigationHref('افتح الدليل'), '/directory');
  assert.equal(sandNavigationHref('المدونة'), '/blog');
});

test('Sand navigation only matches whole navigation commands', () => {
  assert.equal(sandNavigationHref('اخبار في النويرات'), '');
  assert.equal(sandNavigationHref('دكتور قريب من القرى'), '');
});

test('Sand recognizes explicit context reset commands', () => {
  assert.equal(isSandContextResetCommand('محادثة جديدة'), true);
  assert.equal(isSandContextResetCommand('ابدأ من جديد'), true);
  assert.equal(isSandContextResetCommand('بحث جديد'), true);
  assert.equal(isSandContextResetCommand('عايز بحث جديد عن صيدلية'), false);
});
