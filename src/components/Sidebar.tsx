import { Link } from "@tanstack/react-router";
import useGenres from "@/hooks/useGenres";
import { pb } from "@/lib/pocketbase";

function SidebarItem({ name }: { name: string }) {
  return (
    <div className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted">
      {name}
    </div>
  );
}

export default function Sidebar() {
  const user = pb.authStore.record;

  const { data: genres, isLoading } = useGenres();
  return (
    <div className="md:py-6 flex flex-col">
      <a href="/">
        <h1 className="text-white text-xl text-center py-3 mb-4 select-none">
          weeeb
        </h1>
      </a>
      <div className="hidden md:flex flex-col px-8 mt-12">
        <h3 className="text-[#bdccd8] mb-4">Pages</h3>
        <Link to="/">
          <SidebarItem name="Accueil" />
        </Link>
        {user && (
          <Link to="/">
            <SidebarItem name="Ma liste" />
          </Link>
        )}
        {user && (
          <Link to="/anime/add">
            <SidebarItem name="Ajouter un anime" />
          </Link>
        )}
      </div>
      <div className="hidden md:flex flex-col px-8 mt-12">
        <h3 className="text-[#bdccd8] mb-4">Catégories</h3>

        <Link
          to="/genres/$genre"
          params={(prev) => ({ ...prev, genre: "all" })}
        >
          <SidebarItem name="Tous" />
        </Link>
        {!isLoading &&
          genres?.map((record) => (
            <Link
              to="/genres/$genre"
              params={(prev) => ({
                ...prev,
                genre: record.name.replaceAll(" ", "").toLowerCase(),
              })}
              key={record.id}
            >
              <SidebarItem name={record.name} />
            </Link>
          ))}
      </div>
    </div>
  );
}
