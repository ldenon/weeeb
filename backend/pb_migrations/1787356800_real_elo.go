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

// Passe du score à pas fixe (+1 / -1) au calcul Elo.
//
// Le champ `elo` devient flottant : une correction Elo tombe rarement sur un
// entier, et arrondir à chaque duel ferait dériver le total. La borne à zéro
// disparaît, elle casserait la somme nulle du système.
//
// Les notes sont ensuite recalculées en rejouant tout l'historique des duels
// avec la nouvelle formule : personne ne perd le travail de classement déjà fait.
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

// replayMatches remet toutes les notes à leur valeur de départ puis rejoue
// l'historique des duels dans l'ordre chronologique.
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
			// L'anime a été retiré de la liste depuis : le duel n'a plus de sens.
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
