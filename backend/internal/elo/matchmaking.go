package elo

import (
	"math/rand"
	"sort"
)

// candidateWindow est le nombre d'adversaires équivalents parmi lesquels on
// tire au sort. Au-delà de 1 on évite de reproposer toujours le même duel ;
// la fenêtre reste volontairement étroite pour ne pas casser l'équilibrage.
const candidateWindow = 4

// Pair est un duel proposé à l'utilisateur.
type Pair struct {
	A Entry `json:"a"`
	B Entry `json:"b"`
}

// Progress décrit l'avancement du classement.
type Progress struct {
	TotalMatches  int `json:"totalMatches"`
	PlayedPairs   int `json:"playedPairs"`
	PossiblePairs int `json:"possiblePairs"`
	Animes        int `json:"animes"`
	MinMatchCount int `json:"minMatchCount"`
	MaxMatchCount int `json:"maxMatchCount"`
}

// NextPair choisit le prochain duel de façon équilibrée.
//
// L'équilibrage repose sur deux règles :
//
//  1. le premier anime est toujours tiré parmi ceux qui ont le MOINS de duels
//     joués — un anime ne peut donc pas prendre de l'avance sur les autres ;
//  2. l'adversaire est choisi parmi ceux dont le duel n'a jamais été joué, puis
//     parmi les moins sollicités, puis parmi les scores les plus proches (un
//     duel serré est plus informatif qu'un duel joué d'avance).
//
// Conséquence : l'écart entre l'anime le plus vu et le moins vu reste borné,
// et tous les duels distincts sont épuisés avant qu'un seul ne soit rejoué.
func NextPair(entries []Entry, played map[string]int, rnd *rand.Rand) (Pair, bool) {
	if len(entries) < 2 {
		return Pair{}, false
	}

	// 1. Ancre : un anime au minimum de duels joués.
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

	// 2. Classement des adversaires possibles.
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

	// Ne devrait pas arriver : l'index unique (user, anime) garantit des animes
	// distincts. Garde-fou pour ne pas transformer une donnée douteuse en panic.
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

	// 3. Tirage au sort dans le meilleur palier uniquement : on ne pioche que
	//    parmi les adversaires strictement équivalents en (duels rejoués, duels
	//    joués), sinon l'aléatoire dégraderait l'équilibrage.
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

	// L'ancre n'est pas systématiquement affichée à gauche.
	if rnd.Intn(2) == 0 {
		return Pair{A: anchor, B: opponent}, true
	}
	return Pair{A: opponent, B: anchor}, true
}

// BuildProgress résume l'état du classement pour l'affichage.
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

// Rank trie les entrées par score décroissant, puis par nombre de duels et par nom
// pour garantir un ordre stable.
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
