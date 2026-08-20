package elo

import (
	"math/rand"
	"sort"
)

// candidateWindow is how many equivalent opponents we draw at random from.
// Above 1 it avoids proposing the same duel over and over; the window stays
// deliberately narrow so as not to break the balancing.
const candidateWindow = 4

// Pair is a duel proposed to the user.
type Pair struct {
	A Entry `json:"a"`
	B Entry `json:"b"`
}

// Progress describes how far along the ranking is.
type Progress struct {
	TotalMatches  int `json:"totalMatches"`
	PlayedPairs   int `json:"playedPairs"`
	PossiblePairs int `json:"possiblePairs"`
	Animes        int `json:"animes"`
	MinMatchCount int `json:"minMatchCount"`
	MaxMatchCount int `json:"maxMatchCount"`
}

// NextPair picks the next duel in a balanced way.
//
// The balancing rests on two rules:
//
//  1. the first anime is always drawn among those with the FEWEST duels played,
//     so no anime can pull ahead of the others;
//  2. the opponent is chosen among those whose duel has never been played, then
//     among the least used, then among the closest ratings (a tight duel is more
//     informative than a foregone conclusion).
//
// As a result, the gap between the most and least seen anime stays bounded, and
// every distinct duel is exhausted before a single one is replayed.
func NextPair(entries []Entry, played map[string]int, rnd *rand.Rand) (Pair, bool) {
	if len(entries) < 2 {
		return Pair{}, false
	}

	// 1. Anchor: an anime with the fewest duels played.
	minCount := entries[0].MatchCount
	for _, e := range entries {
		if e.MatchCount < minCount {
			minCount = e.MatchCount
		}
	}

	anchors := make([]Entry, 0, len(entries))
	for _, e := range entries {
		if e.MatchCount == minCount {
			anchors = append(anchors, e)
		}
	}
	anchor := anchors[rnd.Intn(len(anchors))]

	// 2. Rank the possible opponents.
	type candidate struct {
		entry   Entry
		replays int
		count   int
		eloDist int
	}

	candidates := make([]candidate, 0, len(entries)-1)
	for _, e := range entries {
		if e.AnimeId == anchor.AnimeId {
			continue
		}
		candidates = append(candidates, candidate{
			entry:   e,
			replays: played[PairKey(anchor.AnimeId, e.AnimeId)],
			count:   e.MatchCount,
			eloDist: abs(e.Elo - anchor.Elo),
		})
	}

	// Should not happen: the unique (user, anime) index guarantees distinct animes.
	// Guard rail so that questionable data does not turn into a panic.
	if len(candidates) == 0 {
		return Pair{}, false
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].replays != candidates[j].replays {
			return candidates[i].replays < candidates[j].replays
		}
		if candidates[i].count != candidates[j].count {
			return candidates[i].count < candidates[j].count
		}
		return candidates[i].eloDist < candidates[j].eloDist
	})

	// 3. Draw at random within the best tier only: we pick solely among opponents
	//    strictly equivalent in (duels replayed, duels played), otherwise the
	//    randomness would degrade the balancing.
	best := candidates[0]
	tier := 0
	for tier < len(candidates) &&
		candidates[tier].replays == best.replays &&
		candidates[tier].count == best.count {
		tier++
	}
	if tier > candidateWindow {
		tier = candidateWindow
	}

	opponent := candidates[rnd.Intn(tier)].entry

	// The anchor is not always the one displayed on the left.
	if rnd.Intn(2) == 0 {
		return Pair{A: anchor, B: opponent}, true
	}
	return Pair{A: opponent, B: anchor}, true
}

// BuildProgress summarises the state of the ranking for display.
func BuildProgress(entries []Entry, played map[string]int, totalMatches int) Progress {
	n := len(entries)

	p := Progress{
		TotalMatches:  totalMatches,
		PlayedPairs:   len(played),
		PossiblePairs: n * (n - 1) / 2,
		Animes:        n,
	}

	if n == 0 {
		return p
	}

	p.MinMatchCount = entries[0].MatchCount
	p.MaxMatchCount = entries[0].MatchCount
	for _, e := range entries {
		if e.MatchCount < p.MinMatchCount {
			p.MinMatchCount = e.MatchCount
		}
		if e.MatchCount > p.MaxMatchCount {
			p.MaxMatchCount = e.MatchCount
		}
	}

	return p
}

// Rank sorts the entries by descending rating, then by duel count and name to
// guarantee a stable order.
func Rank(entries []Entry) []Entry {
	ranked := make([]Entry, len(entries))
	copy(ranked, entries)

	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].Elo != ranked[j].Elo {
			return ranked[i].Elo > ranked[j].Elo
		}
		if ranked[i].MatchCount != ranked[j].MatchCount {
			return ranked[i].MatchCount > ranked[j].MatchCount
		}
		return ranked[i].Name < ranked[j].Name
	})

	return ranked
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
