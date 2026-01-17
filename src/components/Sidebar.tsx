import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

export default function Sidebar() {
    const { user } = useAuth();

    const { data: genres, isLoading } = useQuery({
        queryKey: ["genres"],
        queryFn: () => pb.collection("genres").getFullList()
    });

    return <div className="md:py-6 flex flex-col">
        <a href="/">
            <h1 className="text-white text-xl text-center py-3 mb-4 select-none">
                weeeb.app
            </h1>
        </a>
        <div className="hidden md:flex flex-col px-8 mt-12">
            <h3 className="text-[#bdccd8] mb-4">Pages</h3>
            <Link
                to="/"
                className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted"
            >Accueil
            </Link>
            {
                user && (
                    <Link
                        to="/"
                        className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted"
                    >
                        Ma liste
                    </Link>
                )
            }
            {
                user && (
                    <a
                        href="/anime/add"
                        className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted"
                    >
                        Ajouter un anime
                    </a>
                )
            }
        </div>
        <div className="hidden md:flex flex-col px-8 mt-12">
            <h3 className="text-[#bdccd8] mb-4">Catégories</h3>

            <Link

                to="/genres/$genre"
                params={prev => ({ ...prev, genre: "all" })}
                className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted"
            >
                Tous
            </Link>
            {
                !isLoading && genres?.map((record) => (
                    <Link
                        to="/genres/$genre"
                        params={prev => ({
                            ...prev, genre: record.name.replaceAll(" ", "").toLowerCase()
                        })}
                        key={record.id}
                        className="w-full text-sm text-left px-4 border-l-2 rounded-r-md bg-bg border-t-highlight hover:bg-gradient-hover p-2 text-text border-border-muted"
                    >
                        {record.name}
                    </Link>
                ))
            }
        </div>
    </div>
}