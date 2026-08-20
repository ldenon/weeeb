import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useRemoveFromWatchlist from "@/hooks/useRemoveFromWatchlist";
import useSetWatchlistStatus from "@/hooks/useSetWatchlistStatus";
import type { WatchlistStatus } from "@/types";
import { statusTranslations } from "@/utils/anime";

const STATUSES: Array<WatchlistStatus> = [
	"completed",
	"ongoing",
	"planned",
	"dropped",
];

interface WatchlistActionButtonsProps {
	animeId: string;
	/** Statut actuel, ou null si l'anime n'est pas encore dans la liste. */
	currentStatus: WatchlistStatus | null;
}

export default function WatchlistActionButtons({
	animeId,
	currentStatus,
}: WatchlistActionButtonsProps) {
	const [expanded, setExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const setStatus = useSetWatchlistStatus(animeId);
	const removeFromWatchlist = useRemoveFromWatchlist(animeId);

	// Le libellé suit la donnée : plus d'état local à resynchroniser à la main.
	const label = currentStatus
		? statusTranslations[currentStatus].fr
		: "Ajouter à ma liste";

	useEffect(() => {
		if (!expanded) return;

		const closeOnOutsideClick = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setExpanded(false);
			}
		};

		document.addEventListener("mousedown", closeOnOutsideClick);
		return () => document.removeEventListener("mousedown", closeOnOutsideClick);
	}, [expanded]);

	const isPending = setStatus.isPending || removeFromWatchlist.isPending;

	return (
		<div ref={containerRef} className="w-full flex flex-col relative my-4">
			<div className="w-full flex">
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					disabled={isPending}
					className="outline-none flex-1 border-0 cursor-pointer text-text hover:text-white rounded-tl-md rounded-bl-md bg-blue-500 hover:bg-blue-500 duration-100 py-3 px-8 disabled:opacity-60"
				>
					{isPending ? "…" : label}
				</button>
				<button
					type="button"
					aria-label="Changer le statut"
					onClick={() => setExpanded(!expanded)}
					disabled={isPending}
					className="outline-none border-0 cursor-pointer text-text hover:text-white rounded-tr-md rounded-br-md bg-blue-400 hover:bg-blue-500 duration-100 py-3 px-4 disabled:opacity-60"
				>
					<ChevronDown />
				</button>
			</div>

			{expanded && (
				<div className="absolute top-full flex flex-col bg-bg text-right text-text w-full mt-2 rounded-sm border-border-muted border z-10">
					{STATUSES.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => {
								setExpanded(false);
								setStatus.mutate(status);
							}}
							className="px-4 py-2 border-b hover:bg-gradient-hover border-border-muted cursor-pointer select-none"
						>
							{statusTranslations[status].fr}
						</button>
					))}

					{currentStatus && (
						<button
							type="button"
							onClick={() => {
								setExpanded(false);
								removeFromWatchlist.mutate();
							}}
							className="px-4 py-2 text-danger hover:bg-gradient-hover cursor-pointer select-none"
						>
							Retirer de ma liste
						</button>
					)}
				</div>
			)}

			{(setStatus.isError || removeFromWatchlist.isError) && (
				<p className="text-danger text-xs mt-2">
					{(setStatus.error ?? removeFromWatchlist.error)?.message}
				</p>
			)}
		</div>
	);
}
