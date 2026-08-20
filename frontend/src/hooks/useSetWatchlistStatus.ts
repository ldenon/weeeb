import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { WatchlistRecord, WatchlistStatus } from "@/types";

/**
 * Sets the status of an anime in the user's watchlist, creating the entry if it
 * does not exist yet.
 */
const useSetWatchlistStatus = (animeId: string) => {
	const queryClient = useQueryClient();
	const userId = pb.authStore.record?.id;

	return useMutation({
		scope: { id: `watchlist-${animeId}` },
		mutationFn: async (status: WatchlistStatus) => {
			const existing = await pb
				.collection("watchlists")
				.getFirstListItem<WatchlistRecord>(
					pb.filter("user = {:user} && anime = {:anime}", {
						user: userId,
						anime: animeId,
					}),
				)
				.catch(() => null);

			if (existing) {
				return pb
					.collection("watchlists")
					.update<WatchlistRecord>(existing.id, { status });
			}

			// `user`, `elo` and `matchCount` are imposed server-side.
			return pb
				.collection("watchlists")
				.create<WatchlistRecord>({ anime: animeId, status });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["watchlist", userId] });
			queryClient.invalidateQueries({ queryKey: ["relatedUsers", animeId] });
			queryClient.invalidateQueries({ queryKey: ["ranking"] });
		},
	});
};

export default useSetWatchlistStatus;
