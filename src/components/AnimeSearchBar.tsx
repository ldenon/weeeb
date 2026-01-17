import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import AnimeThumbnail from "./AnimeThumbnail";

interface AnimeSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export default function AnimeSearchBar({ ...props }: AnimeSearchBarProps) {

  const [query, setQuery] = useState("");

  const { data: animes, isLoading } = useQuery({
    queryKey: ["animes", query],
    queryFn: () => {
      if (query.length === 0) return [];

      return pb.collection("animes").getFullList({
        filter: `name ~ "%${query}%"`,
        fields: "id,name,img"
      })
    }
  })

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const q = target.value.trim();

    if (animes && q.length === 0) {
      setQuery("");
    }

    if (q.length < 2) {
      // document.querySelectorAll(".hideOnSearch").forEach((el) => {
      //   el.classList.remove("hidden");
      // });
      return;
    }

    // document.querySelectorAll(".hideOnSearch").forEach((el) => {
    //   el.classList.add("hidden");
    // });

    setQuery(q);
  };

  return (
    <div className="w-full relative flex flex-col">

      <div className="w-full relative">
        <input
          {...props}

          type="text"
          placeholder="Rechercher un anime"
          className="outline-none w-full rounded-full bg-bg-light text-text-muted px-8 py-3"
          onChange={handleSearch}
        />
      </div>

      <div className={query.length > 0 ? "mt-8" : " hidden"}>
        <h2 className="text-[#bdccd8] text-xl uppercase font-semibold my-4">
          Résultat de la recherche
        </h2>

        {/* <div className="flex flex-wrap gap-4">
          {userResults.length > 0 ? (
            userResults.map(({ name }) => (
              <a href={`/u/${name}`}>
                <div className="text-sm px-6 py-2 bg-bg shadow-shadow hover:bg-gradient-hover text-secondary border-1 border-secondary rounded-full">
                  {name}
                </div>
              </a>
            ))
          ) : (
            <></>
          )}
        </div> */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {animes && !isLoading && animes?.length > 0 ?
            animes.map((anime) => (
              <AnimeThumbnail
                key={anime.id}
                id={anime.id}
                imgUrl={anime.img}
                name={anime.name}
              />
            ))
            : (
              <p className="text-[#7f8a94] col-span-full">
                Aucun résultat pour cette recherche...
              </p>
            )}
        </div>

      </div>
    </div>
  );
}
