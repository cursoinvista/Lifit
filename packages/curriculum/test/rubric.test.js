import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnnexOneRubric, AnnexOneCriteria } from '../src/rubric.js';

function scoreAll(rubric, score, comment = 'ok') {
  for (const c of AnnexOneCriteria) rubric.score(c.id, { score, comment });
}

test('nota alta (0-9) sugere pass, nota baixa (10-27) sugere fail', () => {
  const passRubric = new AnnexOneRubric({ assessmentId: 'A-1', participantId: 'P-1', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  scoreAll(passRubric, 1);
  assert.equal(passRubric.total(), 9);
  assert.equal(passRubric.suggestedResult().suggestion, 'pass');

  const failRubric = new AnnexOneRubric({ assessmentId: 'A-2', participantId: 'P-2', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  scoreAll(failRubric, 2);
  assert.equal(failRubric.total(), 18);
  assert.equal(failRubric.suggestedResult().suggestion, 'fail');
});

test('regra anyScoreOfThreeFailsImmediately e opt-in, nao implicita', () => {
  const lenient = new AnnexOneRubric({ assessmentId: 'A-3', participantId: 'P-3', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  scoreAll(lenient, 0);
  lenient.score(AnnexOneCriteria[0].id, { score: 3, comment: 'critico' });
  assert.equal(lenient.suggestedResult().suggestion, 'pass'); // total baixo, sem a regra estrita

  const strict = new AnnexOneRubric({ assessmentId: 'A-4', participantId: 'P-4', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1', anyScoreOfThreeFailsImmediately: true });
  scoreAll(strict, 0);
  strict.score(AnnexOneCriteria[0].id, { score: 3, comment: 'critico' });
  assert.equal(strict.suggestedResult().suggestion, 'fail');
});

test('notas 2 e 3 exigem comentario; nota 0 nao exige', () => {
  const r = new AnnexOneRubric({ assessmentId: 'A-5', participantId: 'P-5', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  assert.throws(() => r.score(AnnexOneCriteria[0].id, { score: 3, comment: '' }));
  assert.throws(() => r.score(AnnexOneCriteria[0].id, { score: 2, comment: '' }));
  assert.doesNotThrow(() => r.score(AnnexOneCriteria[0].id, { score: 0, comment: '' }));
});

test('finalize exige todas as nove medidas e confirmacao humana', () => {
  const r = new AnnexOneRubric({ assessmentId: 'A-6', participantId: 'P-6', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  assert.throws(() => r.finalize({ confirmedBy: 'I-1', confirmedResult: 'pass' }));
  scoreAll(r, 1);
  assert.throws(() => r.finalize({ confirmedBy: null, confirmedResult: 'pass' }));
  const record = r.finalize({ confirmedBy: 'I-1', confirmedResult: 'pass' });
  assert.equal(record.finalized, true);
  assert.equal(record.result, 'pass');
});

test('avaliacao finalizada nao aceita nova pontuacao direta', () => {
  const r = new AnnexOneRubric({ assessmentId: 'A-7', participantId: 'P-7', curriculumProfile: 'rt14-slu-240', assessorId: 'I-1' });
  scoreAll(r, 0);
  r.finalize({ confirmedBy: 'I-1', confirmedResult: 'pass' });
  assert.throws(() => r.score(AnnexOneCriteria[0].id, { score: 1, comment: 'tarde' }));
});
