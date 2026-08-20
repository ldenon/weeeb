# Weeeb — Architecture & Contexte

> Document de référence de l'état **actuel** du projet (mis à jour le 2026-08-20).
> Il décrit ce qui existe. Ce qui reste en dette est listé en §7, les décisions
> encore ouvertes en §8.

---

## 1. Vue d'ensemble

**Weeeb** est une application de *watchlist d'anime* partagée entre amis, en français.
Chaque utilisateur maintient sa liste (un statut par anime), écrit un avis, voit ce que
les autres membres ont regardé du même anime, et **classe ses animes par duels successifs**.

Le projet est un **monorepo** : un seul dépôt Git à la racine, deux moitiés déployées
séparément.

```
weeeb/                        ← dépôt Git unique
├── backend/                  ← PocketBase étendu en Go
└── frontend/                 ← TanStack Start (React 19)
```

L'historique du dépôt est celui du front, dont les fichiers ont été déplacés sous
`frontend/`. Le backend est entré en un commit : ses 35 commits antérieurs appartenaient
au projet *klokk* et sont restés sur `ldenon/klokk-backend`.

| | Backend | Frontend |
|---|---|---|
| Stack | Go 1.25.6 + PocketBase 0.39.11 | React 19 + TanStack Start 1.167 (Vite 7 / Nitro) |
| Rôle | Schéma, auth OAuth2, garde-fous d'écriture, classement Elo | SSR + SPA, interface |
| Déploiement | Docker (`alpine`, port 8090, volume `pb_data`) | `bun run build` → `.output/server/index.mjs` |
| Runtime dev | `go run . serve` | `bun --bun vite dev` |

**Point structurant** : le backend n'est plus un PocketBase nu. Les invariants métier
(propriété des enregistrements, score de classement) sont imposés par des hooks Go, et le
classement passe par des endpoints dédiés. Le frontend continue de lire les collections
directement via le SDK, mais ne peut plus écrire ce qu'il veut.

---

## 2. Backend — PocketBase étendu

### 2.1 Organisation

```
backend/
├── main.go                 démarrage, hooks, routes
├── internal/
│   ├── hooks/records.go    garde-fous par collection
│   └── elo/                classement par duels
│       ├── elo.go          constantes et arithmétique des scores
│       ├── store.go        accès aux données
│       ├── matchmaking.go  appariement équilibré + classement
│       └── handlers.go     endpoints HTTP
└── pb_migrations/
    ├── 1777919809_collections_snapshot.go
    ├── 1787270400_elo_ranking.go
    └── 1787356800_real_elo.go
```

`main.go` importe `pb_migrations` en effet de bord. **Sans cet import les `init()` des
migrations ne s'exécutent pas** — c'était le cas avant, le schéma n'était donc jamais
appliqué par le code.

### 2.2 Modèle de données

```
users ──────┬──< watchlists >──── animes ──>> genres
            ├──< comments   >────┘
            └──< elo_matches >───┘
```

#### `users` (auth, `_pb_users_auth_`)
`name`, `avatar` (file), + champs système. `list`/`view` publics ·
`update`/`delete` réservés au propriétaire · `create` interdit (comptes créés via
OAuth Google uniquement).

#### `animes` (`pbc_3034355360`)
`name` (**index unique**), `synopsis`, `img` (URL externe), `genres` (relation multiple).
`list`/`view` publics · `create` pour tout utilisateur connecté · `update`/`delete` interdits.

#### `genres` (`pbc_2683869272`)
`name`. Lecture publique, aucune écriture via l'API — référentiel géré depuis l'admin.

#### `watchlists` (`pbc_4199579517`)
| Champ | Type | Note |
|---|---|---|
| `anime` | relation → `animes` | |
| `user` | relation → `users` | imposé par hook |
| `status` | select | `completed` \| `ongoing` \| `dropped` \| `planned` |
| `isMasterclass` | bool | |
| `elo` | number | note Elo flottante, **pilotée par le serveur**, défaut 1000 |
| `matchCount` | number | **piloté par le serveur**, défaut 0 |

**Index unique `(user, anime)`** — un anime n'apparaît qu'une fois par liste.
`list`/`view` publics (le partage est le principe du produit) · `create` connecté ·
`update`/`delete` réservés au propriétaire.

