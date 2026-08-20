// Package hooks regroupe les garde-fous appliqués aux collections.
//
// Les règles d'API de PocketBase contrôlent QUI peut écrire, pas CE QUI est
// écrit : avant ces hooks, n'importe quel utilisateur connecté pouvait créer une
// entrée de watchlist ou un commentaire au nom de quelqu'un d'autre, ou se
// fabriquer un score Elo. Tout passe désormais par le serveur.
package hooks

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"

	"backend/internal/elo"
)

// Register branche l'ensemble des hooks de collection.
func Register(app core.App) {
	registerWatchlistHooks(app)
	registerCommentHooks(app)
	registerAnimeHooks(app)
}

func registerWatchlistHooks(app core.App) {
	// À la création, le propriétaire et les compteurs sont imposés par le serveur.
	app.OnRecordCreateRequest("watchlists").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return router.NewUnauthorizedError("Connexion requise.", nil)
		}

		e.Record.Set("user", e.Auth.Id)
		e.Record.Set("elo", elo.DefaultRating)
		e.Record.Set("matchCount", 0)

		return e.Next()
	})

	// À la mise à jour, seul `status` et `isMasterclass` sont libres : le score
	// ne bouge que via /api/weeeb/ranking.
	app.OnRecordUpdateRequest("watchlists").BindFunc(func(e *core.RecordRequestEvent) error {
		original := e.Record.Original()

		e.Record.Set("user", original.GetString("user"))
		e.Record.Set("anime", original.GetString("anime"))
		e.Record.Set("elo", original.GetInt("elo"))
		e.Record.Set("matchCount", original.GetInt("matchCount"))

		return e.Next()
	})
}

func registerCommentHooks(app core.App) {
	app.OnRecordCreateRequest("comments").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return router.NewUnauthorizedError("Connexion requise.", nil)
		}

		e.Record.Set("author", e.Auth.Id)

		return e.Next()
	})

	// On ne réattribue pas un avis existant à un autre auteur ou à un autre anime.
	app.OnRecordUpdateRequest("comments").BindFunc(func(e *core.RecordRequestEvent) error {
		original := e.Record.Original()

		e.Record.Set("author", original.GetString("author"))
		e.Record.Set("anime", original.GetString("anime"))

		return e.Next()
	})
}

func registerAnimeHooks(app core.App) {
	// L'index unique sur `name` est sensible aux espaces parasites :
	// "Grand Blue " et "Grand Blue" passeraient tous les deux.
	app.OnRecordCreateRequest("animes").BindFunc(func(e *core.RecordRequestEvent) error {
		e.Record.Set("name", strings.TrimSpace(e.Record.GetString("name")))
		e.Record.Set("synopsis", strings.TrimSpace(e.Record.GetString("synopsis")))
		e.Record.Set("img", strings.TrimSpace(e.Record.GetString("img")))

		if e.Record.GetString("name") == "" {
			return router.NewBadRequestError("Le nom de l'anime est requis.", nil)
		}

		return e.Next()
	})
}
