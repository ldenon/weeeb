import { createFileRoute, Link } from "@tanstack/react-router";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import AnimeThumbnail from "@/components/AnimeThumbnail";
import useWatchlistAnimes from "@/hooks/useWatchlistAnimes";
import { pb } from "@/lib/pocketbase";
import type { WatchlistRecord, WatchlistStatus } from "@/types";
import { isRankable } from "@/utils/anime";

export const Route = createFileRoute("/_app/")({ component: App });

interface SectionProps {
	title: string;
	entries: Array<WatchlistRecord>;
	emptyLabel: string;
	/** Masterclass entries are highlighted, so they are displayed larger. */
	wide?: boolean;
}

function Section({ title, entries, emptyLabel, wide }: SectionProps) {
	const gridClassName = wide
		? "grid sm:grid-cols-2 md:grid-cols-4 grid-cols-2 gap-4"
		: "grid grid-cols-4 md:grid-cols-7 gap-4";

	return (
		<div className="mt-16">
			<h2 className="text-text text-xl uppercase font-semibold my-4">
				{title} {entries.length > 0 && `(${entries.length})`}
			</h2>

			<div className={gridClassName}>
				{entries.length === 0 ? (
					<p className="text-text-secondary col-span-full">{emptyLabel}</p>
				) : (
					entries.map((entry) => (
						<AnimeThumbnail
							key={entry.id}
							id={entry.anime}
							imgUrl={entry.expand?.anime?.img ?? ""}
							name={entry.expand?.anime?.name ?? ""}
						/>
					))
				)}
			</div>
		</div>
	);
}

function App() {
	const user = pb.authStore.record;
	const { data: animes, isLoading } = useWatchlistAnimes(user?.id ?? "");

	const entries = animes ?? [];
	const byStatus = (status: WatchlistStatus) =>
		entries.filter((entry) => entry.status === status);

	return (
		<>
			<div className="flex justify-end gap-4">
				<AnimeSearchBar />
			</div>

			{isLoading && <p className="text-text-secondary mt-12">Chargement…</p>}

			{/* The ranking ignores planned animes, so the link must not promise a
			    duel the server would refuse to set up. */}
			{!isLoading &&
				entries.filter((e) => isRankable(e.status)).length >= 2 && (
					<Link
						to="/ranking"
						className="inline-block mt-12 text-sm px-6 py-3 rounded-full bg-bg-light text-text border border-border-muted hover:bg-gradient-hover"
					>
						Classer mes animes en duel →
					</Link>
				)}

			<Section
				title="Masterclass"
				entries={entries.filter((entry) => entry.isMasterclass)}
				emptyLabel="Tu n'as aucune masterclass."
				wide
			/>
			<Section
				title="En cours"
				entries={byStatus("ongoing")}
				emptyLabel="Tu regardes rien pour le moment."
			/>
			<Section
				title="Prévu"
				entries={byStatus("planned")}
				emptyLabel="Aucun anime de prévu"
			/>
			<Section
				title="Terminé"
				entries={byStatus("completed")}
				emptyLabel="Aucun anime terminé"
			/>
			<Section
				title="Inachevé"
				entries={byStatus("dropped")}
				emptyLabel="Aucun anime inachevé"
			/>
		</>
	);
}