#### `comments` (`pbc_533777971`)
`author`, `anime`, `content`, `isPrivate`. **Index unique `(author, anime)`** : un seul
avis par utilisateur et par anime. `list`/`view` filtrés sur `isPrivate = false` ·
`update` réservé à l'auteur · `delete` interdit.

#### `elo_matches` (`pbc_3854051783`)
`user`, `animeA`, `animeB`, `outcome` (`a` \| `b` \| `draw`), `pairKey`.
**Toutes les règles d'API sont nulles** : la collection n'est lisible ni écrivable par le
client, seuls les endpoints Go y touchent.

### 2.3 Garde-fous (`internal/hooks`)

Les règles d'API disent *qui* peut écrire, pas *ce qui* est écrit. Ces hooks imposent le reste :

| Collection | Hook | Effet |
|---|---|---|
| `watchlists` | create | `user` forcé sur l'appelant, `elo` à 100, `matchCount` à 0 |
| `watchlists` | update | `user`, `anime`, `elo`, `matchCount` restaurés depuis l'original |
| `comments` | create | `author` forcé sur l'appelant |
| `comments` | update | `author` et `anime` restaurés |
| `animes` | create | `name`, `synopsis`, `img` nettoyés de leurs espaces |

Avant ces hooks, tout utilisateur connecté pouvait créer une entrée de watchlist ou un
commentaire **au nom de quelqu'un d'autre**.

### 2.4 Classement par duels (`internal/elo`)

Seuls les animes commencés sont classés (`completed`, `ongoing`, `dropped`) : un anime
`planned` n'a pas été vu et ne peut pas être départagé. Le filtre est appliqué dans
`LoadEntries`, donc classement, appariement et compteurs de progression restent cohérents.

Chaque anime éligible part à **1000 points** et son classement suit le système **Elo**. Le score
attendu de A face à B se déduit de l'écart de notes — `E(A) = 1 / (1 + 10^((B-A)/400))` —
puis la note est corrigée de l'écart entre le résultat réel et cette attente :
`note'(A) = note(A) + K × (résultat(A) - E(A))`, avec `K = 32` et un résultat valant 1, 0,5
ou 0. Les deux compteurs de duels sont incrémentés dans tous les cas.

Concrètement : une victoire entre égaux déplace 16 points, battre plus fort que soi
rapporte davantage, un match nul fait monter l'outsider, et le système est **à somme
nulle**. La note est stockée en flottant et renvoyée arrondie par l'API ; elle n'est pas
bornée, la plaquer à zéro casserait la somme nulle.

La note de départ n'influence pas le classement (seuls les écarts comptent) : 1000 est la
convention usuelle et évite d'afficher des points négatifs. `DefaultRating`, `KFactor` et
`ScaleFactor` sont regroupées en tête de `elo.go`.

**Appariement équilibré** — pour qu'aucun anime n'accumule plus de duels que les autres :

1. le premier anime est tiré parmi ceux qui ont le **moins** de duels joués ;
2. l'adversaire est choisi parmi ceux dont le duel n'a **jamais** été joué, puis parmi les
   moins sollicités, puis parmi les scores les plus proches (un duel serré est plus
   informatif qu'un duel joué d'avance).

L'écart entre l'anime le plus vu et le moins vu reste borné à 1 ou 2, et tous les duels
distincts sont épuisés avant qu'un seul ne soit rejoué. `matchmaking_test.go` vérifie ces
deux propriétés jusqu'à 40 animes.

**Endpoints**, tous sous `/api/weeeb/ranking`, authentifiés et cloisonnés par utilisateur :

| Méthode | Chemin | Effet |
|---|---|---|
| `GET` | `/api/weeeb/ranking` | Classement trié, ex aequo numérotés 1, 2, 2, 4 |
| `GET` | `/api/weeeb/ranking/user/{userId}` | Le classement d'un autre membre |
| `GET` | `/api/weeeb/ranking/match` | Prochain duel (`pair: null` si moins de 2 animes) |
| `POST` | `/api/weeeb/ranking/match` | Enregistre un résultat, renvoie le duel suivant |
| `POST` | `/api/weeeb/ranking/reset` | Notes à 1000, historique purgé |

