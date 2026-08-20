import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import useGenres from "@/hooks/useGenres";

function SidebarItem({ name }: { name: string }) {
	return (
		<div className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted">
			{name}
		</div>
	);
}

/**
 * Le contenu de navigation, partagé entre la colonne de bureau et le tiroir
 * mobile pour qu'ils ne puissent pas diverger.
 *
 * `onNavigate` referme le tiroir : la navigation de TanStack Router se fait sans
 * rechargement, le tiroir resterait donc ouvert par-dessus la nouvelle page.
 */
function NavSections({ onNavigate }: { onNavigate?: () => void }) {
	const { data: genres, isLoading } = useGenres();

	return (
		<>
			<div className="flex flex-col px-8 mt-12 gap-1">
				<h3 className="text-text-muted mb-4">Pages</h3>
				<Link to="/" onClick={onNavigate}>
					<SidebarItem name="Ma liste" />
				</Link>
				<Link to="/ranking" onClick={onNavigate}>
					<SidebarItem name="Classement" />
				</Link>
				<Link to="/anime/add" onClick={onNavigate}>
					<SidebarItem name="Ajouter un anime" />
				</Link>
			</div>

			<div className="flex flex-col px-8 mt-12 gap-1">
				<h3 className="text-text-muted mb-4">Catégories</h3>

				<Link
					to="/genres/$genre"
					params={{ genre: "all" }}
					onClick={onNavigate}
				>
					<SidebarItem name="Tous" />
				</Link>

				{!isLoading &&
					genres?.map((genre) => (
						<Link
							key={genre.id}
							to="/genres/$genre"
							params={{ genre: genre.name.replaceAll(" ", "").toLowerCase() }}
							onClick={onNavigate}
						>
							<SidebarItem name={genre.name} />
						</Link>
					))}
			</div>
		</>
	);
}

export default function Sidebar() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		// Le tiroir couvre l'écran : laisser la page défiler derrière serait
		// désorientant à la fermeture.
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<>
			{/* Barre mobile : le titre et le bouton d'ouverture. */}
			<div className="md:hidden flex items-center justify-between px-4">
				<Link to="/">
					<h1 className="text-white text-xl py-3 select-none">weeeb</h1>
				</Link>

				<button
					type="button"
					onClick={() => setOpen(true)}
					aria-label="Ouvrir le menu"
					aria-expanded={open}
					className="p-2 -mr-2 text-text hover:text-white cursor-pointer"
				>
					<Menu />
				</button>
			</div>

			{open && (
				<div className="md:hidden fixed inset-0 z-50 flex">
					<button
						type="button"
						aria-label="Fermer le menu"
						onClick={() => setOpen(false)}
						className="absolute inset-0 bg-bg-dark/80 cursor-default"
					/>

					<nav className="relative w-72 max-w-[85%] h-full overflow-y-auto bg-bg border-r border-border-muted pb-12">
						<div className="flex items-center justify-between px-4 pt-3">
							<span className="text-white text-xl select-none">weeeb</span>
							<button
								type="button"
								onClick={() => setOpen(false)}
								aria-label="Fermer le menu"
								className="p-2 -mr-2 text-text hover:text-white cursor-pointer"
							>
								<X />
							</button>
						</div>

						<NavSections onNavigate={() => setOpen(false)} />
					</nav>
				</div>
			)}

			{/* Colonne de bureau, inchangée. */}
			<div className="hidden md:flex md:py-6 flex-col">
				<Link to="/">
					<h1 className="text-white text-xl text-center py-3 mb-4 select-none">
						weeeb
					</h1>
				</Link>

				<NavSections />
			</div>
		</>
	);
}
