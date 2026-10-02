/**
 * Sauvegarde de la base de production.
 *
 * Le plan gratuit de Supabase ne fait **aucune sauvegarde automatique** : c'est à
 * nous de les prendre. Trois fichiers, comme le prescrit la documentation Supabase —
 * les rôles, le schéma, les données — parce que `pg_dump` ne les sort pas ensemble.
 *
 * Prérequis : Docker Desktop doit tourner. Le CLI Supabase exécute `pg_dump` dans un
 * conteneur plutôt que d'exiger une installation locale de Postgres.
 *
 * Les sauvegardes sortent **hors du dépôt** : elles contiennent les données
 * personnelles de mineurs, et ce dépôt est public.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { horodatage, sauvegardesAPurger } from './rotation.ts';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Combien de sauvegardes on garde. Au-delà, c'est de la conservation sans finalité. */
const A_CONSERVER = 10;

const DUMPS = [
  { fichier: 'roles.sql', options: ['--role-only'] },
  { fichier: 'schema.sql', options: [] },
  {
    fichier: 'data.sql',
    options: ['--use-copy', '--data-only', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes'],
  },
] as const;

function echouer(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/**
 * Lecture du `.env` à la main plutôt qu'avec `--env-file` : ce drapeau n'existe que
 * sur les Node récents, et ce script doit tourner chez n'importe qui.
 */
function lireEnv(chemin: string, cle: string): string | undefined {
  if (!existsSync(chemin)) return undefined;
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const nette = ligne.trim();
    if (nette.startsWith('#')) continue;
    const separateur = nette.indexOf('=');
    if (separateur < 1 || nette.slice(0, separateur).trim() !== cle) continue;
    return nette
      .slice(separateur + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const url = process.env.SUPABASE_DB_URL ?? lireEnv(join(RACINE, '.env'), 'SUPABASE_DB_URL');
if (!url) {
  echouer(
    'SUPABASE_DB_URL est absente de ton .env.\n' +
      '  Dashboard Supabase → Connect → Session pooler, puis colle la chaîne dans .env :\n' +
      '  SUPABASE_DB_URL=postgresql://postgres.<ref>:<mot-de-passe>@...pooler.supabase.com:5432/postgres',
  );
}

// Le dossier de destination est hors du dépôt par défaut, et doit le rester :
// un `git add -A` distrait publierait les données de tes élèves.
const destination = resolve(process.env.RUNGEN_SAUVEGARDES ?? join(RACINE, '..', 'rungen-sauvegardes'));
if (!relative(RACINE, destination).startsWith('..')) {
  echouer(
    `Le dossier de sauvegarde (${destination}) est à l'intérieur du dépôt.\n` +
      "  Ces fichiers contiennent des données personnelles et le dépôt est public : choisis un dossier extérieur\n" +
      '  avec la variable RUNGEN_SAUVEGARDES.',
  );
}

const dossier = join(destination, horodatage(new Date()));
mkdirSync(dossier, { recursive: true });
console.log(`Sauvegarde dans ${dossier}`);

for (const { fichier, options } of DUMPS) {
  process.stdout.write(`  ${fichier}… `);
  const r = spawnSync(
    'npx',
    ['--yes', 'supabase', 'db', 'dump', '--db-url', url, '-f', join(dossier, fichier), ...options],
    { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (r.status !== 0) {
    // Les dernières lignes, pas les premières : le CLI commence par annoncer ce
    // qu'il fait, et ne dit qu'à la fin pourquoi il a échoué. Et l'URL est masquée,
    // car elle porte le mot de passe de la base.
    const lignes = (r.stderr ?? '')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);
    const cause = (lignes.slice(-3).join('\n  ') || 'échec sans message').replaceAll(url, '<URL masquée>');

    console.log('échec');
    rmSync(dossier, { recursive: true, force: true });
    echouer(
      `${fichier} :\n  ${cause}\n\n` +
        '  Première chose à vérifier : Docker Desktop tourne-t-il ? Le CLI Supabase\n' +
        '  en a besoin pour lancer pg_dump dans un conteneur.',
    );
  }

  const taille = statSync(join(dossier, fichier)).size;
  if (taille === 0) {
    console.log('vide');
    rmSync(dossier, { recursive: true, force: true });
    echouer(`${fichier} est vide : une sauvegarde vide est pire que pas de sauvegarde.`);
  }
  console.log(`${Math.max(1, Math.round(taille / 1024))} ko`);
}

for (const vieille of sauvegardesAPurger(readdirSync(destination), A_CONSERVER)) {
  rmSync(join(destination, vieille), { recursive: true, force: true });
  console.log(`  purgé ${vieille}`);
}

const total = readdirSync(destination).length;
console.log(`\n✓ Sauvegarde faite. ${total} sauvegarde${total > 1 ? 's' : ''} conservée${total > 1 ? 's' : ''}.`);
if (!existsSync(join(dossier, 'data.sql'))) echouer('data.sql a disparu après coup — à vérifier à la main.');