Détail du contrat dans [backend/README.md](backend/README.md).

---

## 3. Frontend

### 3.1 Arborescence

```
frontend/src/
├── router.tsx              createRouter
├── routeTree.gen.ts        généré — ne pas éditer
├── styles.css              thème Tailwind v4 (@theme, tokens oklch)
├── types/index.ts          types des enregistrements PocketBase et du classement
├── lib/
│   ├── pocketbase.ts       singleton `pb`
│   ├── api.ts              appels aux endpoints Go (/api/weeeb/...)
│   └── queryClient.ts      un cache par requête SSR, partagé côté navigateur
├── routes/
│   ├── __root.tsx          shell HTML, QueryClientProvider, 404
│   ├── login.tsx           OAuth Google
│   └── _app/
│       ├── route.tsx       layout protégé (ssr: false)
│       ├── index.tsx       ma liste, par statut
│       ├── ranking.tsx     duels + classement
│       ├── anime/$animeId.tsx
│       ├── anime/add.tsx
│       └── genres/$genre.tsx
├── components/             8 composants, à plat
├── hooks/                  12 hooks, une responsabilité chacun
└── utils/anime.ts          traductions de statut, helper de pluriel
```

### 3.2 Routage & authentification

- **`/login`** : bouton unique → `authWithOAuth2({ provider: "google" })`.
- **`/_app`** : garde d'authentification. `beforeLoad` redirige vers `/login` sans session
  valide, sinon `authRefresh()` une fois par onglet (mémorisé en `sessionStorage`).
  Marqué **`ssr: false`** — `pb.authStore` et `sessionStorage` sont des APIs navigateur.

Tout l'espace connecté est donc rendu côté client ; le SSR ne couvre que le shell et `/login`.

### 3.3 Écrans

| Route | Contenu |
|---|---|
| `/` | Recherche + 5 sections (Masterclass, En cours, Prévu, Terminé, Inachevé) rendues par un composant `Section` unique. Lien vers les duels dès 2 animes. |
| `/ranking` | Deux onglets. **Duel** : deux affiches côte à côte, clic pour désigner le vainqueur, bouton « Match nul », raccourcis ← → et espace. **Classement** : liste ordonnée avec rang, score et nombre de duels, sélecteur pour consulter le classement d'un autre membre, et réinitialisation sur le sien seulement. Barre de progression commune. |
| `/anime/$animeId` | Fiche : affiche, **rang et score issus du classement**, genres, synopsis, bouton de statut (avec retrait de la liste), pastilles des autres membres, formulaire d'avis auto-sauvegardé. |
| `/anime/add` | Formulaire validé par Zod + mode d'emploi. |
| `/genres/$genre` | `loader` : `all` → tout, sinon résolution du slug puis filtre. |

### 3.4 Hooks

| Hook | Rôle |
|---|---|
| `useAnime` / `useComments` / `useGenres` | lectures simples |
| `useRelatedUsers` | entrées de watchlist des autres membres pour un anime |
| `useWatchlistAnimes` | la liste de l'utilisateur |
| `useSaveComment` | crée ou met à jour l'avis, appels sérialisés |
| `useSetWatchlistStatus` / `useRemoveFromWatchlist` | mutations de watchlist |
| `useRanking` / `useNextMatch` / `useSubmitMatch` / `useResetRanking` | classement |

Toutes les mutations invalident les caches concernés. Tous les filtres passent par
`pb.filter()` avec paramètres liés.

### 3.5 Design system

Thème Tailwind v4 en `@theme` ([src/styles.css](frontend/src/styles.css)) : palette sombre en
`oklch`, deux dégradés, une ombre. Police **Outfit Variable**, icônes `lucide-react`.

### 3.6 Outillage

Bun · **Biome 2.2.4** (tabs, guillemets doubles) · Vitest configuré · alias `@/*` → `./src/*` ·
TypeScript `strict` avec `noUnusedLocals` / `noUnusedParameters`.

---

## 4. Flux principaux

**Connexion** — `/` → garde `_app` → `/login` → OAuth Google → retour sur `/` → `authRefresh()`.

