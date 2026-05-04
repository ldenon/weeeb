import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useRelatedUsers = (animeId: string) =>
  useQuery({
    queryKey: ["relatedUsers", animeId],
    queryFn: () =>
      pb.collection("watchlists").getFullList({
        filter: `anime = "${animeId}"`,
        expand: "user",
      }),
  });

export default useRelatedUsers;
