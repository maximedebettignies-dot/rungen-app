import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURS_SAISIE_RETROACTIVE,
  allure,
  dansFenetreDeSaisie,
  formaterDistance,
  formaterDuree,
  lireDistanceKm,
  lireDureeMinutes,
} from './activite.ts';

test('formaterDuree : minutes puis heures', () => {
  assert.equal(formaterDuree(2530), '42 min');
  assert.equal(formaterDuree(3600), '1 h');
  assert.equal(formaterDuree(5400), '1 h 30');
  assert.equal(formaterDuree(60), '1 min');
});

test('formaterDistance : virgule française, pas de décimale inutile', () => {
  assert.equal(formaterDistance(8200), '8,2 km');
  assert.equal(formaterDistance(12000), '12 km');
  assert.equal(formaterDistance(800), '0,8 km');
});

test('allure : min/km pour la course', () => {
  // 8,2 km en 42:10 → 308,5 s/km, arrondi à 5:09
  assert.equal(allure(8200, 2530, 'min_per_km'), '5:09 /km');
});

test('allure : l’arrondi ne produit jamais 60 secondes', () => {
  // 1 km en 5 min 59,6 s : le total est arrondi avant d’être découpé.
  assert.equal(allure(1000, 359.6, 'min_per_km'), '6:00 /km');
});

test('allure : km/h pour le vélo', () => {
  // 30 km en 1 h → 30,0 km/h
  assert.equal(allure(30000, 3600, 'km_per_h'), '30,0 km/h');
});

test('allure : min/100 m pour la natation', () => {
  // 1200 m en 38 min → 3:10 /100 m
  assert.equal(allure(1200, 2280, 'min_per_100m'), '3:10 /100 m');
});

test('allure : rien pour un sport de durée, ou sans distance', () => {
  assert.equal(allure(null, 3600, 'none'), null);
  assert.equal(allure(null, 3600, 'min_per_km'), null);
  assert.equal(allure(0, 3600, 'min_per_km'), null);
  assert.equal(allure(5000, 0, 'min_per_km'), null);
});

test('lireDistanceKm : accepte la virgule et le point', () => {
  assert.equal(lireDistanceKm('8,2'), 8200);
  assert.equal(lireDistanceKm('8.2'), 8200);
  assert.equal(lireDistanceKm(' 12 '), 12000);
  assert.equal(lireDistanceKm('0,75'), 750);
});

test('lireDistanceKm : refuse ce qui n’est pas une distance utilisable', () => {
  assert.equal(lireDistanceKm(''), null);
  assert.equal(lireDistanceKm('abc'), null);
  assert.equal(lireDistanceKm('-3'), null);
  assert.equal(lireDistanceKm('0'), null);
  assert.equal(lireDistanceKm('1001'), null); // au-delà de 1000 km
});

test('lireDureeMinutes : minutes entières vers secondes', () => {
  assert.equal(lireDureeMinutes('42'), 2520);
  assert.equal(lireDureeMinutes(' 90 '), 5400);
});

test('lireDureeMinutes : refuse hors bornes de la base', () => {
  assert.equal(lireDureeMinutes('0'), null);
  assert.equal(lireDureeMinutes('1441'), null); // plus de 24 h
  assert.equal(lireDureeMinutes('abc'), null);
  assert.equal(lireDureeMinutes(''), null);
});

test('dansFenetreDeSaisie : aujourd’hui et les 30 jours précédents', () => {
  const aujourdhui = new Date(2026, 8, 21);
  assert.equal(dansFenetreDeSaisie(new Date(2026, 8, 21), aujourdhui), true);
  assert.equal(dansFenetreDeSaisie(new Date(2026, 7, 22), aujourdhui), true); // 30 jours avant
});

test('dansFenetreDeSaisie : refuse le futur et au-delà de 30 jours', () => {
  const aujourdhui = new Date(2026, 8, 21);
  assert.equal(dansFenetreDeSaisie(new Date(2026, 8, 22), aujourdhui), false);
  assert.equal(dansFenetreDeSaisie(new Date(2026, 7, 21), aujourdhui), false); // 31 jours avant
});

test('dansFenetreDeSaisie : traverse un changement de mois et une année bissextile', () => {
  const premierMars = new Date(2028, 2, 1); // 2028 est bissextile
  assert.equal(dansFenetreDeSaisie(new Date(2028, 1, 29), premierMars), true);
  // Février comptant 29 jours, la borne des 30 jours tombe au 31 janvier.
  assert.equal(dansFenetreDeSaisie(new Date(2028, 0, 31), premierMars), true);
  assert.equal(dansFenetreDeSaisie(new Date(2028, 0, 30), premierMars), false);
});

test('la fenêtre de saisie est celle de la base', () => {
  assert.equal(JOURS_SAISIE_RETROACTIVE, 30);
});
