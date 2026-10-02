# Sauvegardes de la base

Le plan gratuit de Supabase ne prend **aucune sauvegarde automatique** — les sauvegardes
quotidiennes sont réservées aux plans payants. Ce document décrit le palliatif, et dit
clairement là où il s'arrête.

## Ce qui est déjà protégé, et ce qui ne l'est pas

| | Où ça vit | Protégé ? |
|---|---|---|
| Schéma de la base | `supabase/migrations/`, dans git | oui, par construction |
| Code de l'app | git | oui |
| **Données** (comptes, séances, support) | uniquement chez Supabase | **non** |
| Fichiers du Storage (avatars, pièces jointes) | uniquement chez Supabase | **non** |

Ce script couvre la troisième ligne. Pas la quatrième : l'export des fichiers du Storage
reste à écrire, et n'a d'intérêt qu'une fois qu'il y aura des avatars à perdre.

## Prérequis

- **Docker Desktop installé et démarré.** Le CLI Supabase exécute `pg_dump` dans un
  conteneur plutôt que d'exiger une installation locale de Postgres.
- `SUPABASE_DB_URL` dans ton `.env` : dashboard Supabase → **Connect** → *Session pooler*.
  La chaîne contient le mot de passe de la base — ce fichier n'est pas versionné, et ne
  doit jamais l'être.

## Prendre une sauvegarde

```bash
npm run db:sauvegarde
```

Trois fichiers, comme le prescrit la documentation Supabase, parce que `pg_dump` ne les
sort pas ensemble :

- `roles.sql` — les rôles
- `schema.sql` — les tables, fonctions, déclencheurs, policies
- `data.sql` — le contenu

## Où elles atterrissent

`../rungen-sauvegardes/<horodatage>/`, soit **à côté du dépôt, pas dedans**.

Ce n'est pas un détail d'organisation. Ces fichiers contiennent les données personnelles
de mineurs ; le dépôt est public. Un `git add -A` distrait suffirait à les publier. Le
script refuse de s'exécuter si on lui désigne une destination à l'intérieur du dépôt.

Pour choisir un autre dossier — un disque chiffré, de préférence :

```bash
RUNGEN_SAUVEGARDES=D:/sauvegardes-rungen npm run db:sauvegarde
```

## Conservation

Les **10 dernières** sauvegardes sont conservées, les plus anciennes sont supprimées
automatiquement. Garder indéfiniment des copies de données de mineurs serait une
conservation sans finalité, donc un traitement à justifier.

Deux points à reprendre dans l'AIPD :
- ces sauvegardes constituent un traitement à part entière, avec sa durée de conservation ;
- le poste qui les héberge doit être chiffré (BitLocker sous Windows, FileVault sous macOS).

## Restaurer

Il faut `psql` installé localement (installeur PostgreSQL pour Windows, `brew install
postgresql@17` sous macOS), puis :

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "<chaîne de connexion de la base cible>"
```

`session_replication_role = replica` désactive les déclencheurs pendant l'import. Sans
cela, les déclencheurs de validation du bloc 1 rejetteraient des lignes pourtant déjà
validées à l'origine.

> **Une restauration ne s'improvise pas le jour où on en a besoin.** Fais-en une pour de
> vrai, vers un projet Supabase jetable, pendant que la base ne contient que tes données
> de test. C'est le seul moyen de savoir que la sauvegarde en est une.

## Les limites, dites franchement

Ce script est un palliatif, pas une politique de sauvegarde :

- il ne tourne que quand tu le lances ;
- il dépose les copies sur une machine personnelle ;
- il ne couvre pas les fichiers du Storage.

À partir du moment où de vrais élèves sont dans la base, la réponse est le **plan Pro**,
qui apporte les sauvegardes quotidiennes automatiques — et accessoirement empêche la mise
en pause après 7 jours d'inactivité, laquelle tombera inévitablement pendant des vacances
scolaires.
