import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chargeEntrainement,
  chargeSeance,
  comparerPeriodes,
  debutDeSemaine,
  estimationRiegel,
  records,
  seancesParJour,
  totalPeriode,
} from './stats.ts';
import type { SeanceStat } from './stats.ts';

function seance(p: Partial<SeanceStat> & { performed_on: string }): SeanceStat {
  return {
    id: p.performed_on + (p.sportNom ?? ''),
    performed_on: p.performed_on,
    duration_s: p.duration_s ?? 1800,
    distance_m: p.distance_m ?? null,
    effort: p.effort ?? null,
    sportNom: p.sportNom ?? 'Course à pied',
    sportUnite: p.sportUnite ?? 'min_per_km',
  };
}

// --- Semaines --------------------------------------------------------------
test('debutDeSemaine : le lundi de la semaine en cours', () => {
  // 21 septembre 2026 est un lundi
  assert.equal(debutDeSemaine(new Date(2026, 8, 21)).getDate(), 21);
  // le mercredi suivant renvoie le même lundi
  assert.equal(debutDeSemaine(new Date(2026, 8, 23)).getDate(), 21);
  // le dimanche appartient encore à cette semaine
  assert.equal(debutDeSemaine(new Date(2026, 8, 27)).getDate(), 21);
});

test('debutDeSemaine : traverse un changement d’année', () => {
  // 1er janvier 2027 est un vendredi : la semaine commence le 28 décembre 2026
  const lundi = debutDeSemaine(new Date(2027, 0, 1));
  assert.equal(lundi.getFullYear(), 2026);
  assert.equal(lundi.getMonth(), 11);
  assert.equal(lundi.getDate(), 28);
});

// --- Cumuls ----------------------------------------------------------------
test('totalPeriode : additionne distance, durée et nombre', () => {
  const t = totalPeriode([
    seance({ performed_on: '2026-09-21', distance_m: 8200, duration_s: 2530 }),
    seance({ performed_on: '2026-09-22', distance_m: 5000, duration_s: 1500 }),
    seance({ performed_on: '2026-09-23', duration_s: 3600, sportNom: 'Musculation' }),
  ]);
  assert.equal(t.distanceM, 13200);
  assert.equal(t.dureeS, 7630);
  assert.equal(t.nombre, 3);
});

test('totalPeriode : une liste vide donne des zéros, pas NaN', () => {
  const t = totalPeriode([]);
  assert.deepEqual(t, { distanceM: 0, dureeS: 0, nombre: 0 });
});

test('comparerPeriodes : variation en pourcentage', () => {
  assert.equal(comparerPeriodes(120, 100), 20);
  assert.equal(comparerPeriodes(80, 100), -20);
  assert.equal(comparerPeriodes(100, 100), 0);
});

test('comparerPeriodes : pas de comparaison sans période précédente', () => {
  assert.equal(comparerPeriodes(50, 0), null);
  assert.equal(comparerPeriodes(0, 0), null);
});

// --- Charge d'entraînement -------------------------------------------------
test('chargeSeance : durée en minutes × coefficient de ressenti', () => {
  assert.equal(chargeSeance(seance({ performed_on: '2026-09-21', duration_s: 3600, effort: 'facile' })), 60);
  assert.equal(chargeSeance(seance({ performed_on: '2026-09-21', duration_s: 3600, effort: 'correct' })), 120);
  assert.equal(chargeSeance(seance({ performed_on: '2026-09-21', duration_s: 3600, effort: 'dur' })), 180);
});

test('chargeSeance : un ressenti non renseigné compte comme « correct »', () => {
  assert.equal(chargeSeance(seance({ performed_on: '2026-09-21', duration_s: 3600, effort: null })), 120);
});

test('chargeEntrainement : moyennes quotidiennes sur 7 et 28 jours', () => {
  const aujourdhui = new Date(2026, 8, 21);
  // 7 séances d'une heure « correct » dans les 7 derniers jours : 120 par séance
  const seances = Array.from({ length: 7 }, (_, i) =>
    seance({ performed_on: `2026-09-${String(15 + i).padStart(2, '0')}`, duration_s: 3600, effort: 'correct' }),
  );
  const c = chargeEntrainement(seances, aujourdhui);
  assert.equal(c.recente, 120); // 840 / 7
  assert.equal(c.fond, 30); // 840 / 28
});

