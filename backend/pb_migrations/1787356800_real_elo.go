package migrations

import (
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"

	"backend/internal/elo"
)

type watchlistRow struct {
	Id    string `db:"id"`
	User  string `db:"user"`
	Anime string `db:"anime"`
}

type matchRow struct {
	User    string `db:"user"`
	AnimeA  string `db:"animeA"`
	AnimeB  string `db:"animeB"`
	Outcome string `db:"outcome"`
}

// Moves from the fixed-step score (+1 / -1) to the Elo calculation.
//
// The `elo` field becomes a float: an Elo correction rarely lands on a whole
// number, and rounding after every duel would make the total drift. The floor at
// zero goes away, as it would break the zero-sum property of the system.
//
// Ratings are then recomputed by replaying the entire duel history through the new
// formula: nobody loses the ranking work already done.
func init() {
	m.Register(func(app core.App) error {
		watchlists, err := app.FindCollectionByNameOrId("watchlists")
		if err != nil {
			return fmt.Errorf("collection watchlists introuvable: %w", err)
		}

		field, ok := watchlists.Fields.GetByName("elo").(*core.NumberField)
		if !ok {
			return fmt.Errorf("champ watchlists.elo absent ou de type inattendu")
		}

		field.OnlyInt = false
		field.Min = nil
		field.Help = "Note Elo. Pilotée par /api/weeeb/ranking, non modifiable par le client."

		if err := app.Save(watchlists); err != nil {
			return err
		}

		return replayMatches(app)
	}, func(app core.App) error {
		watchlists, err := app.FindCollectionByNameOrId("watchlists")
		if err != nil {
			return nil
		}

		field, ok := watchlists.Fields.GetByName("elo").(*core.NumberField)
		if !ok {
			return nil
		}

		minElo := 0.0
		field.OnlyInt = true
		field.Min = &minElo

		if err := app.Save(watchlists); err != nil {
			return err
		}

		_, err = app.DB().NewQuery(
			"UPDATE watchlists SET elo = {:elo}",
		).Bind(dbx.Params{"elo": initialElo}).Execute()

		return err
	})
}

// replayMatches resets every rating to its starting value, then replays the duel
// history in chronological order.
func replayMatches(app core.App) error {
	var entries []watchlistRow
	if err := app.DB().
		Select("id", "user", "anime").
		From("watchlists").
		All(&entries); err != nil {
		return fmt.Errorf("lecture des watchlists: %w", err)
	}

	key := func(user, anime string) string { return user + "/" + anime }

	ratings := make(map[string]float64, len(entries))
	ids := make(map[string]string, len(entries))
	for _, entry := range entries {
		k := key(entry.User, entry.Anime)
		ratings[k] = elo.DefaultRating
		ids[k] = entry.Id
	}

	var matches []matchRow
	if err := app.DB().
		Select("user", "animeA", "animeB", "outcome").
		From("elo_matches").
		OrderBy("created ASC", "id ASC").
		All(&matches); err != nil {
		return fmt.Errorf("lecture de l'historique des duels: %w", err)
	}

	for _, match := range matches {
		keyA, keyB := key(match.User, match.AnimeA), key(match.User, match.AnimeB)

		ratingA, okA := ratings[keyA]
		ratingB, okB := ratings[keyB]
		if !okA || !okB {
			// The anime has been removed from the list since: the duel is moot.
			continue
		}

		ratings[keyA], ratings[keyB] = elo.NewRatings(
			ratingA,
			ratingB,
			elo.Outcome(match.Outcome),
		)
	}

	for k, rating := range ratings {
		if _, err := app.DB().NewQuery(
			"UPDATE watchlists SET elo = {:elo} WHERE id = {:id}",
		).Bind(dbx.Params{"elo": rating, "id": ids[k]}).Execute(); err != nil {
			return fmt.Errorf("écriture de la note: %w", err)
		}
	}

	return nil
}
