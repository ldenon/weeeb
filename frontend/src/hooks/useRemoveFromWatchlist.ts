import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { WatchlistRecord } from "@/types";

/** Removes an anime from the user's watchlist. */
const useRemoveFromWatchlist = (animeId: string) => {
	const queryClient = useQueryClient();
	const userId = pb.authStore.record?.id;

	return useMutation({
		scope: { id: `watchlist-${animeId}` },
		mutationFn: async () => {
			const existing = await pb
				.collection("watchlists")
				.getFirstListItem<WatchlistRecord>(
					pb.filter("user = {:user} && anime = {:anime}", {
						user: userId,
						anime: animeId,
					}),
				);

			return pb.collection("watchlists").delete(existing.id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["watchlist", userId] });
			queryClient.invalidateQueries({ queryKey: ["relatedUsers", animeId] });
			queryClient.invalidateQueries({ queryKey: ["ranking"] });
		},
	});
};

export default useRemoveFromWatchlist;
