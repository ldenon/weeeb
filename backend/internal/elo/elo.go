// Package elo implémente le classement par duels des animes d'une watchlist,
// avec le système de notation Elo.
//
// Chaque entrée de watchlist démarre à DefaultRating. Un duel oppose deux animes
// de la liste d'un même utilisateur : le score attendu de chacun est déduit de
// l'écart entre leurs notes, puis chaque note est corrigée de l'écart entre le
// résultat réel et ce score attendu. Battre un anime mieux noté rapporte donc
// beaucoup, battre un anime moins bien noté rapporte peu.
package elo

import "math"

const (
	// DefaultRating est la note attribuée à un anime lors de son ajout à la watchlist.
	//
	// La valeur exacte n'a aucune influence sur le classement : seuls les écarts
	// entre notes comptent, tout décaler de +900 ne change rien à l'ordre. 1000 est
	// la convention usuelle et laisse assez de marge pour qu'un anime battu en
	// boucle ne descende pas sous zéro, ce qui afficherait des points négatifs.
	DefaultRating = 1000.0

	// KFactor est l'amplitude maximale d'une correction de note après un duel.
	// Plus il est élevé, plus le classement se stabilise vite mais réagit
	// brutalement à un résultat isolé. 32 est la valeur de référence.
	KFactor = 32.0

	// ScaleFactor fixe l'échelle des écarts : un anime noté ScaleFactor points
	// au-dessus d'un autre est attendu vainqueur dans ~91% des duels.
	ScaleFactor = 400.0
)

// Outcome est le résultat d'un duel, du point de vue de l'anime A.
type Outcome string

const (
	OutcomeA    Outcome = "a"    // A gagne
	OutcomeB    Outcome = "b"    // B gagne
	OutcomeDraw Outcome = "draw" // match nul
)

// IsValid indique si o est un résultat reconnu.
func (o Outcome) IsValid() bool {
	return o == OutcomeA || o == OutcomeB || o == OutcomeDraw
}

// Score retourne le résultat du duel pour l'anime A, dans la convention Elo :
// 1 pour une victoire, 0,5 pour un match nul, 0 pour une défaite.
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

// ExpectedScore retourne le score attendu de A face à B, entre 0 et 1.
//
// À notes égales il vaut 0,5. L'écart de notes est ramené à l'échelle
// ScaleFactor par une courbe logistique.
func ExpectedScore(ratingA, ratingB float64) float64 {
	return 1 / (1 + math.Pow(10, (ratingB-ratingA)/ScaleFactor))
}

// NewRatings retourne les notes de A et de B après un duel.
//
// Le système est à somme nulle : ce que l'un gagne, l'autre le perd exactement,
// puisque les scores comme les scores attendus des deux camps somment à 1.
func NewRatings(ratingA, ratingB float64, outcome Outcome) (float64, float64) {
	expectedA := ExpectedScore(ratingA, ratingB)
	scoreA := outcome.Score()

	delta := KFactor * (scoreA - expectedA)

	return ratingA + delta, ratingB - delta
}

// PairKey construit l'identifiant stable d'un duel, indépendant de l'ordre
// d'affichage des deux animes.
func PairKey(animeA, animeB string) string {
	if animeA > animeB {
		animeA, animeB = animeB, animeA
	}
	return animeA + ":" + animeB
}
