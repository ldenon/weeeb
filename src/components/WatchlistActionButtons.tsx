import { useMutation } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { statusTranslations } from "@/utils/anime";

type WatchlistActionButtonsProps = {
  currentStatus: string;
  animeId: string;
} & React.ComponentProps<"div">;

export default function WatchlistActionButtons({
  animeId,
  currentStatus,
}: WatchlistActionButtonsProps) {
  const [buttonText, setButtonText] = useState(currentStatus);
  const [expanded, setExpanded] = useState(false);

  const { user } = useAuth();

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      try {
        const watchlist = await pb
          .collection("watchlists")
          .getFirstListItem(`user.id = "${user?.id}" && anime.id = "${animeId}"`);

        return await pb.collection("watchlists").update(watchlist.id, {
          status: newStatus,
        });
      } catch {
        return await pb.collection("watchlists").create({
          user: user?.id,
          anime: animeId,
          isMasterclass: false,
          status: newStatus,
        });
      }
    },
    onSuccess: (data) => {
      setButtonText(
        statusTranslations[data.status as keyof typeof statusTranslations]
          .fr
      );
    },
  });

  return (
    <div className="w-full flex relative my-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="outline-none flex-1 border-0 cursor-pointer text-text hover:text-white  rounded-tl-md rounded-bl-md bg-blue-500 hover:bg-blue-500 duration-100 py-3 px-8 "
      >
        {buttonText}
      </button>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="outline-none border-0 cursor-pointer text-text hover:text-white rounded-tr-md rounded-br-md bg-blue-400 hover:bg-blue-500 duration-100 py-3 px-4"
      >
        <ChevronDown />
      </button>
      <div
        className={
          expanded
            ? "absolute top-full flex flex-col bg-bg text-right text-text w-full mt-2 rounded-sm border-border-muted border "
            : "hidden"
        }
      >
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            statusMutation.mutate("completed")
          }}
          className="px-4 py-2 border-b hover:bg-gradient-hover border-border-muted cursor-pointer select-none"
        >
          Terminé
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            statusMutation.mutate("ongoing")
          }}
          className="px-4 py-2 border-b hover:bg-gradient-hover border-border-muted cursor-pointer select-none"
        >
          En cours
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            statusMutation.mutate("planned")
          }}
          className="px-4 py-2 border-b hover:bg-gradient-hover border-border-muted cursor-pointer select-none"
        >
          Prévu
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            statusMutation.mutate("dropped")
          }}
          className="px-4 py-2 border-b hover:bg-gradient-hover border-border-muted cursor-pointer select-none"
        >
          Inachevé
        </button>
      </div>
    </div>
  );
}