test('chargeEntrainement : ignore ce qui déborde des fenêtres', () => {
  const aujourdhui = new Date(2026, 8, 21);
  const c = chargeEntrainement(
    [seance({ performed_on: '2026-01-01', duration_s: 3600, effort: 'dur' })],
    aujourdhui,
  );
  assert.equal(c.recente, 0);
  assert.equal(c.fond, 0);
});

test('seancesParJour : une entrée par jour, y compris les jours vides', () => {
  const jours = seancesParJour(
    [seance({ performed_on: '2026-09-21', distance_m: 8200, duration_s: 2530 })],
    new Date(2026, 8, 21),
    7,
  );
  assert.equal(jours.length, 7);
  assert.equal(jours[6].distanceM, 8200); // le dernier est aujourd'hui
  assert.equal(jours[0].distanceM, 0);
});

// --- Records ---------------------------------------------------------------
test('records : plus longue distance, plus longue durée, meilleure allure par sport', () => {
  const r = records([
    seance({ performed_on: '2026-09-01', distance_m: 5000, duration_s: 1800 }),
    seance({ performed_on: '2026-09-10', distance_m: 12000, duration_s: 4200 }),
    seance({ performed_on: '2026-09-15', distance_m: 3000, duration_s: 900 }), // 5:00 /km
  ]);
  const course = r.find((x) => x.sportNom === 'Course à pied')!;
  assert.equal(course.distanceMaxM, 12000);
  assert.equal(course.dureeMaxS, 4200);
  assert.equal(course.meilleureAllureSParKm, 300);
});

test('records : une allure sur moins d’un kilomètre n’est pas un record', () => {
  const r = records([
    seance({ performed_on: '2026-09-01', distance_m: 5000, duration_s: 1800 }), // 6:00 /km
    seance({ performed_on: '2026-09-02', distance_m: 200, duration_s: 30 }), // 2:30 /km, trop court
  ]);
  assert.equal(r[0].meilleureAllureSParKm, 360);
});

test('records : un sport de durée n’a pas d’allure ni de distance', () => {
  const r = records([
    seance({ performed_on: '2026-09-01', duration_s: 3600, sportNom: 'Musculation', sportUnite: 'none' }),
  ]);
  assert.equal(r[0].dureeMaxS, 3600);
  assert.equal(r[0].distanceMaxM, null);
  assert.equal(r[0].meilleureAllureSParKm, null);
});

test('records : chaque sport a sa propre ligne', () => {
  const r = records([
    seance({ performed_on: '2026-09-01', distance_m: 5000, duration_s: 1800 }),
    seance({ performed_on: '2026-09-02', duration_s: 3600, sportNom: 'Natation', sportUnite: 'min_per_100m', distance_m: 1500 }),
  ]);
  assert.equal(r.length, 2);
});

// --- Estimation ------------------------------------------------------------
test('estimationRiegel : un 5 km en 25 min donne un 10 km plausible', () => {
  const t = estimationRiegel(5000, 1500, 10000)!;
  // 1500 × 2^1,06 ≈ 3132 s, soit 52:12
  assert.ok(t > 3100 && t < 3170, `attendu ~3132, obtenu ${t}`);
});

test('estimationRiegel : la même distance rend le même temps', () => {
  assert.equal(Math.round(estimationRiegel(10000, 3000, 10000)!), 3000);
});

test('estimationRiegel : refuse d’extrapoler au-delà de trois fois la référence', () => {
  assert.equal(estimationRiegel(5000, 1500, 21100), null);
});

test('estimationRiegel : refuse une référence trop courte ou absurde', () => {
  assert.equal(estimationRiegel(500, 120, 5000), null);
  assert.equal(estimationRiegel(5000, 0, 10000), null);
});
