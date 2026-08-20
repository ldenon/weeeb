import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { AnimeRecord } from "@/types";

const useAnime = (animeId: string) =>
	useQuery({
		queryKey: ["anime", animeId],
		enabled: Boolean(animeId),
		queryFn: () =>
			pb.collection("animes").getOne<AnimeRecord>(animeId, {
				expand: "genres",
			}),
	});

export default useAnime;
