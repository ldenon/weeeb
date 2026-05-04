import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import AnimeComment from "@/components/AnimeComment";
import AnimeCommentForm from "@/components/AnimeCommentForm";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import WatchlistActionButtons from "@/components/WatchlistActionButtons";
import useAnime from "@/hooks/useAnime";
import useComments from "@/hooks/useComments";
import useRelatedUsers from "@/hooks/useRelatedUsers";
import { pb } from "@/lib/pocketbase";
import { statusTranslations } from "@/utils/anime";

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

  const userWatchlistEntry = useMemo(() => {
    if (!user || !relatedUsers) return null;

    return relatedUsers.find((w) => w.expand?.user.id === user.id);
  }, [user, relatedUsers]);

  const userComment = comments?.find((c) => c.author === user?.id);

  return (
    <div className="mt-4 ">
      <AnimeSearchBar />

      <div className="grid md:grid-cols-2 lg:grid-cols-3">
        <h1 className="text-xl text-text my-4 col-span-full">{anime?.name}</h1>
        <div className="w-1/2 md:w-full">
          <img
            className="rounded-md w-full"
            src={anime?.img}
            alt="Grand Blue"
          />
          {!isAnimeLoading && (
            <WatchlistActionButtons
              key={userWatchlistEntry?.id || "new"} // Le 'key' force le composant à se recréer si l'entrée change
              currentStatus={
                userWatchlistEntry?.status
                  ? statusTranslations[
                      userWatchlistEntry.status as keyof typeof statusTranslations
                    ]?.fr
                  : "Ajouter à "
              }
              animeId={animeId}
            />
          )}
        </div>

        <div className="sm:pl-4 py-4 sm:py-0 gap-2 md:col-span-2 flex flex-col">
          <div className="w-full grid grid-cols-2">
            <div>
              <span className="text-text-muted font-semibold">Note</span>
              <p className="text-lg text-text-muted col-span-full font-light mt-1">
                4/5
              </p>
            </div>
            <div>
              <span className="text-text-muted font-semibold mt-4">Score</span>
              <p className="text-lg text-text-muted col-span-full font-light mt-1">
                pas de score
              </p>
            </div>
          </div>
          <span className="text-text-muted font-semibold mt-4">Genre</span>
          <p className="text-lg text-text-muted col-span-full font-light">
            {anime?.expand?.genres.map(
              ({ name }: { name: string }, i: number) => {
                // Remove comma for the first element
                if (i === 0) return name;

                return `, ${name}`;
              },
            )}
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
        {relatedUsers?.map((w) => {
          const style =
            "text-sm px-4 py-2 flex items-center bg-bg shadow-shadow hover:bg-gradient-hover border-1 rounded-full " +
            (w.isMasterclass
              ? "text-secondary border-secondary"
              : "border-t-highlight border-border-muted text-text");
          return (
            <div key={w.id} className={style}>
              <span className="capitalize mr-1">{w.expand?.user?.name}</span>
              {`(${statusTranslations[
                w.status as keyof typeof statusTranslations
              ].fr.toLowerCase()})`}
            </div>
          );
        })}
      </div>

      <div className="flex-col flex-wrap mt-8">
        {userWatchlistEntry && (
          <AnimeCommentForm
            animeId={animeId}
            commentId={userComment?.id ?? ""}
            review={userComment?.content ?? ""}
          />
        )}

        {!areCommentsLoading &&
          comments?.map((comment) => {
            if (comment.author === user?.id) return null;

            return (
              <AnimeComment
                key={comment.id}
                author={comment.expand?.author.name}
                text={comment.content}
              />
            );
          })}
      </div>
    </div>
  );
}
