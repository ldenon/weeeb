package migrations

import (
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Starting rating in force at the date of this migration. The value is frozen
// deliberately: a migration describes a past state, so it must not follow a code
// constant whose meaning can change (which is what happened here, the system moved
// to the Elo calculation in a later migration).
const initialElo = 100

// Collection ids frozen by the initial snapshot migration.
const (
	animesCollectionId = "pbc_3034355360"
	usersCollectionId  = "_pb_users_auth_"
)

// Adds the Elo ranking system:
//   - watchlists.elo / watchlists.matchCount
//   - unique (user, anime) index on watchlists
//   - the ability to delete one's own watchlist entry
//   - the elo_matches collection (duel history)
func init() {
	m.Register(func(app core.App) error {
		watchlists, err := app.FindCollectionByNameOrId("watchlists")
		if err != nil {
			return fmt.Errorf("collection watchlists introuvable: %w", err)
		}

		minElo := 0.0
		watchlists.Fields.Add(
			&core.NumberField{
				Name:    "elo",
				OnlyInt: true,
				Min:     &minElo,
				Help:    "Score de classement. Piloté par /api/weeeb/ranking, non modifiable par le client.",
			},
			&core.NumberField{
				Name:    "matchCount",
				OnlyInt: true,
				Min:     &minElo,
				Help:    "Nombre de duels joués. Piloté par /api/weeeb/ranking, non modifiable par le client.",
			},
		)

		// An anime may appear only once in a given user's list. Without this
		// constraint the ranking would count the same title several times.
		watchlists.AddIndex("idx_watchlists_user_anime", true, "user, anime", "")

		// It was possible to add an anime to your list but never to remove it.
		watchlists.DeleteRule = ptr(`@request.auth.id = user.id`)

		if err := app.Save(watchlists); err != nil {
			return err
		}

		// Backfill the existing entries.
		if _, err := app.DB().NewQuery(
			"UPDATE watchlists SET elo = {:elo}, matchCount = 0 WHERE elo IS NULL OR elo = 0",
		).Bind(dbx.Params{"elo": initialElo}).Execute(); err != nil {
			return err
		}

		matches := core.NewBaseCollection("elo_matches")
		matches.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				MaxSelect:     1,
				CascadeDelete: true,
				CollectionId:  usersCollectionId,
			},
			&core.RelationField{
				Name:          "animeA",
				Required:      true,
				MaxSelect:     1,
				CascadeDelete: true,
				CollectionId:  animesCollectionId,
			},
			&core.RelationField{
				Name:          "animeB",
				Required:      true,
				MaxSelect:     1,
				CascadeDelete: true,
				CollectionId:  animesCollectionId,
			},
			&core.SelectField{
				Name:      "outcome",
				Required:  true,
				MaxSelect: 1,
				Values:    []string{"a", "b", "draw"},
			},
			&core.TextField{
				Name:     "pairKey",
				Required: true,
				Help:     "Identifiants des deux animes triés et joints par ':' — sert à repérer les duels déjà joués.",
			},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)

		matches.AddIndex("idx_elo_matches_user_pair", false, "user, pairKey", "")
		matches.AddIndex("idx_elo_matches_user_created", false, "user, created", "")

		// No API rules at all: the collection is reachable only through the Go hooks
		// (/api/weeeb/ranking). The client never writes to it directly.
		matches.ListRule = nil
		matches.ViewRule = nil
		matches.CreateRule = nil
		matches.UpdateRule = nil
		matches.DeleteRule = nil

		return app.Save(matches)
	}, func(app core.App) error {
		if matches, err := app.FindCollectionByNameOrId("elo_matches"); err == nil {
			if err := app.Delete(matches); err != nil {
				return err
			}
		}

		watchlists, err := app.FindCollectionByNameOrId("watchlists")
		if err != nil {
			return nil // déjà supprimée
		}

		watchlists.Fields.RemoveByName("elo")
		watchlists.Fields.RemoveByName("matchCount")
		watchlists.RemoveIndex("idx_watchlists_user_anime")
		watchlists.DeleteRule = nil

		return app.Save(watchlists)
	})
}

func ptr(s string) *string { return &s }
