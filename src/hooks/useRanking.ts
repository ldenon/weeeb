import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { RankingResponse } from "@/types";

/** Le classement Elo de la watchlist de l'utilisateur connecté. */
const useRanking = () => {
	const userId = pb.authStore.record?.id;

	return useQuery({
		queryKey: ["ranking", userId],
		enabled: Boolean(userId),
		queryFn: () => apiFetch<RankingResponse>("/api/weeeb/ranking"),
	});
};

export default useRanking;
