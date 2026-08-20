import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { RankingResponse } from "@/types";

/**
 * Le classement d'un autre membre, en lecture seule.
 *
 * `userId` vide désactive la requête : l'appelant consulte alors son propre
 * classement via useRanking.
 */
const useUserRanking = (userId: string) =>
	useQuery({
		queryKey: ["ranking", "member", userId],
		enabled: Boolean(userId),
		queryFn: () =>
			apiFetch<RankingResponse>(
				`/api/weeeb/ranking/user/${encodeURIComponent(userId)}`,
			),
	});

export default useUserRanking;
