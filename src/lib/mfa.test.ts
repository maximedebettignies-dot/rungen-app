import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prochaineEtapeMfa } from './mfa.ts';
import type { FacteurMfa } from './mfa.ts';

function facteur(p: Partial<FacteurMfa> & { id: string }): FacteurMfa {
  return {
    id: p.id,
    factor_type: p.factor_type ?? 'totp',
    status: p.status ?? 'unverified',
  };
}

test('aucun facteur : on enrôle, rien à purger', () => {
  assert.deepEqual(prochaineEtapeMfa([]), { action: 'enroler', aPurger: [] });
});

test('un facteur vérifié : on demande seulement le code', () => {
  assert.deepEqual(prochaineEtapeMfa([facteur({ id: 'a', status: 'verified' })]), {
    action: 'verifier',
    facteur: 'a',
  });
});

test("un enrôlement inachevé : on le purge avant d'en créer un nouveau", () => {
  // Le cas qui bloquait l'accès admin : Supabase refuse un second facteur
  // portant le même nom, et `listFactors().totp` ne montre pas les inachevés.
  assert.deepEqual(prochaineEtapeMfa([facteur({ id: 'a' })]), {
    action: 'enroler',
    aPurger: ['a'],
  });
});

test('plusieurs enrôlements inachevés sont tous purgés', () => {
  assert.deepEqual(prochaineEtapeMfa([facteur({ id: 'a' }), facteur({ id: 'b' })]), {
    action: 'enroler',
    aPurger: ['a', 'b'],
  });
});

test('un facteur vérifié prime sur un enrôlement inachevé, sans rien purger', () => {
  const etape = prochaineEtapeMfa([facteur({ id: 'a' }), facteur({ id: 'b', status: 'verified' })]);
  assert.deepEqual(etape, { action: 'verifier', facteur: 'b' });
});

test('les facteurs qui ne sont pas des TOTP sont ignorés', () => {
  assert.deepEqual(
    prochaineEtapeMfa([facteur({ id: 'a', factor_type: 'phone', status: 'verified' })]),
    { action: 'enroler', aPurger: [] },
  );
});
