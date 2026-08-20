import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import AnimeComment from "@/components/AnimeComment";
import AnimeCommentForm from "@/components/AnimeCommentForm";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import WatchlistActionButtons from "@/components/WatchlistActionButtons";
import useAnime from "@/hooks/useAnime";
import useComments from "@/hooks/useComments";
import useRanking from "@/hooks/useRanking";
import useRelatedUsers from "@/hooks/useRelatedUsers";
import { pb } from "@/lib/pocketbase";
import { plural, statusTranslations } from "@/utils/anime";

export const Route = createFileRoute("/_app/anime/$animeId")({
	component: RouteComponent,
});

function RouteComponent() {
	const user = pb.authStore.record;
	const { animeId } = Route.useParams();

	const { data: anime, isLoading: isAnimeLoading } = useAnime(animeId);
	const { data: comments, isLoading: areCommentsLoading } =
		useComments(animeId);
	const { data: relatedUsers } = useRelatedUsers(animeId);
	const { data: ranking } = useRanking();

	const userWatchlistEntry = useMemo(
		() => relatedUsers?.find((entry) => entry.user === user?.id) ?? null,
		[relatedUsers, user?.id],
	);

	// La note et le score étaient codés en dur : ils viennent maintenant du
	// classement par duels (/api/weeeb/ranking).
	const rankingEntry = ranking?.ranking.find(
		(entry) => entry.animeId === animeId,
	);

	const userComment = comments?.find((comment) => comment.author === user?.id);

	const otherComments =
		comments?.filter((comment) => comment.author !== user?.id) ?? [];

	return (
		<div className="mt-4">
			<AnimeSearchBar />

			<div className="grid md:grid-cols-2 lg:grid-cols-3">
				<h1 className="text-xl text-text my-4 col-span-full">{anime?.name}</h1>

				<div className="w-1/2 md:w-full">
					{anime?.img && (
						<img
							className="rounded-md w-full"
							src={anime.img}
							alt={anime.name}
						/>
					)}

					{!isAnimeLoading && (
						<WatchlistActionButtons
							animeId={animeId}
							currentStatus={userWatchlistEntry?.status ?? null}
						/>
					)}
				</div>

				<div className="sm:pl-4 py-4 sm:py-0 gap-2 md:col-span-2 flex flex-col">
					<div className="w-full grid grid-cols-2">
						<div>
							<span className="text-text-muted font-semibold">Classement</span>
							<p className="text-lg text-text-muted font-light mt-1">
								{rankingEntry && ranking
									? `${rankingEntry.rank} / ${ranking.ranking.length}`
									: "pas encore classé"}
							</p>
						</div>
						<div>
							<span className="text-text-muted font-semibold">Score</span>
							<p className="text-lg text-text-muted font-light mt-1">
								{rankingEntry
									? `${rankingEntry.elo} pts · ${rankingEntry.matchCount} ${plural(rankingEntry.matchCount, "duel")}`
									: "pas de score"}
							</p>
						</div>
					</div>

					<span className="text-text-muted font-semibold mt-4">Genre</span>
					<p className="text-lg text-text-muted col-span-full font-light">
						{anime?.expand?.genres?.map((genre) => genre.name).join(", ")}
					</p>

					<div className="col-span-full flex-col flex-wrap mt-8">
						<h3 className="text-lg text-text-muted mb-4">Synopsis</h3>
						<p className="text-justify text-text-secondary leading-relaxed text-sm line-clamp-10 hover:line-clamp-none">
							{anime?.synopsis}
						</p>
					</div>
				</div>
			</div>

			<div className="col-span-full grid grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
				{relatedUsers?.map((entry) => {
					const className = `text-sm px-4 py-2 flex items-center bg-bg shadow-shadow hover:bg-gradient-hover border-1 rounded-full ${
						entry.isMasterclass
							? "text-secondary border-secondary"
							: "border-t-highlight border-border-muted text-text"
					}`;

					return (
						<div key={entry.id} className={className}>
							<span className="capitalize mr-1">
								{entry.expand?.user?.name}
							</span>
							{`(${statusTranslations[entry.status].fr.toLowerCase()})`}
						</div>
					);
				})}
			</div>

			<div className="flex-col flex-wrap mt-8">
				{userWatchlistEntry && (
					<AnimeCommentForm
						animeId={animeId}
						review={userComment?.content ?? ""}
					/>
				)}

				{!areCommentsLoading &&
					otherComments.map((comment) => (
						<AnimeComment
							key={comment.id}
							author={comment.expand?.author?.name ?? "Anonyme"}
							text={comment.content}
						/>
					))}
			</div>
		</div>
	);
}
