# Weeeb — backend

PocketBase 0.39 étendu en Go : le schéma, les garde-fous d'écriture et le
classement par duels vivent dans ce dépôt.

## Lancer

```bash
go run . serve                 # http://127.0.0.1:8090 (admin sur /_/)
go run . migrate up            # applique les migrations sans démarrer le serveur
go test ./internal/...         # logique Elo et appariement
```

Le premier démarrage sur une base vide demande de créer un superuser, ou :

```bash
go run . superuser upsert admin@exemple.fr motdepasse123
```

## Organisation

```
main.go                  démarrage, enregistrement des hooks et des routes
internal/hooks/          garde-fous appliqués aux collections
internal/elo/            classement par duels (logique, appariement, endpoints)
pb_migrations/           schéma versionné — appliqué au démarrage
```

`main.go` importe `pb_migrations` en effet de bord (`_ "backend/pb_migrations"`).
Sans cet import les `init()` des migrations ne s'exécutent pas et le schéma n'est
jamais appliqué.

## Garde-fous (`internal/hooks`)

Les règles d'API de PocketBase disent *qui* peut écrire, pas *ce qui* est écrit.
Ces hooks imposent le reste côté serveur :

| Collection | Hook | Effet |
|---|---|---|
| `watchlists` | create | `user` forcé sur l'appelant, `elo` à 100, `matchCount` à 0 |
| `watchlists` | update | `user`, `anime`, `elo` et `matchCount` restaurés — seuls `status` et `isMasterclass` sont modifiables |
| `comments` | create | `author` forcé sur l'appelant |
| `comments` | update | `author` et `anime` restaurés |
| `animes` | create | `name`, `synopsis` et `img` nettoyés de leurs espaces |

Sans eux, tout utilisateur connecté pouvait créer une entrée de watchlist ou un
commentaire au nom d'un autre, et se fabriquer un score.

## Classement par duels (`internal/elo`)

Seuls les animes **commencés** entrent au classement : `completed`, `ongoing` et
`dropped`. Un anime `planned` n'a pas été vu, son propriétaire n'a donc pas d'avis
à donner — il est écarté du classement comme de l'appariement, et un duel le
concernant est rejeté même s'il est forgé à la main. S'il passe plus tard à un
statut commencé, il rejoint le classement avec la note qu'il avait.

Chaque anime éligible part à **1000 points** et son classement suit le
système **Elo**.

Pour un duel entre A et B, le score attendu de A se déduit de l'écart de notes :

```
E(A) = 1 / (1 + 10^((note(B) - note(A)) / 400))
```

La note est ensuite corrigée de l'écart entre le résultat réel et cette attente :

```
note'(A) = note(A) + K × (résultat(A) - E(A))
```

avec `résultat` valant 1 (victoire), 0,5 (match nul) ou 0 (défaite), et `K = 32`.

Conséquences :

- entre deux animes de même note, une victoire déplace **16 points** (K/2) ;
- battre un anime mieux noté rapporte **plus** que battre un anime moins bien noté ;
- un match nul fait **monter l'outsider** et descendre le favori ;
- le système est **à somme nulle** : ce que l'un gagne, l'autre le perd exactement.

Les constantes `DefaultRating`, `KFactor` et `ScaleFactor` sont regroupées en tête
de `elo.go`. La note de départ n'a aucune influence sur le classement — seuls les
écarts comptent — mais 1000 laisse assez de marge pour qu'un anime battu en boucle
n'affiche pas de points négatifs.

La note est **stockée en flottant** (arrondir à chaque duel ferait dériver le
total) et **renvoyée arrondie** par l'API. Elle n'est volontairement pas bornée :
la plaquer à zéro casserait la somme nulle.

Le score est stocké sur `watchlists` (`elo`, `matchCount`) et l'historique dans
`elo_matches`, dont **toutes les règles d'API sont nulles** : la collection n'est
accessible que par les endpoints ci-dessous. L'historique étant conservé, un
changement de barème peut être appliqué rétroactivement en rejouant les duels —
c'est exactement ce que fait la migration `1787356800_real_elo.go`.

### Appariement équilibré

Pour qu'aucun anime n'accumule plus de duels que les autres :

1. le premier anime est tiré parmi ceux qui ont le **moins** de duels joués ;
2. l'adversaire est choisi parmi ceux dont le duel n'a **jamais** été joué, puis
   parmi les moins sollicités, puis parmi les scores les plus proches.

L'écart entre l'anime le plus vu et le moins vu reste donc borné à 1 ou 2, et
tous les duels distincts sont épuisés avant qu'un seul ne soit rejoué. Les tests
de `matchmaking_test.go` vérifient ces deux propriétés jusqu'à 40 animes.

### Endpoints

Tous sous `/api/weeeb/ranking`, tous authentifiés (collection `users`), tous
cloisonnés sur l'utilisateur du jeton.

| Méthode | Chemin | Effet |
|---|---|---|
| `GET` | `/api/weeeb/ranking` | Classement trié, ex aequo numérotés 1, 2, 2, 4 |
| `GET` | `/api/weeeb/ranking/user/{userId}` | Le classement d'un autre membre, en lecture seule |
| `GET` | `/api/weeeb/ranking/match` | Prochain duel équilibré (`pair: null` si moins de 2 animes) |
| `POST` | `/api/weeeb/ranking/match` | Enregistre un résultat et renvoie le duel suivant |
| `POST` | `/api/weeeb/ranking/reset` | Remet toutes les notes à 1000 et purge l'historique |

Corps attendu par `POST /match` :

```json
{ "animeA": "<id>", "animeB": "<id>", "outcome": "a" }
```

`outcome` vaut `"a"`, `"b"` ou `"draw"`. Les deux animes doivent appartenir à la
watchlist de l'appelant, sinon la requête est rejetée en 400.

## Déploiement

```bash
docker compose up --build
```

Le binaire est compilé en statique puis copié dans une image `alpine` avec
`pb_migrations`. Les données persistent dans le volume `pb_data`.
