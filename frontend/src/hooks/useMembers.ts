import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { UserRecord } from "@/types";

/** Les membres inscrits, pour consulter le classement de quelqu'un d'autre. */
const useMembers = () =>
	useQuery({
		queryKey: ["members"],
		queryFn: () =>
			pb.collection("users").getFullList<UserRecord>({ sort: "name" }),
	});

export default useMembers;
