import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { WatchlistRecord } from "@/types";

const useWatchlistAnimes = (userId: string) =>
	useQuery({
		queryKey: ["watchlist", userId],
		enabled: Boolean(userId),
		queryFn: () =>
			pb.collection("watchlists").getFullList<WatchlistRecord>({
				filter: pb.filter("user = {:user}", { user: userId }),
				expand: "anime",
			}),
	});

export default useWatchlistAnimes;
