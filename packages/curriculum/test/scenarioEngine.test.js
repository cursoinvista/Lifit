import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScenarioEngine } from '../src/scenarioEngine.js';

test('modo avaliacao nunca revela a atividade/sequencia esperada', () => {
  const engine = new ScenarioEngine('M2', { guided: false });
  engine.start();
  assert.match(engine.hudText(), /sem pistas de sequencia/);
});

test('modo guiado mostra a atividade do bloco atual', () => {
  const engine = new ScenarioEngine('M1', { guided: true });
  engine.start();
  assert.match(engine.hudText(), /Modulo 1/);
});

test('rejeita modulo desconhecido', () => {
  assert.throws(() => new ScenarioEngine('M9'));
});
