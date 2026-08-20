// Package hooks gathers the guard rails applied to the collections.
//
// PocketBase's API rules control WHO may write, not WHAT is written: before these
// hooks, any logged-in user could create a watchlist entry or a comment in someone
// else's name, or make up an Elo rating. It all goes through the server now.
package hooks

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"

	"backend/internal/elo"
)

// Register wires up every collection hook.
func Register(app core.App) {
	registerWatchlistHooks(app)
	registerCommentHooks(app)
	registerAnimeHooks(app)
}

func registerWatchlistHooks(app core.App) {
	// On creation, the owner and the counters are imposed by the server.
	//
	// Superusers are exempt: administering records on someone else's behalf is
	// exactly what the dashboard and the legacy import script do. Their writes
	// are trusted, so only the missing rating is defaulted.
	app.OnRecordCreateRequest("watchlists").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return router.NewUnauthorizedError("Connexion requise.", nil)
		}

		if e.Auth.IsSuperuser() {
			if e.Record.GetFloat("elo") == 0 {
				e.Record.Set("elo", elo.DefaultRating)
			}

			return e.Next()
		}

		e.Record.Set("user", e.Auth.Id)
		e.Record.Set("elo", elo.DefaultRating)
		e.Record.Set("matchCount", 0)

		return e.Next()
	})

	// On update, only `status` and `isMasterclass` are free: the rating moves
	// solely through /api/weeeb/ranking.
	app.OnRecordUpdateRequest("watchlists").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil && e.Auth.IsSuperuser() {
			return e.Next()
		}

		original := e.Record.Original()

		e.Record.Set("user", original.GetString("user"))
		e.Record.Set("anime", original.GetString("anime"))
		e.Record.Set("elo", original.GetFloat("elo"))
		e.Record.Set("matchCount", original.GetInt("matchCount"))

		return e.Next()
	})
}

func registerCommentHooks(app core.App) {
	app.OnRecordCreateRequest("comments").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return router.NewUnauthorizedError("Connexion requise.", nil)
		}

		// Same exemption as for watchlists: a superuser may write on behalf of a user.
		if !e.Auth.IsSuperuser() {
			e.Record.Set("author", e.Auth.Id)
		}

		return e.Next()
	})

	// An existing review is never reassigned to another author or another anime.
	app.OnRecordUpdateRequest("comments").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil && e.Auth.IsSuperuser() {
			return e.Next()
		}

		original := e.Record.Original()

		e.Record.Set("author", original.GetString("author"))
		e.Record.Set("anime", original.GetString("anime"))

		return e.Next()
	})
}

func registerAnimeHooks(app core.App) {
	// The unique index on `name` is sensitive to stray whitespace:
	// "Grand Blue " and "Grand Blue" would both get through.
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
