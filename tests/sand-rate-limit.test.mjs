import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAND_DAILY_AI_LIMIT,
  consumeSandAiTurn,
  consumeSandBurst,
  readSandUsage,
  remainingSandAiTurns,
  serializeSandUsage,
} from '../lib/sand/rate-limit.ts';

const secret = 'sand-test-secret-with-at-least-32-characters';
const dayOne = new Date('2026-08-30T12:00:00.000Z');

test('missing signing secret disables AI usage state', () => {
  assert.equal(readSandUsage(undefined, undefined, dayOne).configured, false);
});

test('short signing secret disables AI usage state', () => {
  assert.equal(readSandUsage(undefined, 'too-short', dayOne).configured, false);
});

test('valid signing secret creates anonymous signed state', () => {
  const state = readSandUsage(undefined, secret, dayOne);
  assert.equal(state.configured, true);
  assert.equal(state.count, 0);
  assert.match(state.visitorId, /^[a-f0-9-]{36}$/i);
});

test('signed usage cookie round-trips', () => {
  const state = consumeSandAiTurn(readSandUsage(undefined, secret, dayOne));
  const restored = readSandUsage(serializeSandUsage(state, secret), secret, dayOne);
  assert.equal(restored.count, 1);
  assert.equal(restored.visitorId, state.visitorId);
});

test('tampered usage cookie is rejected', () => {
  const state = consumeSandAiTurn(readSandUsage(undefined, secret, dayOne));
  const cookie = serializeSandUsage(state, secret);
  const restored = readSandUsage(`${cookie}tampered`, secret, dayOne);
  assert.equal(restored.count, 0);
  assert.notEqual(restored.visitorId, state.visitorId);
});

test('daily usage never exceeds configured limit', () => {
  let state = readSandUsage(undefined, secret, dayOne);
  for (let index = 0; index < SAND_DAILY_AI_LIMIT + 5; index += 1) state = consumeSandAiTurn(state);
  assert.equal(state.count, SAND_DAILY_AI_LIMIT);
  assert.equal(remainingSandAiTurns(state), 0);
});

test('remaining turns reflect successful AI calls', () => {
  let state = readSandUsage(undefined, secret, dayOne);
  state = consumeSandAiTurn(consumeSandAiTurn(state));
  assert.equal(remainingSandAiTurns(state), SAND_DAILY_AI_LIMIT - 2);
});

test('usage resets on a new UTC day', () => {
  let state = readSandUsage(undefined, secret, dayOne);
  state = consumeSandAiTurn(state);
  const cookie = serializeSandUsage(state, secret);
  const nextDay = readSandUsage(cookie, secret, new Date('2026-08-31T00:01:00.000Z'));
  assert.equal(nextDay.count, 0);
  assert.notEqual(nextDay.visitorId, state.visitorId);
});

test('burst guard allows four AI attempts per minute', () => {
  const state = readSandUsage(undefined, secret, dayOne);
  for (let index = 0; index < 4; index += 1) {
    assert.equal(consumeSandBurst(state, secret, '192.0.2.25', 'test-browser', 1_000), true);
  }
  assert.equal(consumeSandBurst(state, secret, '192.0.2.25', 'test-browser', 1_000), false);
});

test('different anonymous visitors do not share a burst bucket', () => {
  const first = readSandUsage(undefined, secret, dayOne);
  const second = readSandUsage(undefined, secret, dayOne);
  for (let index = 0; index < 4; index += 1) {
    consumeSandBurst(first, secret, '198.51.100.41', 'shared-browser', 2_000);
  }
  assert.equal(consumeSandBurst(second, secret, '198.51.100.41', 'shared-browser', 2_000), true);
});
