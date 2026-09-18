import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Objectives, isVerbAllowed, Domain, Level } from '../src/objectives.js';

test('todos os 14 objetivos do SLU estao presentes', () => {
  assert.equal(Object.keys(Objectives).length, 14);
});

test('verbos avancados nao sao permitidos no SLU (nivel intermediario e o teto)', () => {
  assert.equal(isVerbAllowed(Domain.KNOWLEDGE, Level.INTERMEDIARIO, 'avaliar'), false);
  assert.equal(isVerbAllowed(Domain.KNOWLEDGE, Level.INTERMEDIARIO, 'explicar'), true);
});
