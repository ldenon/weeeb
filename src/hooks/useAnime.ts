import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useAnime = (animeId: string) => {
  return useQuery({
    queryKey: ["anime", animeId],
    queryFn: () =>
      pb.collection("animes").getOne(animeId, {
        expand: "genres",
      }),
  });
};
export default useAnime;
