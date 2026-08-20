import type { RecordModel } from "pocketbase";

export type WatchlistStatus = "completed" | "ongoing" | "dropped" | "planned";

export interface GenreRecord extends RecordModel {
	name: string;
}

export interface UserRecord extends RecordModel {
	name: string;
	avatar: string;
}

export interface AnimeRecord extends RecordModel {
	name: string;
	synopsis: string;
	img: string;
	genres: Array<string>;
	expand?: {
		genres?: Array<GenreRecord>;
	};
}

export interface WatchlistRecord extends RecordModel {
	anime: string;
	user: string;
	status: WatchlistStatus;
	isMasterclass: boolean;
	/** Note Elo brute. Pilotée par /api/weeeb/ranking, en lecture seule côté client. */
	elo: number;
	/** Piloté par /api/weeeb/ranking, en lecture seule côté client. */
	matchCount: number;
	expand?: {
		anime?: AnimeRecord;
		user?: UserRecord;
	};
}

export interface CommentRecord extends RecordModel {
	author: string;
	anime: string;
	content: string;
	isPrivate: boolean;
	expand?: {
		author?: UserRecord;
	};
}

/** Un anime de la watchlist tel que renvoyé par /api/weeeb/ranking. */
export interface EloEntry {
	watchlistId: string;
	animeId: string;
	name: string;
	img: string;
	status: WatchlistStatus;
	/** Note Elo, déjà arrondie à l'entier par le serveur. */
	elo: number;
	matchCount: number;
}

export interface RankedEntry extends EloEntry {
	rank: number;
}

export interface RankingProgress {
	totalMatches: number;
	playedPairs: number;
	possiblePairs: number;
	animes: number;
	minMatchCount: number;
	maxMatchCount: number;
}

export interface MatchPair {
	a: EloEntry;
	b: EloEntry;
}

export interface RankingResponse {
	ranking: Array<RankedEntry>;
	progress: RankingProgress;
}

export interface MatchResponse {
	/** null quand la watchlist compte moins de deux animes. */
	pair: MatchPair | null;
	progress: RankingProgress;
}

export type MatchOutcome = "a" | "b" | "draw";
