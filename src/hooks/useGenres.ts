import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useGenres = () => {
  return useQuery({
    queryKey: ["genres"],
    queryFn: () => pb.collection("genres").getFullList(),
  });
};

export default useGenres;
