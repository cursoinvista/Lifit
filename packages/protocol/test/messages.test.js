import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMessage, makeActionRequest, MessageType, PROTOCOL_VERSION } from '../src/messages.js';

test('makeActionRequest produces a valid envelope', () => {
  const msg = makeActionRequest({ sessionId: 'SLU-1', seq: 1, payload: { entityId: 'panel.up', action: 'PRESS' } });
  assert.equal(msg.v, PROTOCOL_VERSION);
  const result = validateMessage(msg);
  assert.equal(result.ok, true);
});

test('validateMessage rejects unknown type', () => {
  const result = validateMessage({ type: 'NOT_A_TYPE' });
  assert.equal(result.ok, false);
});

test('validateMessage rejects missing required field', () => {
  const result = validateMessage({ type: MessageType.ACTION_REQUEST, sessionId: 'SLU-1' });
  assert.equal(result.ok, false);
  assert.match(result.error, /campo obrigatorio ausente/);
});

test('validateMessage rejects incompatible protocol version', () => {
  const result = validateMessage({ v: 99, type: MessageType.ACTION_REQUEST });
  assert.equal(result.ok, false);
});
