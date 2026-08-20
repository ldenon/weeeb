package elo

import (
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Entry est une entrée de watchlist enrichie des métadonnées de l'anime.
// La note est arrondie dès la lecture : elle est stockée en flottant pour ne pas
// accumuler d'erreur au fil des duels, mais affichée et départagée en entier.
//
// Les tags `db` sont obligatoires : sans eux dbx dérive le nom de colonne en
// snake_case (AnimeId -> anime_id) et les champs composés restent vides.
type Entry struct {
	WatchlistId string `db:"watchlistId" json:"watchlistId"`
	AnimeId     string `db:"animeId" json:"animeId"`
	Name        string `db:"name" json:"name"`
	Img         string `db:"img" json:"img"`
	Status      string `db:"status" json:"status"`
	Elo         int    `db:"elo" json:"elo"`
	MatchCount  int    `db:"matchCount" json:"matchCount"`
}

// LoadEntries retourne toute la watchlist de l'utilisateur, animes joints.
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
		OrderBy("a.name ASC").
		Bind(dbx.Params{"defaultElo": DefaultRating}).
		All(&entries)
	if err != nil {
		return nil, fmt.Errorf("lecture de la watchlist: %w", err)
	}

	return entries, nil
}

// PlayedPairs compte, par clé de duel, le nombre de fois qu'un duel a déjà été
// arbitré par l'utilisateur.
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
		return nil, fmt.Errorf("lecture de l'historique des duels: %w", err)
	}

	played := make(map[string]int, len(rows))
	for _, r := range rows {
		played[r.PairKey] = r.Total
	}

	return played, nil
}

// TotalMatches retourne le nombre de duels arbitrés par l'utilisateur.
func TotalMatches(app core.App, userId string) (int, error) {
	var total int

	err := app.DB().
		Select("COUNT(*)").
		From("elo_matches").
		Where(dbx.HashExp{"user": userId}).
		Row(&total)
	if err != nil {
		return 0, fmt.Errorf("comptage des duels: %w", err)
	}

	return total, nil
}

// RatingOf retourne la note stockée d'une entrée de watchlist, en retombant sur
// la note de départ si le champ n'a jamais été renseigné.
func RatingOf(entry *core.Record) float64 {
	rating := entry.GetFloat("elo")
	if rating == 0 {
		return DefaultRating
	}

	return rating
}

// FindWatchlistEntry retourne l'entrée de watchlist de l'utilisateur pour un anime.
func FindWatchlistEntry(app core.App, userId, animeId string) (*core.Record, error) {
	return app.FindFirstRecordByFilter(
		"watchlists",
		"user = {:user} && anime = {:anime}",
		dbx.Params{"user": userId, "anime": animeId},
	)
}
