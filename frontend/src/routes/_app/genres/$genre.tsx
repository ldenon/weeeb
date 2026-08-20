import { createFileRoute, notFound } from "@tanstack/react-router";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import AnimeThumbnail from "@/components/AnimeThumbnail";
import { pb } from "@/lib/pocketbase";
import type { AnimeRecord, GenreRecord } from "@/types";

const slugify = (name: string) => name.replaceAll(" ", "").toLowerCase();

export const Route = createFileRoute("/_app/genres/$genre")({
	component: RouteComponent,
	loader: async ({ params }) => {
		if (params.genre === "all") {
			return pb.collection("animes").getFullList<AnimeRecord>({ sort: "name" });
		}

		const genres = await pb.collection("genres").getFullList<GenreRecord>();
		const found = genres.find((genre) => slugify(genre.name) === params.genre);

		if (!found) throw notFound();

		return pb.collection("animes").getFullList<AnimeRecord>({
			filter: pb.filter("genres.id ?= {:genreId}", { genreId: found.id }),
			sort: "name",
		});
	},
});

function RouteComponent() {
	const animes = Route.useLoaderData();

	return (
		<>
			<AnimeSearchBar />

			<div className="grid grid-cols-4 md:grid-cols-7 gap-4 mt-12">
				{animes.length === 0 ? (
					<p className="text-text-secondary col-span-full">
						Aucun anime dans cette catégorie.
					</p>
				) : (
					animes.map((anime) => (
						<AnimeThumbnail
							key={anime.id}
							id={anime.id}
							imgUrl={anime.img}
							name={anime.name}
						/>
					))
				)}
			</div>
		</>
	);
}
