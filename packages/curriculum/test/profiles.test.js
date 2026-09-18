import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertProfileMatches, getProfile } from '../src/profiles.js';

test('perfil legado 240 min e marcado explicitamente como legado', () => {
  const profile = getProfile('rt14-slu-240');
  assert.equal(profile.status, 'legado');
  assert.equal(profile.totalContactMinutes, 240);
});

test('sessao e bloqueada quando manifesto nao corresponde ao perfil aprovado', () => {
  const result = assertProfileMatches('rt14-slu-240', {
    contentVersion: 'rt14-slu-240',
    checklistApproved: true,
    liftModelApproved: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.mismatches[0], /modelo 3D/);
});

test('sessao passa quando manifesto corresponde integralmente', () => {
  const result = assertProfileMatches('rt14-slu-240', {
    contentVersion: 'rt14-slu-240',
    checklistApproved: true,
    liftModelApproved: true,
  });
  assert.equal(result.ok, true);
});
