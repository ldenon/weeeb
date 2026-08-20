package elo

import (
	"fmt"
	"math"
	"math/rand"
	"testing"
)

const epsilon = 1e-9

func buildEntries(n int) []Entry {
	entries := make([]Entry, n)
	for i := range entries {
		entries[i] = Entry{
			WatchlistId: fmt.Sprintf("w%03d", i),
			AnimeId:     fmt.Sprintf("a%03d", i),
			Name:        fmt.Sprintf("Anime %03d", i),
			Elo:         int(math.Round(DefaultRating)),
		}
	}
	return entries
}

// simulate plays nbMatches duels and returns the final state.
func simulate(t *testing.T, n, nbMatches int, seed int64) ([]Entry, map[string]int) {
	t.Helper()

	entries := buildEntries(n)
	played := map[string]int{}
	rnd := rand.New(rand.NewSource(seed))

	byId := map[string]*Entry{}
	ratings := map[string]float64{}
	for i := range entries {
		byId[entries[i].AnimeId] = &entries[i]
		ratings[entries[i].AnimeId] = DefaultRating
	}

	for i := 0; i < nbMatches; i++ {
		pair, ok := NextPair(entries, played, rnd)
		if !ok {
			t.Fatalf("no duel proposed on round %d", i)
		}

		a, b := byId[pair.A.AnimeId], byId[pair.B.AnimeId]
		if a.AnimeId == b.AnimeId {
			t.Fatalf("anime duelling itself: %s", a.AnimeId)
		}

		outcome := []Outcome{OutcomeA, OutcomeB, OutcomeDraw}[rnd.Intn(3)]

		ratings[a.AnimeId], ratings[b.AnimeId] = NewRatings(
			ratings[a.AnimeId], ratings[b.AnimeId], outcome,
		)
		a.Elo = int(math.Round(ratings[a.AnimeId]))
		b.Elo = int(math.Round(ratings[b.AnimeId]))

		a.MatchCount++
		b.MatchCount++
		played[PairKey(a.AnimeId, b.AnimeId)]++
	}

	return entries, played
}

// --- Elo calculation ---------------------------------------------------

func TestExpectedScoreIsEvenBetweenEqualRatings(t *testing.T) {
	if got := ExpectedScore(1000, 1000); math.Abs(got-0.5) > epsilon {
		t.Errorf("expected score %v instead of 0.5 at equal ratings", got)
	}
}

func TestExpectedScoresSumToOne(t *testing.T) {
	cases := [][2]float64{{1000, 1000}, {1200, 800}, {950, 1310}, {0, 2000}}

	for _, c := range cases {
		sum := ExpectedScore(c[0], c[1]) + ExpectedScore(c[1], c[0])
		if math.Abs(sum-1) > epsilon {
			t.Errorf("ratings %v: expected scores sum to %v instead of 1", c, sum)
		}
	}
}

// A gap of one scale factor is worth roughly a 91% chance of winning.
func TestExpectedScoreAtOneScaleFactor(t *testing.T) {
	got := ExpectedScore(DefaultRating+ScaleFactor, DefaultRating)

	if math.Abs(got-0.9090909) > 1e-6 {
		t.Errorf("expected score %v instead of ~0.909 for a gap of %v", got, ScaleFactor)
	}
}

// Whatever one side gains the other loses: the rating total never moves.
func TestNewRatingsIsZeroSum(t *testing.T) {
	cases := []struct {
		a, b    float64
		outcome Outcome
	}{
		{1000, 1000, OutcomeA},
		{1000, 1000, OutcomeDraw},
		{1400, 900, OutcomeB},
		{820, 1180, OutcomeA},
		{1000, 1000, OutcomeB},
	}

	for _, c := range cases {
		newA, newB := NewRatings(c.a, c.b, c.outcome)

		if math.Abs((newA+newB)-(c.a+c.b)) > epsilon {
			t.Errorf("ratings %v/%v (%s): total %v instead of %v",
				c.a, c.b, c.outcome, newA+newB, c.a+c.b)
		}
	}
}

func TestWinnerGainsAndLoserLoses(t *testing.T) {
	newA, newB := NewRatings(1000, 1000, OutcomeA)

	if newA <= 1000 {
		t.Errorf("winner goes from 1000 to %v", newA)
	}
	if newB >= 1000 {
		t.Errorf("loser goes from 1000 to %v", newB)
	}
}

// A draw between two animes of equal rating moves nothing.
func TestDrawBetweenEqualsChangesNothing(t *testing.T) {
	newA, newB := NewRatings(1000, 1000, OutcomeDraw)

	if math.Abs(newA-1000) > epsilon || math.Abs(newB-1000) > epsilon {
		t.Errorf("draw at equal ratings: %v and %v instead of 1000", newA, newB)
	}
}

// A draw against a higher-rated anime still lifts the underdog.
func TestDrawFavoursTheUnderdog(t *testing.T) {
	underdog, favourite := NewRatings(800, 1200, OutcomeDraw)

	if underdog <= 800 {
		t.Errorf("underdog goes from 800 to %v after a draw", underdog)
	}
	if favourite >= 1200 {
		t.Errorf("favourite goes from 1200 to %v after a draw", favourite)
	}
}

// This is the whole point of the system: beating someone stronger pays more.
func TestUpsetGainsMoreThanExpectedWin(t *testing.T) {
	upset, _ := NewRatings(800, 1200, OutcomeA)
	expected, _ := NewRatings(1200, 800, OutcomeA)

	upsetGain := upset - 800
	expectedGain := expected - 1200

	if upsetGain <= expectedGain {
		t.Errorf("upset win: +%v, expected win: +%v", upsetGain, expectedGain)
	}
}