**Ajouter un anime** — formulaire validé par Zod → `animes.create` (le hook nettoie le nom,
l'index unique rejette les doublons, l'erreur est affichée).

**Positionner un statut** — bouton de la fiche → création ou mise à jour de l'entrée de
watchlist → invalidation des caches. Le serveur impose `user`, `elo` et `matchCount`.

**Écrire un avis** — visible si l'anime est dans la liste → frappe → debounce 500 ms →
l'avis existant est relu puis mis à jour, ou créé.

**Classer ses animes** — `/ranking` → le serveur propose un duel équilibré → le vainqueur
est désigné → le résultat est enregistré et **le duel suivant arrive dans la même réponse**.

---

## 5. Configuration

| Variable | Où | Rôle |
|---|---|---|
| `VITE_PB_URL` | `frontend/.env.local` | URL du PocketBase, injectée au build (donc publique) |

Un `/` final est toléré : `lib/api.ts` normalise la base avant de concaténer les chemins.

---

## 6. Ce qui a été corrigé

| Sujet | Avant | Maintenant |
|---|---|---|
| `zod` | importé sans être installé, build cassé | ajouté aux dépendances (v4) |
| `pb_migrations` | jamais importé, migrations jamais appliquées | importé en effet de bord |
| Import mort | `Divide` faisait échouer `tsc` | supprimé |
| Avis | recréé à chaque frappe → rejeté par l'index unique | relu puis créé ou mis à jour, appels sérialisés |
| Caches | aucune invalidation, UI périmée 5 min | invalidation sur chaque mutation |
| Filtres | saisie concaténée dans les filtres | `pb.filter()` avec paramètres liés |
| `queryClient` | singleton de module, risque de fuite entre requêtes SSR | un cache par requête serveur |
| Propriété | on pouvait écrire au nom d'un autre utilisateur | imposée par hooks Go |
| Watchlist | impossible de retirer un anime | suppression autorisée + bouton |
| Doublons | rien n'empêchait deux entrées pour le même anime | index unique `(user, anime)` |
| Note/score | `4/5` codé en dur | rang et score réels issus du classement |
| Calcul du classement | pas fixe ±1 | système Elo, historique rejoué par migration |
| Erreurs | ajout d'anime échouant en silence | messages affichés |
| Sidebar | « Accueil » et « Ma liste » vers `/` | liens distincts + « Classement » |
| Recherche | une requête par frappe | debounce 300 ms |
| Typage | tout en `RecordModel` | types dédiés dans `src/types` |
| Scripts | `eslint` / `prettier` absents | `biome` |
| `go.mod` | `uuid`, `godotenv`, restes d'un autre projet | nettoyé |

---

## 7. Dette restante

1. **Aucun test frontend** malgré Vitest, Testing Library et jsdom installés. Le backend
   couvre la logique Elo et l'appariement ; l'interface n'est pas testée.
2. **`@tanstack/react-router-ssr-query` installé mais non branché** — l'intégration
   officielle Router↔Query n'est pas utilisée.
3. **Lecture publique large** : `users`, `watchlists` et `animes` restent lisibles sans
   authentification. Cohérent avec un produit social entre amis, mais à assumer explicitement.
4. **README frontend** toujours celui du template TanStack.
5. **Aucune CI**, alors que le monorepo la rend enfin simple à mettre en place (un seul
   dépôt, deux jobs).
6. **Quelques couleurs en dur** (`bg-blue-400/500`) au lieu des tokens du thème.

---

## 8. Décisions encore ouvertes

- `KFactor` vaut 32 pour tout le monde. Un K dégressif (fort sur les premiers duels d'un
  anime, plus faible ensuite) stabiliserait le haut du classement, au prix de la somme
  nulle — les deux camps ne s'échangeraient plus exactement les mêmes points.
- Les notes ne sont pas bornées. Avec une base à 1000 le négatif est très improbable, mais
  rien ne l'interdit formellement.
- Le classement est strictement personnel. Faut-il un classement agrégé entre amis ?
- `isPrivate` sur les commentaires n'est jamais exposé dans l'interface : fonctionnalité à
  construire, ou champ à supprimer ?
- Monorepo unifié (un dépôt + workspace + CI) ou deux dépôts distincts assumés ?
