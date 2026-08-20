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
| Dockerfile Path | `backend/Dockerfile` | — |
| Watch Paths | `backend/*` | `frontend/*` |

Les *Watch Paths* évitent qu'un commit ne touchant qu'une moitié redéploie l'autre.
Ils fonctionnent sans configuration avec GitHub ; avec un autre fournisseur il faut
d'abord activer l'auto-deploy.

Les données PocketBase vivent dans le volume `pb_data` — à sauvegarder, c'est le seul
état non reconstructible du projet.

## Aller plus loin

- [ARCHITECTURE.md](ARCHITECTURE.md) — modèle de données, flux, dette, décisions ouvertes
- [backend/README.md](backend/README.md) — hooks, calcul Elo, contrat des endpoints
