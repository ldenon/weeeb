import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useWatchlistAnimes = (userId: string) => {
  return useQuery({
    queryKey: ["homeAnimes", userId],
    queryFn: () =>
      pb
        .collection("watchlists")
        .getFullList({ expand: "anime", filter: `user = "${userId}"` }),
  });
};

export default useWatchlistAnimes;
