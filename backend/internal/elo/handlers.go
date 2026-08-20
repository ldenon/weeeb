package elo

import (
	"errors"
	"math/rand"
	"net/http"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"
)

// RankedEntry est une entrée de classement avec sa position.
type RankedEntry struct {
	Entry
	Rank int `json:"rank"`
}

type rankingResponse struct {
	Ranking  []RankedEntry `json:"ranking"`
	Progress Progress      `json:"progress"`
}

type matchResponse struct {
	Pair     *Pair    `json:"pair"`
	Progress Progress `json:"progress"`
}

type submitRequest struct {
	AnimeA  string  `json:"animeA"`
	AnimeB  string  `json:"animeB"`
	Outcome Outcome `json:"outcome"`
}

// RegisterRoutes branche les endpoints du classement sur /api/weeeb/ranking.
//
// Toute la collection elo_matches et les champs elo/matchCount sont verrouillés
// côté API rules : ces routes sont le seul moyen de les faire évoluer.
func RegisterRoutes(e *core.ServeEvent) {
	g := e.Router.Group("/api/weeeb/ranking")
	g.Bind(apis.RequireAuth("users"))

	g.GET("", handleRanking)
	g.GET("/match", handleNextMatch)
	g.POST("/match", handleSubmitMatch)
	g.POST("/reset", handleReset)
}

func handleRanking(e *core.RequestEvent) error {
	entries, progress, err := loadState(e.App, e.Auth.Id)
	if err != nil {
		return err
	}

	return e.JSON(http.StatusOK, rankingResponse{
		Ranking:  withRanks(Rank(entries)),
		Progress: progress,
	})
}

func handleNextMatch(e *core.RequestEvent) error {
	entries, err := LoadEntries(e.App, e.Auth.Id)
	if err != nil {
		return err
	}

	played, err := PlayedPairs(e.App, e.Auth.Id)
	if err != nil {
		return err
	}

	total, err := TotalMatches(e.App, e.Auth.Id)
	if err != nil {
		return err
	}

	progress := BuildProgress(entries, played, total)

	pair, ok := NextPair(entries, played, newRand())
	if !ok {
		// Moins de deux animes en watchlist : rien à départager, ce n'est pas une erreur.
		return e.JSON(http.StatusOK, matchResponse{Pair: nil, Progress: progress})
	}

	return e.JSON(http.StatusOK, matchResponse{Pair: &pair, Progress: progress})
}

func handleSubmitMatch(e *core.RequestEvent) error {
	body := submitRequest{}
	if err := e.BindBody(&body); err != nil {
		return router.NewBadRequestError("Corps de requête invalide.", err)
	}

	if body.AnimeA == "" || body.AnimeB == "" {
		return router.NewBadRequestError("animeA et animeB sont requis.", nil)
	}
	if body.AnimeA == body.AnimeB {
		return router.NewBadRequestError("Un anime ne peut pas s'affronter lui-même.", nil)
	}
	if !body.Outcome.IsValid() {
		return router.NewBadRequestError(`outcome doit valoir "a", "b" ou "draw".`, nil)
	}

	userId := e.Auth.Id

	err := e.App.RunInTransaction(func(txApp core.App) error {
		entryA, err := FindWatchlistEntry(txApp, userId, body.AnimeA)
		if err != nil {
			return router.NewBadRequestError("Le premier anime n'est pas dans ta liste.", err)
		}

		entryB, err := FindWatchlistEntry(txApp, userId, body.AnimeB)
		if err != nil {
			return router.NewBadRequestError("Le second anime n'est pas dans ta liste.", err)
		}

		ratingA, ratingB := NewRatings(
			RatingOf(entryA),
			RatingOf(entryB),
			body.Outcome,
		)

		if err := applyResult(txApp, entryA, ratingA); err != nil {
			return err
		}
		if err := applyResult(txApp, entryB, ratingB); err != nil {
			return err
		}

		matches, err := txApp.FindCollectionByNameOrId("elo_matches")
		if err != nil {
			return err
		}

		match := core.NewRecord(matches)
		match.Set("user", userId)
		match.Set("animeA", body.AnimeA)
		match.Set("animeB", body.AnimeB)
		match.Set("outcome", string(body.Outcome))
		match.Set("pairKey", PairKey(body.AnimeA, body.AnimeB))

		return txApp.Save(match)
	})
	if err != nil {
		var apiErr *router.ApiError
		if errors.As(err, &apiErr) {
			return apiErr
		}
		return router.NewInternalServerError("Impossible d'enregistrer le duel.", err)
	}

	// On renvoie directement le duel suivant : un aller-retour au lieu de deux.
	return handleNextMatch(e)
}

func handleReset(e *core.RequestEvent) error {
	userId := e.Auth.Id

	err := e.App.RunInTransaction(func(txApp core.App) error {
		if _, err := txApp.DB().NewQuery(
			"UPDATE watchlists SET elo = {:elo}, matchCount = 0 WHERE user = {:user}",
		).Bind(dbx.Params{"elo": DefaultRating, "user": userId}).Execute(); err != nil {
			return err
		}

		_, err := txApp.DB().NewQuery(
			"DELETE FROM elo_matches WHERE user = {:user}",
		).Bind(dbx.Params{"user": userId}).Execute()

		return err
	})
	if err != nil {
		return router.NewInternalServerError("Impossible de réinitialiser le classement.", err)
	}

	return handleRanking(e)
}

// applyResult écrit la nouvelle note d'une entrée de watchlist et incrémente son
// compteur de duels. SaveNoValidate contourne les règles d'API : c'est
// volontaire, l'appelant a déjà vérifié que l'entrée appartient à l'utilisateur.
//
// La note n'est pas bornée : la plaquer à zéro casserait la somme nulle du
// système, l'un des deux camps ne perdant plus ce que l'autre gagne.
func applyResult(app core.App, entry *core.Record, rating float64) error {
	entry.Set("elo", rating)
	entry.Set("matchCount", entry.GetInt("matchCount")+1)

	return app.SaveNoValidate(entry)
}

func loadState(app core.App, userId string) ([]Entry, Progress, error) {
	entries, err := LoadEntries(app, userId)
	if err != nil {
		return nil, Progress{}, err
	}

	played, err := PlayedPairs(app, userId)
	if err != nil {
		return nil, Progress{}, err
	}

	total, err := TotalMatches(app, userId)
	if err != nil {
		return nil, Progress{}, err
	}

	return entries, BuildProgress(entries, played, total), nil
}

// withRanks numérote un classement déjà trié, ex aequo compris (1, 2, 2, 4).
func withRanks(sorted []Entry) []RankedEntry {
	ranked := make([]RankedEntry, len(sorted))

	for i, entry := range sorted {
		rank := i + 1
		if i > 0 && entry.Elo == sorted[i-1].Elo {
			rank = ranked[i-1].Rank
		}
		ranked[i] = RankedEntry{Entry: entry, Rank: rank}
	}

	return ranked
}

func newRand() *rand.Rand {
	return rand.New(rand.NewSource(time.Now().UnixNano()))
}
