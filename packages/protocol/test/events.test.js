import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEvent, EventType } from '../src/events.js';

test('makeEvent creates a frozen, uniquely-identified event', () => {
  const evt = makeEvent({ type: EventType.STATE_TRANSITION, sessionId: 'SLU-1', actorId: 'server', objectiveIds: ['M2-S1'] });
  assert.equal(evt.type, EventType.STATE_TRANSITION);
  assert.ok(evt.id.startsWith('evt-'));
  assert.throws(() => { evt.data = {}; });
});

test('makeEvent rejects unknown event type', () => {
  assert.throws(() => makeEvent({ type: 'NOPE', sessionId: 'SLU-1' }));
});
