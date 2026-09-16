import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depuis } from './support.ts';

const MAINTENANT = new Date('2026-09-16T12:00:00Z');

function ilYA(millisecondes: number) {
  return new Date(MAINTENANT.getTime() - millisecondes).toISOString();
}

test('depuis : moins d’une minute', () => {
  assert.equal(depuis(ilYA(30_000), MAINTENANT), "à l'instant");
});

test('depuis : minutes puis heures', () => {
  assert.equal(depuis(ilYA(5 * 60_000), MAINTENANT), 'il y a 5 min');
  assert.equal(depuis(ilYA(3 * 3_600_000), MAINTENANT), 'il y a 3 h');
});

test('depuis : hier et jours', () => {
  assert.equal(depuis(ilYA(25 * 3_600_000), MAINTENANT), 'hier');
  assert.equal(depuis(ilYA(5 * 24 * 3_600_000), MAINTENANT), 'il y a 5 jours');
});

test('depuis : mois et années', () => {
  assert.equal(depuis(ilYA(60 * 24 * 3_600_000), MAINTENANT), 'il y a 2 mois');
  assert.equal(depuis(ilYA(400 * 24 * 3_600_000), MAINTENANT), 'il y a 1 an(s)');
});
