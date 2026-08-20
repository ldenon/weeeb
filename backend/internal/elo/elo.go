// Package elo ranks the animes of a watchlist through head-to-head duels,
// using the Elo rating system.
//
// Every watchlist entry starts at DefaultRating. A duel pits two animes from the
// same user's list against each other: the expected score of each side is derived
// from the gap between their ratings, then each rating is corrected by the gap
// between the actual result and that expectation. Beating a higher-rated anime
// therefore pays a lot, beating a lower-rated one pays very little.
package elo

import "math"

const (
	// DefaultRating is the rating given to an anime when it is added to the watchlist.
	//
	// The exact value has no bearing on the ranking: only the gaps between ratings
	// matter, and shifting everyone by +900 leaves the order untouched. 1000 is the
	// usual convention and leaves enough headroom that an anime losing over and over
	// does not fall below zero, which would display negative points.
	DefaultRating = 1000.0

	// KFactor is the largest rating correction a single duel can produce.
	// The higher it is, the faster the ranking settles, but the more violently it
	// reacts to an isolated result. 32 is the reference value.
	KFactor = 32.0

	// ScaleFactor sets the scale of the gaps: an anime rated ScaleFactor points
	// above another is expected to win about 91% of their duels.
	ScaleFactor = 400.0
)

// Outcome is the result of a duel, from anime A's point of view.
type Outcome string

const (
	OutcomeA    Outcome = "a"    // A wins
	OutcomeB    Outcome = "b"    // B wins
	OutcomeDraw Outcome = "draw" // draw
)

// IsValid reports whether o is a recognised result.
func (o Outcome) IsValid() bool {
	return o == OutcomeA || o == OutcomeB || o == OutcomeDraw
}

// Score returns the duel result for anime A in the Elo convention:
// 1 for a win, 0.5 for a draw, 0 for a loss.
func (o Outcome) Score() float64 {
	switch o {
	case OutcomeA:
		return 1
	case OutcomeB:
		return 0
	default:
		return 0.5
	}
}

// ExpectedScore returns A's expected score against B, between 0 and 1.
//
// At equal ratings it is 0.5. The rating gap is mapped onto the ScaleFactor
// scale through a logistic curve.
func ExpectedScore(ratingA, ratingB float64) float64 {
	return 1 / (1 + math.Pow(10, (ratingB-ratingA)/ScaleFactor))
}

// NewRatings returns the ratings of A and B after a duel.
//
// The system is zero-sum: whatever one side gains, the other loses exactly,
// because both the scores and the expected scores of the two sides sum to 1.
func NewRatings(ratingA, ratingB float64, outcome Outcome) (float64, float64) {
	expectedA := ExpectedScore(ratingA, ratingB)
	scoreA := outcome.Score()

	delta := KFactor * (scoreA - expectedA)

	return ratingA + delta, ratingB - delta
}

// PairKey builds the stable identifier of a duel, independent of the order in
// which the two animes are displayed.
func PairKey(animeA, animeB string) string {
	if animeA > animeB {
		animeA, animeB = animeB, animeA
	}
	return animeA + ":" + animeB
}
