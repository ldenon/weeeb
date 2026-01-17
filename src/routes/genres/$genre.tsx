import { createFileRoute, notFound } from '@tanstack/react-router'
import AnimeSearchBar from '@/components/AnimeSearchBar';
import AnimeThumbnail from '@/components/AnimeThumbnail';
import { pb } from '@/lib/pocketbase'

export const Route = createFileRoute('/genres/$genre')({
    component: RouteComponent,
    loader: async ({ params }) => {
        const genre = params.genre;

        // All animes
        if (genre === "all") {
            return await pb.collection("animes").getFullList({
                sort: "name"
            });
        }

        // Check if genre exists
        const genres = await pb.collection("genres").getFullList();
        const [foundGenre] = genres.filter(
            (g) => g.name.replaceAll(" ", "").toLowerCase() === genre
        );

        if (!foundGenre) throw notFound();


        // Find all animes of found genre
        const animes = await pb.collection("animes").getFullList({
            filter: `genres.id ?= "${foundGenre.id}"`,
        });

        return animes;
    }
})

function RouteComponent() {

    const animes = Route.useLoaderData();


    return <>
        <AnimeSearchBar />

        <div className="grid grid-cols-4 md:grid-cols-7 gap-4 mt-12">
            {
                animes?.map((anime) => (
                    <AnimeThumbnail key={anime.id} id={anime.id} imgUrl={anime.img} name={anime.name} />
                ))
            }
        </div>
    </>
}
