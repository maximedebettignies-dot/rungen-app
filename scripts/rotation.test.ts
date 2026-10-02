import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horodatage, sauvegardesAPurger } from './rotation.ts';

test('horodatage : un nom de dossier triable et valide sous Windows', () => {
  const nom = horodatage(new Date(Date.UTC(2026, 9, 2, 21, 30, 5)));
  assert.equal(nom, '2026-10-02_21-30-05');
  // Les deux-points sont interdits dans un nom de fichier Windows.
  assert.ok(!nom.includes(':'));
});

test('horodatage : le tri alphabétique est un tri chronologique', () => {
  const tot = horodatage(new Date(Date.UTC(2026, 8, 30, 23, 0, 0)));
  const tard = horodatage(new Date(Date.UTC(2026, 9, 1, 1, 0, 0)));
  assert.ok(tot < tard);
});

test("rien à purger tant qu'on est sous la limite", () => {
  assert.deepEqual(sauvegardesAPurger(['2026-10-01_10-00-00', '2026-10-02_10-00-00'], 5), []);
});

test('les plus anciennes partent en premier', () => {
  const noms = [
    '2026-10-03_10-00-00',
    '2026-10-01_10-00-00',
    '2026-10-02_10-00-00',
    '2026-09-30_10-00-00',
  ];
  assert.deepEqual(sauvegardesAPurger(noms, 2), ['2026-09-30_10-00-00', '2026-10-01_10-00-00']);
});

test('ce qui ne ressemble pas à une sauvegarde est ignoré, jamais supprimé', () => {
  // Le dossier de sauvegarde peut contenir autre chose ; on n'y touche pas.
  const noms = ['notes.txt', '2026-10-01_10-00-00', '2026-10-02_10-00-00', 'vieux-truc'];
  assert.deepEqual(sauvegardesAPurger(noms, 1), ['2026-10-01_10-00-00']);
});

test('une limite de zéro purgerait tout : refusée', () => {
  assert.throws(() => sauvegardesAPurger(['2026-10-01_10-00-00'], 0));
});
