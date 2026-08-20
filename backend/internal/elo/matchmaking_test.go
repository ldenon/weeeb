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

// simulate joue nbMatches duels et retourne l'état final.
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
			t.Fatalf("aucun duel proposé au tour %d", i)
		}

		a, b := byId[pair.A.AnimeId], byId[pair.B.AnimeId]
		if a.AnimeId == b.AnimeId {
			t.Fatalf("duel d'un anime contre lui-même: %s", a.AnimeId)
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

// --- calcul Elo --------------------------------------------------------

func TestExpectedScoreIsEvenBetweenEqualRatings(t *testing.T) {
	if got := ExpectedScore(1000, 1000); math.Abs(got-0.5) > epsilon {
		t.Errorf("score attendu %v au lieu de 0,5 à notes égales", got)
	}
}

func TestExpectedScoresSumToOne(t *testing.T) {
	cases := [][2]float64{{1000, 1000}, {1200, 800}, {950, 1310}, {0, 2000}}

	for _, c := range cases {
		sum := ExpectedScore(c[0], c[1]) + ExpectedScore(c[1], c[0])
		if math.Abs(sum-1) > epsilon {
			t.Errorf("notes %v: les scores attendus somment à %v au lieu de 1", c, sum)
		}
	}
}

// Un écart d'une fois l'échelle vaut environ 91% de chances de l'emporter.
func TestExpectedScoreAtOneScaleFactor(t *testing.T) {
	got := ExpectedScore(DefaultRating+ScaleFactor, DefaultRating)

	if math.Abs(got-0.9090909) > 1e-6 {
		t.Errorf("score attendu %v au lieu de ~0,909 pour un écart de %v", got, ScaleFactor)
	}
}

// Ce que l'un gagne, l'autre le perd : le total des notes ne bouge jamais.
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
			t.Errorf("notes %v/%v (%s): total %v au lieu de %v",
				c.a, c.b, c.outcome, newA+newB, c.a+c.b)
		}
	}
}

func TestWinnerGainsAndLoserLoses(t *testing.T) {
	newA, newB := NewRatings(1000, 1000, OutcomeA)

	if newA <= 1000 {
		t.Errorf("le vainqueur passe de 1000 à %v", newA)
	}
	if newB >= 1000 {
		t.Errorf("le perdant passe de 1000 à %v", newB)
	}
}

// Un match nul entre deux animes de même note ne déplace rien.
func TestDrawBetweenEqualsChangesNothing(t *testing.T) {
	newA, newB := NewRatings(1000, 1000, OutcomeDraw)

	if math.Abs(newA-1000) > epsilon || math.Abs(newB-1000) > epsilon {
		t.Errorf("match nul à notes égales: %v et %v au lieu de 1000", newA, newB)
	}
}

// Un match nul face à un anime mieux noté fait tout de même monter l'outsider.
func TestDrawFavoursTheUnderdog(t *testing.T) {
	underdog, favourite := NewRatings(800, 1200, OutcomeDraw)

	if underdog <= 800 {
		t.Errorf("l'outsider passe de 800 à %v après un nul", underdog)
	}
	if favourite >= 1200 {
		t.Errorf("le favori passe de 1200 à %v après un nul", favourite)
	}
}

// C'est tout l'intérêt du système : battre plus fort que soi rapporte davantage.
func TestUpsetGainsMoreThanExpectedWin(t *testing.T) {
	upset, _ := NewRatings(800, 1200, OutcomeA)
	expected, _ := NewRatings(1200, 800, OutcomeA)

	upsetGain := upset - 800
	expectedGain := expected - 1200

	if upsetGain <= expectedGain {
		t.Errorf("victoire surprise: +%v, victoire attendue: +%v", upsetGain, expectedGain)
	}
}

// Aucune correction ne peut dépasser le facteur K.
func TestRatingChangeNeverExceedsK(t *testing.T) {
	ratings := []float64{0, 500, 1000, 1500, 3000}
	outcomes := []Outcome{OutcomeA, OutcomeB, OutcomeDraw}

	for _, a := range ratings {
		for _, b := range ratings {
			for _, outcome := range outcomes {
				newA, _ := NewRatings(a, b, outcome)

				if change := math.Abs(newA - a); change > KFactor+epsilon {
					t.Errorf("notes %v/%v (%s): correction de %v > K=%v",
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
			t.Errorf("%s: score %v au lieu de %v", c.outcome, got, c.want)
		}
	}
}

// --- appariement -------------------------------------------------------

// L'écart entre l'anime le plus sollicité et le moins sollicité doit rester
// négligeable, quel que soit le nombre de duels joués.
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

			// Un duel incrémente deux animes à la fois : un écart de 1 est
			// structurellement inévitable, au-delà l'équilibrage a échoué.
			if spread := max - min; spread > 2 {
				t.Errorf("n=%d rounds=%d: écart de %d duels (min=%d max=%d)",
					n, rounds, spread, min, max)
			}
		}
	}
}

// Tous les duels distincts doivent être épuisés avant qu'un seul ne soit rejoué.
func TestNextPairExhaustsDistinctPairsFirst(t *testing.T) {
	const n = 8
	possible := n * (n - 1) / 2

	_, played := simulate(t, n, possible, 42)

	if len(played) != possible {
		t.Fatalf("%d duels distincts sur %d attendus", len(played), possible)
	}

	for key, count := range played {
		if count != 1 {
			t.Errorf("duel %s rejoué %d fois avant épuisement des duels inédits", key, count)
		}
	}
}

// Au-delà du tour complet, les rejeux doivent rester répartis uniformément.
func TestNextPairSpreadsReplaysEvenly(t *testing.T) {
	const n = 6
	possible := n * (n - 1) / 2

	_, played := simulate(t, n, possible*3, 7)

	for key, count := range played {
		if count < 2 || count > 4 {
			t.Errorf("duel %s joué %d fois, attendu ~3", key, count)
		}
	}
}

func TestNextPairNeedsTwoAnimes(t *testing.T) {
	if _, ok := NextPair(buildEntries(1), map[string]int{}, rand.New(rand.NewSource(1))); ok {
		t.Error("un duel a été proposé avec un seul anime en liste")
	}
	if _, ok := NextPair(nil, map[string]int{}, rand.New(rand.NewSource(1))); ok {
		t.Error("un duel a été proposé avec une liste vide")
	}
}

// Le classement doit refléter les préférences : un anime toujours vainqueur
// termine premier, un anime toujours battu termine dernier.
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
		t.Errorf("premier du classement: %s au lieu de %s", ranked[0].AnimeId, best)
	}
	if ranked[len(ranked)-1].AnimeId != worst {
		t.Errorf("dernier du classement: %s au lieu de %s",
			ranked[len(ranked)-1].AnimeId, worst)
	}
}

func TestPairKeyIsOrderIndependent(t *testing.T) {
	if PairKey("xyz", "abc") != PairKey("abc", "xyz") {
		t.Error("la clé de duel dépend de l'ordre des animes")
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
			t.Errorf("position %d: rang %d au lieu de %d", i, ranked[i].Rank, w)
		}
	}
}
