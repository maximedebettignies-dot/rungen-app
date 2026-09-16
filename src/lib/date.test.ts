import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateDepuisSaisie, versISO } from './date.ts';

test('dateDepuisSaisie : saisie normale', () => {
  const date = dateDepuisSaisie('3', '3', '2011');
  assert.equal(versISO(date!), '2011-03-03');
});

test('dateDepuisSaisie : accepte les zéros devant', () => {
  assert.equal(versISO(dateDepuisSaisie('03', '09', '2010')!), '2010-09-03');
});

test('dateDepuisSaisie : 29 février existe une année bissextile', () => {
  assert.equal(versISO(dateDepuisSaisie('29', '2', '2008')!), '2008-02-29');
});

test('dateDepuisSaisie : 29 février refusé hors année bissextile', () => {
  assert.equal(dateDepuisSaisie('29', '2', '2011'), null);
});

test('dateDepuisSaisie : jour ou mois impossible', () => {
  assert.equal(dateDepuisSaisie('31', '4', '2010'), null);
  assert.equal(dateDepuisSaisie('12', '13', '2010'), null);
  assert.equal(dateDepuisSaisie('0', '5', '2010'), null);
});

test('dateDepuisSaisie : saisie incomplète ou non numérique', () => {
  assert.equal(dateDepuisSaisie('', '5', '2010'), null);
  assert.equal(dateDepuisSaisie('12', '5', '10'), null);
  assert.equal(dateDepuisSaisie('1a', '5', '2010'), null);
});

test('versISO : mois et jour toujours sur deux chiffres', () => {
  assert.equal(versISO(new Date(2010, 0, 5)), '2010-01-05');
});
