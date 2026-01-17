

import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useMemo } from 'react';
import AnimeComment from '@/components/AnimeComment';
import AnimeCommentForm from '@/components/AnimeCommentForm';
import AnimeSearchBar from '@/components/AnimeSearchBar';
import WatchlistActionButtons from '@/components/WatchlistActionButtons';
import { useAuth } from '@/contexts/AuthContext';
import { pb } from '@/lib/pocketbase';
import { statusTranslations } from '@/utils/anime';

export const Route = createFileRoute('/anime/$animeId')({
    component: RouteComponent,
    loader: async ({ params }) => {
        const animeId = params.animeId;

        if (animeId.trim().length === 0) throw notFound();

        const anime = await pb.collection("animes").getOne(animeId, {
            expand: "genres",
        })
            .catch(() => { throw notFound() })

        return anime;
    }
})

function RouteComponent() {
    const anime = Route.useLoaderData();

    const { user } = useAuth();

    const { data: comments } = useQuery({
        queryKey: ["comments"],
        queryFn: () => pb.collection("comments").getFullList({
            filter: `anime.id = "${anime.id}"`,
            expand: "author",
        })
    });

    const { data: relatedUsers } = useQuery({
        queryKey: ["relatedUsers", anime.id],
        queryFn: () => pb.collection("watchlists").getFullList({
            filter: `anime = "${anime.id}"`,
            expand: "user",
        })
    });

    const userWatchlistEntry = useMemo(() => {
        if (!user || !relatedUsers) return null

        return relatedUsers.find(
            (w) => w.expand?.user.id === user.id
        )
    }, [user, relatedUsers]);

    const userComment = comments?.find((c) => c.author === user?.id);

    return <div className="mt-4 md:mt-16 hideOnSearch">

        <AnimeSearchBar />

        <div className="grid md:grid-cols-2 lg:grid-cols-3">
            <h1 className="text-xl text-text my-4 col-span-full">
                {anime?.name}
            </h1>
            <div className="w-1/2 md:w-full">
                <img className="rounded-md w-full" src={anime.img} alt="Grand Blue" />
                {user && <WatchlistActionButtons
                    key={userWatchlistEntry?.id || "new"} // Le 'key' force le composant à se recréer si l'entrée change
                    currentStatus={
                        userWatchlistEntry?.status
                            ? statusTranslations[userWatchlistEntry.status as keyof typeof statusTranslations]?.fr
                            : "Ajouter à "
                    }
                    animeId={anime.id}
                />}

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
                    {
                        anime.expand?.genres.map(({ name }: { name: string }, i: number) => {
                            // Remove comma for the first element
                            if (i === 0) return name;

                            return `, ${name}`;
                        })
                    }
                </p>
                <div className="col-span-full flex-col flex-wrap mt-8">
                    <h3 className="text-lg text-text-muted mb-4">Synopsis</h3>
                    <p
                        className="text-justify text-text-secondary leading-relaxed text-sm line-clamp-10 hover:line-clamp-none"
                    >
                        {anime?.synopsis}
                    </p>
                </div>
            </div>
        </div>

        <div className="col-span-full grid grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
            {
                user && relatedUsers?.map((w) => {
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
                })
            }
        </div>

        <div className="flex-col flex-wrap mt-8">

            {
                user && userWatchlistEntry ? (
                    <AnimeCommentForm
                        animeId={anime.id}
                        commentId={userComment?.id ?? ""}
                        review={userComment?.content ?? ""}
                    />
                ) : (
                    <> </>
                )
            }

            {comments?.map((comment) => {
                if (comment.author === user?.id) return <></>;

                return (
                    <AnimeComment
                        key={comment.id}
                        author={comment.expand?.author.name}
                        text={comment.content}
                    />
                );
            })
            }
        </div>

    </div>
}
