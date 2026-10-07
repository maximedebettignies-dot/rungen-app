import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouter,
  deserialiser,
  identifiantSeance,
  retirer,
  serialiser,
  suiteDeSynchro,
  type SeanceEnAttente,
} from './file-attente.ts';

function att(id: string, creeA = 0): SeanceEnAttente {
  return {
    id,
    creeA,
    charge: { user_id: 'u', sport_id: 1, performed_on: '2026-10-07', duration_s: 1800, source: 'chrono' },
  };
}

// --- File -------------------------------------------------------------------
test('une séance ajoutée se retrouve dans la file', () => {
  assert.deepEqual(ajouter([], att('a')).map((s) => s.id), ['a']);
});

test("l'ordre d'ajout est préservé : on synchronise dans l'ordre vécu", () => {
  const f = ajouter(ajouter([], att('a')), att('b'));
  assert.deepEqual(f.map((s) => s.id), ['a', 'b']);
});

test('réenregistrer une séance la remplace au lieu de la dupliquer', () => {
  // L'élève corrige sa séance avant que le réseau revienne.
  const modifiee = { ...att('a'), charge: { ...att('a').charge, duration_s: 3600 } };
  const f = ajouter(ajouter([], att('a')), modifiee);
  assert.equal(f.length, 1);
  assert.equal(f[0].charge.duration_s, 3600);
});

test('retirer ne touche que la séance visée', () => {
  const f = ajouter(ajouter([], att('a')), att('b'));
  assert.deepEqual(retirer(f, 'a').map((s) => s.id), ['b']);
});

// --- Lecture du fichier -----------------------------------------------------
test('un fichier absent donne une file vide', () => {
  assert.deepEqual(deserialiser(null), []);
});

test('un fichier illisible donne une file vide plutôt qu’un plantage', () => {
  // Une file corrompue ne doit jamais empêcher l'app de démarrer.
  assert.deepEqual(deserialiser('{ ceci n est pas du json'), []);
  assert.deepEqual(deserialiser('{"pas":"un tableau"}'), []);
});

test('les entrées abîmées sont écartées, les bonnes conservées', () => {
  const texte = JSON.stringify([att('a'), { id: 'sans charge' }, null, att('b')]);
  assert.deepEqual(deserialiser(texte).map((s) => s.id), ['a', 'b']);
});

test('ce qui est écrit se relit à l’identique', () => {
  const f = ajouter(ajouter([], att('a', 10)), att('b', 20));
  assert.deepEqual(deserialiser(serialiser(f)), f);
});

// --- Que faire d'un échec de synchronisation --------------------------------
test('une panne de réseau : on réessaiera', () => {
  assert.equal(suiteDeSynchro({ message: 'Network request failed' }), 'reessayer');
  assert.equal(suiteDeSynchro({ message: 'fetch failed' }), 'reessayer');
});

test('une séance déjà envoyée est considérée comme passée', () => {
  // L'envoi précédent avait abouti, mais la réponse s'est perdue. C'est
  // exactement ce que l'identifiant produit par l'app permet de rattraper.
  assert.equal(suiteDeSynchro({ code: '23505', message: 'duplicate key value' }), 'reussi');
});

test('un refus de la base fait sortir la séance de la file', () => {
  // Sinon elle y resterait pour toujours : la base la refusera à chaque essai.
  assert.equal(suiteDeSynchro({ code: '23514', message: 'date_trop_ancienne' }), 'abandonner');
  assert.equal(suiteDeSynchro({ code: '42501', message: 'permission denied' }), 'abandonner');
});

// --- Identifiant ------------------------------------------------------------
test("l'identifiant a la forme d'un UUID v4", () => {
  assert.match(identifiantSeance(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('deux identifiants ne se ressemblent pas', () => {
  const tirages = new Set(Array.from({ length: 2000 }, identifiantSeance));
  assert.equal(tirages.size, 2000);
});

test("l'identifiant reste valide quand le runtime n'offre pas crypto.randomUUID", () => {
  // React Native ne garantit pas cette API : la solution de repli doit tenir.
  const vrai = globalThis.crypto?.randomUUID;
  try {
    if (globalThis.crypto) (globalThis.crypto as { randomUUID?: unknown }).randomUUID = undefined;
    assert.match(identifiantSeance(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    if (globalThis.crypto && vrai) (globalThis.crypto as { randomUUID?: unknown }).randomUUID = vrai;
  }
});
