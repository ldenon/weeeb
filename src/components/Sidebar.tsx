import { Link } from "@tanstack/react-router";
import useGenres from "@/hooks/useGenres";

function SidebarItem({ name }: { name: string }) {
	return (
		<div className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted">
			{name}
		</div>
	);
}

export default function Sidebar() {
	const { data: genres, isLoading } = useGenres();

	return (
		<div className="md:py-6 flex flex-col">
			<Link to="/">
				<h1 className="text-white text-xl text-center py-3 mb-4 select-none">
					weeeb
				</h1>
			</Link>

			<div className="hidden md:flex flex-col px-8 mt-12 gap-1">
				<h3 className="text-text-muted mb-4">Pages</h3>
				<Link to="/">
					<SidebarItem name="Ma liste" />
				</Link>
				<Link to="/ranking">
					<SidebarItem name="Classement" />
				</Link>
				<Link to="/anime/add">
					<SidebarItem name="Ajouter un anime" />
				</Link>
			</div>

			<div className="hidden md:flex flex-col px-8 mt-12 gap-1">
				<h3 className="text-text-muted mb-4">Catégories</h3>

				<Link to="/genres/$genre" params={{ genre: "all" }}>
					<SidebarItem name="Tous" />
				</Link>

				{!isLoading &&
					genres?.map((genre) => (
						<Link
							key={genre.id}
							to="/genres/$genre"
							params={{ genre: genre.name.replaceAll(" ", "").toLowerCase() }}
						>
							<SidebarItem name={genre.name} />
						</Link>
					))}
			</div>
		</div>
	);
}
