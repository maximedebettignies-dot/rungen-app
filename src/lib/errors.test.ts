import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageErreur, messageStatutCode } from './errors.ts';

test('messageErreur : règle métier levée par un trigger', () => {
  assert.equal(
    messageErreur({ message: 'age_minimum', code: '23514' }),
    "Tu n'as pas l'âge minimum pour rejoindre cet espace.",
  );
});

test('messageErreur : nom de contrainte noyé dans le message Postgres', () => {
  const erreur = {
    message: 'duplicate key value violates unique constraint "profiles_pseudo_unique"',
    code: '23505',
  };
  assert.equal(messageErreur(erreur), 'Ce pseudo est déjà pris, essaie-en un autre.');
});

test('messageErreur : contrainte de format du pseudo', () => {
  const erreur = {
    message: 'new row for relation "profiles" violates check constraint "pseudo_format"',
    code: '23514',
  };
  assert.match(messageErreur(erreur), /3 à 20 caractères/);
});

test('messageErreur : hors ligne', () => {
  assert.equal(messageErreur({ message: 'Network request failed' }), 'Connexion internet requise.');
});

test('messageErreur : code SQL générique sans règle métier connue', () => {
  assert.equal(messageErreur({ message: 'oups', code: '42501' }), "Tu n'as pas le droit de faire ça.");
});

test('messageErreur : erreur inconnue reste lisible', () => {
  assert.equal(messageErreur({}), 'Une erreur est survenue. Réessaie dans un instant.');
  assert.equal(messageErreur(null), 'Une erreur est survenue.');
});

test('messageStatutCode : un code valide ne produit aucun message', () => {
  assert.equal(messageStatutCode('ok'), null);
});

test('messageStatutCode : un message par statut de code', () => {
  assert.match(messageStatutCode('en_attente')!, /pas encore actif/);
  assert.match(messageStatutCode('utilise')!, /déjà servi/);
  assert.match(messageStatutCode('invalide')!, /n'existe pas/);
});
