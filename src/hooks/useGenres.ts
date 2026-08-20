import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { GenreRecord } from "@/types";

const useGenres = () =>
	useQuery({
		queryKey: ["genres"],
		queryFn: () =>
			pb.collection("genres").getFullList<GenreRecord>({ sort: "name" }),
	});

export default useGenres;
