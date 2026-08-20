import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import type { AnimeRecord } from "@/types";
import AnimeThumbnail from "./AnimeThumbnail";

export default function AnimeSearchBar() {
	const [input, setInput] = useState("");
	const [query, setQuery] = useState("");

	// Typing used to fire one request per keystroke.
	useEffect(() => {
		const timeout = setTimeout(() => setQuery(input.trim()), 300);
		return () => clearTimeout(timeout);
	}, [input]);

	const { data: animes, isLoading } = useQuery({
		queryKey: ["animes", "search", query],
		enabled: query.length > 0,
		queryFn: () =>
			pb.collection("animes").getFullList<AnimeRecord>({
				filter: pb.filter("name ~ {:query}", { query }),
				fields: "id,name,img",
				sort: "name",
			}),
	});

	const hasResults = Boolean(animes && animes.length > 0);

	return (
		<div className="w-full relative flex flex-col">
			<input
				type="search"
				value={input}
				placeholder="Rechercher un anime"
				aria-label="Rechercher un anime"
				className="outline-none w-full rounded-full bg-bg-light text-text-muted px-8 py-3"
				onChange={(e) => setInput(e.target.value)}
			/>

			{query.length > 0 && (
				<div className="mt-8">
					<h2 className="text-text-muted text-xl uppercase font-semibold my-4">
						Résultat de la recherche
					</h2>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
						{isLoading && (
							<p className="text-text-secondary col-span-full">Recherche…</p>
						)}

						{!isLoading && !hasResults && (
							<p className="text-text-secondary col-span-full">
								Aucun résultat pour cette recherche...
							</p>
						)}

						{!isLoading &&
							animes?.map((anime) => (
								<AnimeThumbnail
									key={anime.id}
									id={anime.id}
									imgUrl={anime.img}
									name={anime.name}
								/>
							))}
					</div>
				</div>
			)}
		</div>
	);
}