// No correction may exceed the K factor.
func TestRatingChangeNeverExceedsK(t *testing.T) {
	ratings := []float64{0, 500, 1000, 1500, 3000}
	outcomes := []Outcome{OutcomeA, OutcomeB, OutcomeDraw}

	for _, a := range ratings {
		for _, b := range ratings {
			for _, outcome := range outcomes {
				newA, _ := NewRatings(a, b, outcome)

				if change := math.Abs(newA - a); change > KFactor+epsilon {
					t.Errorf("ratings %v/%v (%s): correction of %v > K=%v",
						a, b, outcome, change, KFactor)
				}
			}
		}
	}
}

func TestOutcomeScores(t *testing.T) {
	cases := []struct {
		outcome Outcome
		want    float64
	}{
		{OutcomeA, 1},
		{OutcomeB, 0},
		{OutcomeDraw, 0.5},
	}

	for _, c := range cases {
		if got := c.outcome.Score(); got != c.want {
			t.Errorf("%s: score %v instead of %v", c.outcome, got, c.want)
		}
	}
}

// --- matchmaking -------------------------------------------------------

// The gap between the most and least used anime must stay negligible, whatever
// the number of duels played.
func TestNextPairKeepsMatchCountsBalanced(t *testing.T) {
	for _, n := range []int{2, 3, 5, 12, 40} {
		for _, rounds := range []int{n, n * 5, n * 20} {
			entries, _ := simulate(t, n, rounds, int64(n*1000+rounds))

			min, max := entries[0].MatchCount, entries[0].MatchCount
			for _, e := range entries {
				if e.MatchCount < min {
					min = e.MatchCount
				}
				if e.MatchCount > max {
					max = e.MatchCount
				}
			}

			// A duel increments two animes at once, so a gap of 1 is structurally
			// unavoidable; beyond that the balancing has failed.
			if spread := max - min; spread > 2 {
				t.Errorf("n=%d rounds=%d: gap of %d duels (min=%d max=%d)",
					n, rounds, spread, min, max)
			}
		}
	}
}

// Every distinct duel must be exhausted before a single one is replayed.
func TestNextPairExhaustsDistinctPairsFirst(t *testing.T) {
	const n = 8
	possible := n * (n - 1) / 2

	_, played := simulate(t, n, possible, 42)

	if len(played) != possible {
		t.Fatalf("%d distinct duels out of the %d expected", len(played), possible)
	}

	for key, count := range played {
		if count != 1 {
			t.Errorf("duel %s replayed %d times before unseen duels ran out", key, count)
		}
	}
}

// Past a full round, replays must stay evenly spread.
func TestNextPairSpreadsReplaysEvenly(t *testing.T) {
	const n = 6
	possible := n * (n - 1) / 2

	_, played := simulate(t, n, possible*3, 7)

	for key, count := range played {
		if count < 2 || count > 4 {
			t.Errorf("duel %s played %d times, expected ~3", key, count)
		}
	}
}

func TestNextPairNeedsTwoAnimes(t *testing.T) {
	if _, ok := NextPair(buildEntries(1), map[string]int{}, rand.New(rand.NewSource(1))); ok {
		t.Error("a duel was proposed with a single anime in the list")
	}
	if _, ok := NextPair(nil, map[string]int{}, rand.New(rand.NewSource(1))); ok {
		t.Error("a duel was proposed with an empty list")
	}
}

// The ranking must reflect the preferences: an anime that always wins ends up
// first, one that always loses ends up last.
func TestRankingConvergesOnConsistentPreferences(t *testing.T) {
	entries := buildEntries(6)
	ratings := map[string]float64{}
	for _, e := range entries {
		ratings[e.AnimeId] = DefaultRating
	}

	best, worst := entries[0].AnimeId, entries[5].AnimeId
	played := map[string]int{}
	rnd := rand.New(rand.NewSource(3))

	for i := 0; i < 120; i++ {
		pair, _ := NextPair(entries, played, rnd)
		a, b := pair.A.AnimeId, pair.B.AnimeId

		outcome := OutcomeDraw
		switch {
		case a == best || b == worst:
			outcome = OutcomeA
		case b == best || a == worst:
			outcome = OutcomeB
		}

		ratings[a], ratings[b] = NewRatings(ratings[a], ratings[b], outcome)
		played[PairKey(a, b)]++

		for i := range entries {
			entries[i].Elo = int(math.Round(ratings[entries[i].AnimeId]))
			if entries[i].AnimeId == a || entries[i].AnimeId == b {
				entries[i].MatchCount++
			}
		}
	}

	ranked := Rank(entries)
	if ranked[0].AnimeId != best {
		t.Errorf("top of the ranking: %s instead of %s", ranked[0].AnimeId, best)
	}
	if ranked[len(ranked)-1].AnimeId != worst {
		t.Errorf("bottom of the ranking: %s instead of %s",
			ranked[len(ranked)-1].AnimeId, worst)
	}
}

func TestPairKeyIsOrderIndependent(t *testing.T) {
	if PairKey("xyz", "abc") != PairKey("abc", "xyz") {
		t.Error("the duel key depends on the order of the animes")
	}
}

func TestWithRanksHandlesTies(t *testing.T) {
	ranked := withRanks(Rank([]Entry{
		{AnimeId: "a", Name: "A", Elo: 1050},
		{AnimeId: "b", Name: "B", Elo: 1000},
		{AnimeId: "c", Name: "C", Elo: 1000},
		{AnimeId: "d", Name: "D", Elo: 980},
	}))

	want := []int{1, 2, 2, 4}
	for i, w := range want {
		if ranked[i].Rank != w {
			t.Errorf("position %d: rank %d instead of %d", i, ranked[i].Rank, w)
		}
	}
}
