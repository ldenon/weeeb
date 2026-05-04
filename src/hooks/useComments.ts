import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useComments = (animeId: string) =>
  useQuery({
    queryKey: ["comments", animeId],
    queryFn: () =>
      pb.collection("comments").getFullList({
        filter: `anime.id = "${animeId}"`,
        expand: "author",
      }),
  });

export default useComments;
