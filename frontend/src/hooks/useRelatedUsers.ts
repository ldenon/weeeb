import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { WatchlistRecord } from "@/types";

/** The other members' watchlist entries for a given anime. */
const useRelatedUsers = (animeId: string) =>
	useQuery({
		queryKey: ["relatedUsers", animeId],
		enabled: Boolean(animeId),
		queryFn: () =>
			pb.collection("watchlists").getFullList<WatchlistRecord>({
				filter: pb.filter("anime = {:anime}", { anime: animeId }),
				expand: "user",
			}),
	});

export default useRelatedUsers;
