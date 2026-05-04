import { createFileRoute } from "@tanstack/react-router";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import AnimeThumbnail from "@/components/AnimeThumbnail";
import useWatchlistAnimes from "@/hooks/useWatchlistAnimes";
import { pb } from "@/lib/pocketbase";

export const Route = createFileRoute("/_app/")({ component: App });

function App() {
  const user = pb.authStore.record;

  const { data: animes } = useWatchlistAnimes(user?.id ?? "");

  const getAnimesByStatus = (status: string) => {
    return animes ? animes?.filter((el) => el.status === status) : [];
  };

  const completed = getAnimesByStatus("completed");
  const ongoing = getAnimesByStatus("ongoing");
  const dropped = getAnimesByStatus("dropped");
  const planned = getAnimesByStatus("planned");
  const masterclass = animes
    ? animes?.filter((anime) => anime.isMasterclass)
    : [];

  return (
    <>
      <div className="flex justify-end gap-4">
        <AnimeSearchBar />
      </div>

      <div className="mt-12 ">
        <h2 className="text-text text-xl uppercase font-semibold my-4">
          Masterclass
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 grid-cols-2 gap-4">
          {masterclass.length === 0 ? (
            <p className="text-text-secondary col-span-full">
              Tu n'as aucune masterclass.
            </p>
          ) : (
            masterclass.map(({ expand }) => {
              return (
                <AnimeThumbnail
                  key={expand?.anime.id}
                  id={expand?.anime.id}
                  imgUrl={expand?.anime.img}
                  name={expand?.anime.name}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="mt-16 ">
        <h2 className="text-text text-xl uppercase font-semibold my-4">
          En cours {ongoing.length > 0 ? `(${ongoing.length})` : ""}
        </h2>

        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {ongoing.length === 0 ? (
            <p className="text-text-secondary col-span-full">
              Tu regardes rien pour le moment.
            </p>
          ) : (
            ongoing.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-16 ">
        <h2 className="text-text text-xl uppercase font-semibold my-4">
          Prévu ({planned.length})
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {planned.length === 0 ? (
            <p className="text-text-secondary col-span-full">
              Aucun anime de prévu
            </p>
          ) : (
            planned.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-16 ">
        <h2 className="text-text text-xl uppercase font-semibold my-4">
          Terminé ({completed.length})
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {completed.length === 0 ? (
            <p className="text-text-secondary col-span-full">
              Aucun anime terminé
            </p>
          ) : (
            completed.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-16 ">
        <h2 className="text-text text-xl uppercase font-semibold my-4">
          Inachevé ({dropped.length})
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {dropped.length === 0 ? (
            <p className="text-text-secondary col-span-full">
              Aucun anime inachevé
            </p>
          ) : (
            dropped.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
