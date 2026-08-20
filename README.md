# Weeeb

Watchlist d'anime partagée entre amis : chacun tient sa liste, écrit son avis,
voit ce que les autres ont regardé, et classe ses animes par duels successifs.

Monorepo : un seul dépôt, deux moitiés déployées séparément.

```
weeeb/
├── backend/     PocketBase 0.39 étendu en Go — schéma, auth, garde-fous, classement Elo
└── frontend/    TanStack Start (React 19) — SSR + SPA
```

## Démarrer

Les deux moitiés tournent en parallèle. Le front lit `VITE_PB_URL` dans
`frontend/.env.local` et s'attend à trouver le back sur `http://localhost:8090`.

Backend :

```bash
cd backend && go run . serve
```

Frontend :

```bash
cd frontend && bun install && bun run dev
```

Au premier lancement sur une base vide, crée un compte administrateur :

```bash
cd backend && go run . superuser upsert admin@exemple.fr motdepasse123
```

## Vérifier

```bash
cd backend && go vet ./... && go test ./internal/...
```

```bash
cd frontend && bunx tsc --noEmit && bunx biome check src/ && bun run build
```

## Déploiement (Dokploy)

Deux applications Dokploy sur ce même dépôt, distinguées par leur chemin :

| | Backend | Frontend |
|---|---|---|
| Build Path | `backend` | `frontend` |
| Dockerfile Path | `Dockerfile` | — |
| Docker Context Path | *(laisser vide)* | — |
| Watch Paths | `backend/*` | `frontend/*` |

Les *Watch Paths* évitent qu'un commit ne touchant qu'une moitié redéploie l'autre.
Ils fonctionnent sans configuration avec GitHub ; avec un autre fournisseur il faut
d'abord activer l'auto-deploy.

**Piège sur les chemins.** Les deux champs n'ont pas le même point de départ :

- le *Dockerfile Path* est relatif au **Build Path** — donc `Dockerfile`, pas
  `backend/Dockerfile`, sinon Dokploy cherche dans `code/backend/backend/` et
  échoue en écrivant le `.env` (« Directory nonexistent ») ;
- le *Docker Context Path* est relatif à la **racine du dépôt**. Laissé vide, il
  retombe sur le dossier du Dockerfile, ce qui est le comportement voulu ici :
  le Dockerfile fait `COPY go.mod go.sum ./` et attend `backend/` comme contexte.
  Si tu tiens à le renseigner, mets `backend` — surtout pas `.`.

Les données PocketBase vivent dans le volume `pb_data` — à sauvegarder, c'est le seul
état non reconstructible du projet.

## Migrer les données d'une ancienne instance

`scripts/import-legacy.py` recopie les données d'une instance PocketBase existante
vers celle-ci, en passant par les deux API REST. Aucune archive, aucun
téléchargement, l'ancienne instance est lue sans être modifiée.

```bash
export LEGACY_URL=https://ancienne-instance
export LEGACY_EMAIL=admin@exemple.fr
export LEGACY_PASSWORD=...
export TARGET_URL=https://nouvelle-instance
export TARGET_EMAIL=admin@exemple.fr
export TARGET_PASSWORD=...

python3 scripts/import-legacy.py --dry-run   # compte sans rien écrire
python3 scripts/import-legacy.py             # importe
```

Les collections sont copiées dans l'ordre de leurs dépendances (genres, users,
animes, watchlists, comments, elo_matches) et **les identifiants sont préservés**,
ce qui garde toutes les relations valides sans table de correspondance. Le script
énumère les collections de l'ancienne instance et **signale bruyamment celles
qu'il ne copie pas**, pour qu'un import partiel ne passe jamais pour un succès. Le script est
idempotent : un enregistrement déjà présent est ignoré, on peut donc le relancer
après avoir corrigé une erreur.

Trois points à connaître :

- **Les connexions Google continuent de fonctionner.** Les emails sont préservés,
  et PocketBase rattache un compte OAuth sans lien existant en cherchant par email.
- **Les avatars ne sont pas copiés** : un champ fichier demande un vrai téléversement,
  impossible depuis une simple création JSON.
- **Les mots de passe sont régénérés au hasard et inutilisables.** Les comptes
  n'existent que pour l'OAuth ; personne ne peut se connecter avec.

Les scores Elo repartent à 1000 : l'ancienne instance est antérieure au classement.

## Aller plus loin

- [ARCHITECTURE.md](ARCHITECTURE.md) — modèle de données, flux, dette, décisions ouvertes
- [backend/README.md](backend/README.md) — hooks, calcul Elo, contrat des endpoints
