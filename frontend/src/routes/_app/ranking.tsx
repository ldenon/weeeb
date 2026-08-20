import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useNextMatch from "@/hooks/useNextMatch";
import useRanking from "@/hooks/useRanking";
import useResetRanking from "@/hooks/useResetRanking";
import useSubmitMatch from "@/hooks/useSubmitMatch";
import type {
	EloEntry,
	MatchOutcome,
	RankedEntry,
	RankingProgress,
} from "@/types";
import { plural, statusTranslations } from "@/utils/anime";

export const Route = createFileRoute("/_app/ranking")({
	component: RouteComponent,
});

type Tab = "duel" | "classement";

function RouteComponent() {
	const [tab, setTab] = useState<Tab>("duel");

	const { data: match, isLoading: isMatchLoading } = useNextMatch();
	const { data: ranking, isLoading: isRankingLoading } = useRanking();
	const submitMatch = useSubmitMatch();
	const resetRanking = useResetRanking();

	const pair = match?.pair ?? null;
	const progress = ranking?.progress ?? match?.progress;

	const vote = useCallback(
		(outcome: MatchOutcome) => {
			if (!pair || submitMatch.isPending) return;

			submitMatch.mutate({
				animeA: pair.a.animeId,
				animeB: pair.b.animeId,
				outcome,
			});
		},
		[pair, submitMatch],
	);

	// Settling a long run with the mouse is tedious: the arrow keys pick a winner
	// and the space bar calls a draw.
	useEffect(() => {
		if (tab !== "duel") return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowLeft") vote("a");
			else if (event.key === "ArrowRight") vote("b");
			else if (event.key === " ") {
				event.preventDefault();
				vote("draw");
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [tab, vote]);

	const isLoading = isMatchLoading || isRankingLoading;

	return (
		<div className="mt-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-text text-xl uppercase font-semibold">
					Classement
				</h1>

				<div className="flex gap-2">
					<TabButton
						active={tab === "duel"}
						onClick={() => setTab("duel")}
						icon={<Swords size={16} />}
						label="Duel"
					/>
					<TabButton
						active={tab === "classement"}
						onClick={() => setTab("classement")}
						icon={<Trophy size={16} />}
						label="Classement"
					/>
				</div>
			</div>

			{progress && <ProgressBar progress={progress} />}

			{isLoading && <p className="text-text-secondary mt-12">Chargement…</p>}

			{!isLoading && !pair && (
				<div className="mt-16 flex flex-col gap-4">
					<p className="text-text-secondary">
						Il faut au moins deux animes commencés pour lancer un duel. Les
						animes que tu prévois de voir n'entrent pas dans le classement.
					</p>
					<Link to="/anime/add" className="text-text underline text-sm">
						Ajouter un anime
					</Link>
				</div>
			)}

			{!isLoading && pair && tab === "duel" && (
				<Duel
					a={pair.a}
					b={pair.b}
					disabled={submitMatch.isPending}
					onVote={vote}
				/>
			)}

			{tab === "classement" && (
				<Ranking
					entries={ranking?.ranking ?? []}
					onReset={() => {
						if (
							window.confirm(
								"Remettre tous les scores à zéro et effacer l'historique des duels ?",
							)
						) {
							resetRanking.mutate();
						}
					}}
					isResetting={resetRanking.isPending}
				/>
			)}

			{submitMatch.isError && (
				<p className="text-danger text-sm mt-4">{submitMatch.error.message}</p>
			)}
		</div>
	);
}

function TabButton({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}) {
	const className = active
		? "flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-bg-light text-text border border-border-muted border-t-highlight"
		: "flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-bg text-text-secondary border border-border-muted hover:bg-gradient-hover";

	return (
		<button type="button" onClick={onClick} className={className}>
			{icon}
			{label}
		</button>
	);
}

function ProgressBar({ progress }: { progress: RankingProgress }) {
	const percent =
		progress.possiblePairs === 0
			? 0
			: Math.min(100, (progress.playedPairs / progress.possiblePairs) * 100);

	return (
		<div className="mt-6">
			<div className="flex justify-between text-xs text-text-secondary mb-2">
				<span>
					{progress.playedPairs} {plural(progress.playedPairs, "duel")}{" "}
					{plural(progress.playedPairs, "distinct")} sur{" "}
					{progress.possiblePairs}
				</span>
				<span>
					{progress.totalMatches} {plural(progress.totalMatches, "duel")}{" "}
					{plural(progress.totalMatches, "arbitré")}
				</span>
			</div>

			<div className="h-1 w-full rounded-full bg-bg-light overflow-hidden">
				<div
					className="h-full bg-secondary duration-300"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

function Duel({
	a,
	b,
	disabled,
	onVote,
}: {
	a: EloEntry;
	b: EloEntry;
	disabled: boolean;
	onVote: (outcome: MatchOutcome) => void;
}) {
	return (
		<div className="mt-8 flex flex-col items-center gap-6">
			<p className="text-text-secondary text-sm text-center">
				Lequel préfères-tu ?
			</p>

			<div className="w-full max-w-3xl grid grid-cols-2 gap-4 md:gap-8 items-start">
				<Contender entry={a} disabled={disabled} onPick={() => onVote("a")} />
				<Contender entry={b} disabled={disabled} onPick={() => onVote("b")} />
			</div>

			<button
				type="button"
				disabled={disabled}
				onClick={() => onVote("draw")}
				className="text-sm px-8 py-3 rounded-full bg-bg-light text-text-muted border border-border-muted hover:bg-gradient-hover cursor-pointer disabled:opacity-50"
			>
				Match nul
			</button>

			<p className="text-text-secondary text-xs text-center">
				Raccourcis : ← et → pour choisir, espace pour un match nul.
			</p>
		</div>
	);
}

function Contender({
	entry,
	disabled,
	onPick,
}: {
	entry: EloEntry;
	disabled: boolean;
	onPick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onPick}
			disabled={disabled}
			className="group flex flex-col text-left cursor-pointer disabled:opacity-50 disabled:cursor-wait"
		>
			{/* A bounded height rather than a plain ratio: both posters, their titles
			    and the draw button have to fit on screen, otherwise you scroll
			    between every vote. The light background is the fallback for when
			    the remote image fails to load. */}
			<div
				className="rounded-lg w-full h-[min(46vh,380px)] bg-bg-light bg-cover bg-center border-2 border-transparent group-hover:border-secondary duration-300 group-hover:scale-105"
				style={{ backgroundImage: `url(${entry.img})` }}
			/>
			<p className="mt-3 text-text group-hover:text-primary text-sm duration-300">
				{entry.name}
			</p>
			<p className="text-text-secondary text-xs mt-1">
				{entry.elo} pts · {entry.matchCount} {plural(entry.matchCount, "duel")}
			</p>
		</button>
	);
}

function Ranking({
	entries,
	onReset,
	isResetting,
}: {
	entries: Array<RankedEntry>;
	onReset: () => void;
	isResetting: boolean;
}) {
	if (entries.length === 0) {
		return (
			<p className="text-text-secondary mt-12">
				Aucun anime à classer. Seuls ceux que tu as commencés comptent : en
				cours, terminés ou inachevés.
			</p>
		);
	}

	return (
		<div className="mt-12 flex flex-col gap-2">
			{entries.map((entry) => (
				<Link
					key={entry.animeId}
					to="/anime/$animeId"
					params={{ animeId: entry.animeId }}
					className="flex items-center gap-4 px-4 py-3 rounded-md bg-bg border border-border-muted border-l-2 border-t-highlight hover:bg-gradient-hover"
				>
					<span
						className={`w-8 shrink-0 text-lg font-semibold ${
							entry.rank <= 3 ? "text-secondary" : "text-text-secondary"
						}`}
					>
						{entry.rank}
					</span>

					<div
						className="w-10 h-14 shrink-0 rounded bg-cover bg-center"
						style={{ backgroundImage: `url(${entry.img})` }}
					/>

					<div className="flex-1 min-w-0">
						<p className="text-text truncate">{entry.name}</p>
						<p className="text-text-secondary text-xs">
							{statusTranslations[entry.status].fr} · {entry.matchCount}{" "}
							{plural(entry.matchCount, "duel")}
						</p>
					</div>

					<span className="text-text-muted font-light shrink-0">
						{entry.elo} pts
					</span>
				</Link>
			))}

			<button
				type="button"
				onClick={onReset}
				disabled={isResetting}
				className="self-start mt-8 text-xs text-danger underline cursor-pointer disabled:opacity-50"
			>
				{isResetting ? "Réinitialisation…" : "Réinitialiser le classement"}
			</button>
		</div>
	);
}
