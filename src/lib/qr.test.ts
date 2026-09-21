import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matriceQr, segmentsSombres } from './qr.ts';

const URI = 'otpauth://totp/RUNGEN:max?secret=OVEMJEGPWAQGDHSGYFDSCMJUB6G4ZJO6&issuer=RUNGEN';

// --- Découpage d'une ligne en segments -------------------------------------
test('segmentsSombres : une ligne vide ne donne aucun segment', () => {
  assert.deepEqual(segmentsSombres([false, false, false]), []);
});

test('segmentsSombres : des modules contigus forment un seul segment', () => {
  assert.deepEqual(segmentsSombres([true, true, true]), [{ debut: 0, longueur: 3 }]);
});

test('segmentsSombres : un trou coupe le segment en deux', () => {
  assert.deepEqual(segmentsSombres([true, false, true, true]), [
    { debut: 0, longueur: 1 },
    { debut: 2, longueur: 2 },
  ]);
});

test('segmentsSombres : un segment qui touche la fin de la ligne est bien fermé', () => {
  assert.deepEqual(segmentsSombres([false, true, true]), [{ debut: 1, longueur: 2 }]);
});

// --- Matrice ---------------------------------------------------------------
test('matriceQr : la matrice est carrée', () => {
  const m = matriceQr(URI);
  assert.ok(m.length > 20);
  for (const ligne of m) assert.equal(ligne.length, m.length);
});

test('matriceQr : les trois repères de position sont présents', () => {
  const m = matriceQr(URI);
  const n = m.length;
  // Un repère est un carré plein de 7×7 dans chaque coin sauf en bas à droite.
  for (const [dl, dc] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    assert.equal(m[dl][dc], true, `coin ${dl},${dc}`);
    assert.equal(m[dl + 6][dc + 6], true);
    assert.equal(m[dl + 1][dc + 1], false); // l'anneau blanc intérieur
  }
});

test('matriceQr : deux appels sur le même texte donnent la même matrice', () => {
  assert.deepEqual(matriceQr(URI), matriceQr(URI));
});

test('matriceQr : un texte vide est refusé', () => {
  assert.throws(() => matriceQr(''));
});
