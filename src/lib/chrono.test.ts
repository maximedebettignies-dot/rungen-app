import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECONDES_AVANT_OUBLI,
  arreter,
  demarrer,
  dureeEcouleeS,
  estOublie,
  mettreEnPause,
  reprendre,
} from './chrono.ts';

const T0 = Date.UTC(2026, 9, 7, 10, 0, 0);
const s = (n: number) => n * 1000;

// --- Marche normale ---------------------------------------------------------
test('un chronomètre qui démarre part de zéro', () => {
  assert.equal(dureeEcouleeS(demarrer(T0), T0), 0);
});

test('la durée suit le temps qui passe', () => {
  assert.equal(dureeEcouleeS(demarrer(T0), T0 + s(90)), 90);
});

test("la durée est arrondie, jamais tronquée en cours de route", () => {
  assert.equal(dureeEcouleeS(demarrer(T0), T0 + 1600), 2);
});

// --- Pauses -----------------------------------------------------------------
test('en pause, la durée ne bouge plus', () => {
  const c = mettreEnPause(demarrer(T0), T0 + s(60));
  assert.equal(dureeEcouleeS(c, T0 + s(60)), 60);
  assert.equal(dureeEcouleeS(c, T0 + s(600)), 60, 'dix minutes plus tard, toujours 60');
});

test('la reprise ne compte pas le temps de pause', () => {
  let c = demarrer(T0);
  c = mettreEnPause(c, T0 + s(60));
  c = reprendre(c, T0 + s(300)); // 4 minutes de pause
  assert.equal(dureeEcouleeS(c, T0 + s(360)), 120);
});

test('plusieurs pauses se cumulent', () => {
  let c = demarrer(T0);
  c = mettreEnPause(c, T0 + s(10));
  c = reprendre(c, T0 + s(20));
  c = mettreEnPause(c, T0 + s(30));
  c = reprendre(c, T0 + s(100));
  assert.equal(dureeEcouleeS(c, T0 + s(110)), 30);
});

test('mettre en pause deux fois de suite ne change rien', () => {
  const c = mettreEnPause(demarrer(T0), T0 + s(60));
  assert.deepEqual(mettreEnPause(c, T0 + s(90)), c);
});

test("reprendre un chronomètre qui tourne ne change rien", () => {
  const c = demarrer(T0);
  assert.deepEqual(reprendre(c, T0 + s(60)), c);
});

// --- Arrêt ------------------------------------------------------------------
test('arrêter rend la durée en secondes', () => {
  assert.equal(arreter(demarrer(T0), T0 + s(2730)), 2730);
});

test("arrêter pendant une pause rend la durée figée", () => {
  const c = mettreEnPause(demarrer(T0), T0 + s(600));
  assert.equal(arreter(c, T0 + s(9999)), 600);
});

// --- Horloge qui recule -----------------------------------------------------
test("une horloge qui recule ne produit pas une durée négative", () => {
  // Changement de fuseau, synchronisation réseau : l'heure du téléphone saute.
  assert.equal(dureeEcouleeS(demarrer(T0), T0 - s(3600)), 0);
});

// --- Oubli ------------------------------------------------------------------
test("un chronomètre lancé et oublié est signalé", () => {
  const c = demarrer(T0);
  assert.equal(estOublie(c, T0 + s(SECONDES_AVANT_OUBLI - 1)), false);
  assert.equal(estOublie(c, T0 + s(SECONDES_AVANT_OUBLI + 1)), true);
});

test("un chronomètre en pause depuis trois jours n'est pas un oubli", () => {
  // La durée ne grandit pas pendant une pause : rien à sauver.
  const c = mettreEnPause(demarrer(T0), T0 + s(60));
  assert.equal(estOublie(c, T0 + s(3 * 24 * 3600)), false);
});
