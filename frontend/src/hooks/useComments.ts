import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { CommentRecord } from "@/types";

const useComments = (animeId: string) =>
	useQuery({
		queryKey: ["comments", animeId],
		enabled: Boolean(animeId),
		queryFn: () =>
			pb.collection("comments").getFullList<CommentRecord>({
				filter: pb.filter("anime = {:anime}", { anime: animeId }),
				expand: "author",
			}),
	});

export default useComments;
