import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chercher, normaliser, suggerer, type SportCatalogue } from './sports.ts';

const CATALOGUE: SportCatalogue[] = [
  { id: 1, name: 'Course à pied', family: 'distance' },
  { id: 2, name: 'Vélo route', family: 'distance' },
  { id: 3, name: 'Natation', family: 'distance' },
  { id: 4, name: 'Musculation', family: 'duree' },
  { id: 5, name: 'Tennis', family: 'duree' },
];

test('normaliser : accents, majuscules et ponctuation', () => {
  assert.equal(normaliser('Course à pied'), 'course a pied');
  assert.equal(normaliser('  VÉLO-ROUTE  '), 'velo route');
});

test('chercher : insensible aux accents et à la casse', () => {
  assert.deepEqual(
    chercher('velo', CATALOGUE).map((s) => s.id),
    [2],
  );
  assert.deepEqual(
    chercher('NATA', CATALOGUE).map((s) => s.id),
    [3],
  );
});

test('chercher : une recherche vide rend tout le catalogue', () => {
  assert.equal(chercher('  ', CATALOGUE).length, CATALOGUE.length);
});

test('suggerer : propose le sport existant malgré une faute de frappe', () => {
  assert.equal(suggerer('natacion', CATALOGUE)?.id, 3);
  assert.equal(suggerer('muscu1ation', CATALOGUE)?.id, 4);
});

test('suggerer : propose le sport existant pour un pluriel ou une variante', () => {
  assert.equal(suggerer('course a pieds', CATALOGUE)?.id, 1);
  assert.equal(suggerer('tennis', CATALOGUE)?.id, 5);
});

test('suggerer : ne propose rien pour un vrai sport absent du catalogue', () => {
  assert.equal(suggerer('ultimate frisbee', CATALOGUE), null);
  assert.equal(suggerer('parkour', CATALOGUE), null);
});

test('suggerer : ignore une saisie trop courte', () => {
  assert.equal(suggerer('na', CATALOGUE), null);
});
