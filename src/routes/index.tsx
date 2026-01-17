import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import AnimeSearchBar from '@/components/AnimeSearchBar'
import AnimeThumbnail from '@/components/AnimeThumbnail';

import AuthButton from '@/components/AuthButton';
import { useAuth } from '@/contexts/AuthContext';

import { pb } from '@/lib/pocketbase';


export const Route = createFileRoute('/')({ component: App })

function App() {
  const { user } = useAuth();

  const { data: animes } = useQuery({
    queryKey: ["homeAnimes", user],
    queryFn: () => pb
      .collection("watchlists")
      .getFullList({ expand: "anime", filter: `user = "${user?.id}"` })
  })
  const completed = animes ? animes?.filter((el) => el.status === "completed") : [];
  const ongoing = animes ? animes?.filter((el) => el.status === "ongoing") : [];
  const dropped = animes ? animes?.filter((el) => el.status === "dropped") : [];
  const planned = animes ? animes?.filter((el) => el.status === "planned") : [];
  const masterclass = animes ? animes?.filter((anime) => anime.isMasterclass) : [];

  return <>
    <div className="flex justify-end gap-4">
      <AnimeSearchBar />
      <AuthButton />
    </div>

    <div className="mt-12 hideOnSearch">
      <h2 className="text-text text-xl uppercase font-semibold my-4">Masterclass</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 grid-cols-2 gap-4">
        {
          masterclass.length === 0 ? (
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
          )
        }
      </div>
    </div>

    <div className="mt-16 hideOnSearch">
      <h2 className="text-text text-xl uppercase font-semibold my-4">
        En cours {ongoing.length > 0 ? `(${ongoing.length})` : ""}
      </h2>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
        {
          ongoing.length === 0 ? (
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
          )
        }
      </div>
    </div>

    <div className="mt-16 hideOnSearch">
      <h2 className="text-text text-xl uppercase font-semibold my-4">
        Prévu ({planned.length})
      </h2>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
        {
          planned.length === 0 ? (
            <p className="text-text-secondary col-span-full">Aucun anime de prévu</p>
          ) : (
            planned.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )
        }
      </div>
    </div>

    <div className="mt-16 hideOnSearch">
      <h2 className="text-text text-xl uppercase font-semibold my-4">
        Terminé ({completed.length})
      </h2>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
        {
          completed.length === 0 ? (
            <p className="text-text-secondary col-span-full">Aucun anime terminé</p>
          ) : (
            completed.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )
        }
      </div>
    </div>

    <div className="mt-16 hideOnSearch">
      <h2 className="text-text text-xl uppercase font-semibold my-4">
        Inachevé ({dropped.length})
      </h2>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
        {
          dropped.length === 0 ? (
            <p className="text-text-secondary col-span-full">Aucun anime inachevé</p>
          ) : (
            dropped.map(({ expand }) => (
              <AnimeThumbnail
                key={expand?.anime.id}
                id={expand?.anime.id}
                imgUrl={expand?.anime.img}
                name={expand?.anime.name}
              />
            ))
          )
        }
      </div>
    </div>
  </>
}


// function AnimeSection() {
//   return <div className="mt-12 hideOnSearch">
//     <h2 className="text-text text-xl uppercase font-semibold my-4">Masterclass</h2>
//     <div className="grid sm:grid-cols-2 md:grid-cols-4 grid-cols-2 gap-4">
//       {
//         masterclass.length === 0 ? (
//           <p className="text-text-secondary col-span-full">
//             Tu n'as aucune masterclass.
//           </p>
//         ) : (
//           masterclass.map(({ expand }) => {
//             return (
//               <AnimeThumbnail
//                 key={expand.anime.id}
//                 id={expand.anime.id}
//                 imgUrl={expand.anime.img}
//                 name={expand.anime.name}
//               />
//             );
//           })
//         )
//       }
//     </div>
//   </div>
// }