import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { CommentRecord } from "@/types";

/**
 * Saves the user's review of an anime, creating or updating it.
 *
 * The existing review is re-read at write time rather than taken from the cache:
 * the form saves continuously and the cache runs one cycle behind, which caused a
 * second creation that the unique (author, anime) index rejected. `scope`
 * serialises concurrent calls for the same reason.
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

			// `author` is imposed server-side by the OnRecordCreateRequest hook.
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
