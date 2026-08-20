import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { RankingResponse } from "@/types";

/** The Elo ranking of the logged-in user's watchlist. */
const useRanking = () => {
	const userId = pb.authStore.record?.id;

	return useQuery({
		queryKey: ["ranking", userId],
		enabled: Boolean(userId),
		queryFn: () => apiFetch<RankingResponse>("/api/weeeb/ranking"),
	});
};

export default useRanking;
