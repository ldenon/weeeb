import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { CommentRecord } from "@/types";

/**
 * Enregistre l'avis de l'utilisateur sur un anime, en création ou en mise à jour.
 *
 * L'avis existant est relu au moment de l'écriture plutôt que lu depuis le cache :
 * le formulaire enregistre en continu et le cache a un cycle de retard, ce qui
 * provoquait une seconde création rejetée par l'index unique (author, anime).
 * `scope` sérialise les appels concurrents pour la même raison.
 */
const useSaveComment = (animeId: string) => {
	const queryClient = useQueryClient();
	const userId = pb.authStore.record?.id;

	return useMutation({
		scope: { id: `comment-${animeId}` },
		mutationFn: async (content: string) => {
			const existing = await pb
				.collection("comments")
				.getFirstListItem<CommentRecord>(
					pb.filter("author = {:author} && anime = {:anime}", {
						author: userId,
						anime: animeId,
					}),
				)
				.catch(() => null);

			if (existing) {
				return pb
					.collection("comments")
					.update<CommentRecord>(existing.id, { content });
			}

			// `author` est imposé côté serveur par le hook OnRecordCreateRequest.
			return pb
				.collection("comments")
				.create<CommentRecord>({ anime: animeId, content });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", animeId] });
		},
	});
};

export default useSaveComment;
