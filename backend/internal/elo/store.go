package elo

import (
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Entry is a watchlist entry enriched with the anime's metadata.
// The rating is rounded as soon as it is read: it is stored as a float so that no
// error accumulates over successive duels, but displayed and tie-broken as an integer.
//
// The `db` tags are mandatory: without them dbx derives the column name in
// snake_case (AnimeId -> anime_id) and the compound fields stay empty.
type Entry struct {
	WatchlistId string `db:"watchlistId" json:"watchlistId"`
	AnimeId     string `db:"animeId" json:"animeId"`
	Name        string `db:"name" json:"name"`
	Img         string `db:"img" json:"img"`
	Status      string `db:"status" json:"status"`
	Elo         int    `db:"elo" json:"elo"`
	MatchCount  int    `db:"matchCount" json:"matchCount"`
}

// LoadEntries returns the rankable part of the user's watchlist, with the animes
// joined in. Planned animes are filtered out here rather than at the call sites,
// so the ranking, the matchmaking and the progress counters all agree.
func LoadEntries(app core.App, userId string) ([]Entry, error) {
	entries := []Entry{}

	err := app.DB().
		Select(
			"w.id as watchlistId",
			"w.anime as animeId",
			"w.status as status",
			"CAST(ROUND(COALESCE(w.elo, {:defaultElo})) AS INTEGER) as elo",
			"COALESCE(w.matchCount, 0) as matchCount",
			"a.name as name",
			"a.img as img",
		).
		From("watchlists w").
		InnerJoin("animes a", dbx.NewExp("a.id = w.anime")).
		Where(dbx.HashExp{"w.user": userId}).
		AndWhere(dbx.In("w.status", rankableStatusValues()...)).
		OrderBy("a.name ASC").
		Bind(dbx.Params{"defaultElo": DefaultRating}).
		All(&entries)
	if err != nil {
		return nil, fmt.Errorf("reading the watchlist: %w", err)
	}

	return entries, nil
}

// PlayedPairs counts, per duel key, how many times the user has already
// settled that duel.
func PlayedPairs(app core.App, userId string) (map[string]int, error) {
	var rows []struct {
		PairKey string `db:"pairKey"`
		Total   int    `db:"total"`
	}

	err := app.DB().
		Select("pairKey as pairKey", "COUNT(*) as total").
		From("elo_matches").
		Where(dbx.HashExp{"user": userId}).
		GroupBy("pairKey").
		All(&rows)
	if err != nil {
		return nil, fmt.Errorf("reading the duel history: %w", err)
	}

	played := make(map[string]int, len(rows))
	for _, r := range rows {
		played[r.PairKey] = r.Total
	}

	return played, nil
}

// TotalMatches returns the number of duels settled by the user.
func TotalMatches(app core.App, userId string) (int, error) {
	var total int

	err := app.DB().
		Select("COUNT(*)").
		From("elo_matches").
		Where(dbx.HashExp{"user": userId}).
		Row(&total)
	if err != nil {
		return 0, fmt.Errorf("counting the duels: %w", err)
	}

	return total, nil
}

// rankableStatusValues adapts RankableStatuses to the variadic any signature
// that dbx.In expects.
func rankableStatusValues() []any {
	values := make([]any, len(RankableStatuses))
	for i, status := range RankableStatuses {
		values[i] = status
	}

	return values
}

// RatingOf returns the stored rating of a watchlist entry, falling back to the
// starting rating if the field was never set.
func RatingOf(entry *core.Record) float64 {
	rating := entry.GetFloat("elo")
	if rating == 0 {
		return DefaultRating
	}

	return rating
}

// FindWatchlistEntry returns the user's watchlist entry for a given anime.
func FindWatchlistEntry(app core.App, userId, animeId string) (*core.Record, error) {
	return app.FindFirstRecordByFilter(
		"watchlists",
		"user = {:user} && anime = {:anime}",
		dbx.Params{"user": userId, "anime": animeId},
	)
}
