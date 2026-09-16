# RUNGEN — app de suivi sportif open source

App mobile gratuite pour loguer ses activités, suivre sa forme et relever des challenges entre amis. Portée par l'association RUNGEN (loi 1901).

## Où en est le projet

V1 découpée en 6 blocs. **Bloc 1 (Fondations)** : base de données, règles de sécurité et app mobile écrites et testées. Reste à brancher les services externes (projet Supabase, OAuth Google, compte développeur Apple) et à vérifier sur appareil.

- Conception : `docs/specs/2026-09-10-bloc1-fondations-design.md`
- Plan de travail : `docs/plans/2026-09-10-bloc1-fondations.md`

## Démarrer

    npm install
    cp .env.example .env    # puis remplir avec les valeurs du projet Supabase
    npx expo start

La connexion Google et Apple passe par du code natif : elle ne fonctionne pas dans Expo Go, il faut un build de développement (`npx eas build --profile development --platform android`).

## Lancer les tests

Logique métier (Node 22+) :

    npm run test:unit

Règles de la base (Postgres 15+ local) :

    PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db

Le script crée une base jetable `rungen_test` pour chaque fichier de test, simule Supabase, applique les migrations puis lance les tests. Il affiche `OK` ou `FAIL` par fichier et renvoie un code d'erreur en cas d'échec.

Types TypeScript :

    npm run typecheck

## Structure

    src/app/        écrans (Expo Router) : bienvenue, onboarding, app connectée
    src/lib/        logique métier et accès à Supabase, avec ses tests
    src/ui/         socle d'interface partagé
    supabase/       migrations et tests SQL
    docs/           spec de conception et plan de travail
