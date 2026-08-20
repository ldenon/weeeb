import type { WatchlistStatus } from "@/types";

export const statusTranslations = {
	completed: {
		fr: "Terminé",
	},
	ongoing: {
		fr: "En cours",
	},
	dropped: {
		fr: "Inachevé",
	},
	planned: {
		fr: "Prévu",
	},
};

/** Pluralises a word according to a count, e.g. plural(1, "duel") -> "duel". */
export const plural = (count: number, singular: string, suffix = "s") =>
	count > 1 ? `${singular}${suffix}` : singular;

/**
 * Statuses eligible for the duel ranking.
 *
 * A planned anime has not been watched, so its owner has nothing to say about
 * it. The server enforces the same rule; this is only to keep the interface
 * consistent with what the ranking will actually contain.
 */
export const RANKABLE_STATUSES: Array<WatchlistStatus> = [
	"completed",
	"ongoing",
	"dropped",
];

export const isRankable = (status: WatchlistStatus) =>
	RANKABLE_STATUSES.includes(status);
