import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, canRegister, isMinor, effectiveVisibility } from './age.ts';

const d = (s: string) => new Date(`${s}T12:00:00`);

test("ageOn : l'âge augmente le jour de l'anniversaire, pas la veille", () => {
  assert.equal(ageOn(d('2011-09-10'), d('2026-09-09')), 14);
  assert.equal(ageOn(d('2011-09-10'), d('2026-09-10')), 15);
});

test('ageOn : né un 29 février, on prend un an le 1er mars les années non bissextiles', () => {
  assert.equal(ageOn(d('2008-02-29'), d('2026-02-28')), 17);
  assert.equal(ageOn(d('2008-02-29'), d('2026-03-01')), 18);
});

test("canRegister : espace public, refuse moins de 15 ans, accepte à 15 ans pile", () => {
  assert.equal(canRegister(d('2011-09-11'), 'public', d('2026-09-10')), false);
  assert.equal(canRegister(d('2011-09-10'), 'public', d('2026-09-10')), true);
});

test("canRegister : espace RUNGEN, refuse moins de 11 ans, accepte à 11 ans pile", () => {
  assert.equal(canRegister(d('2015-09-11'), 'rungen', d('2026-09-10')), false);
  assert.equal(canRegister(d('2015-09-10'), 'rungen', d('2026-09-10')), true);
});

test('canRegister : refuse une date de naissance dans le futur', () => {
  assert.equal(canRegister(d('2030-01-01'), 'rungen', d('2026-09-10')), false);
});

test('isMinor : mineur la veille des 18 ans, majeur le jour J', () => {
  assert.equal(isMinor(d('2008-09-10'), d('2026-09-09')), true);
  assert.equal(isMinor(d('2008-09-10'), d('2026-09-10')), false);
});

test('effectiveVisibility : un mineur est toujours privé', () => {
  assert.equal(effectiveVisibility('public', d('2010-01-01'), d('2026-09-10')), 'prive');
});

test('effectiveVisibility : un majeur garde son choix', () => {
  assert.equal(effectiveVisibility('amis', d('1990-01-01'), d('2026-09-10')), 'amis');
});
