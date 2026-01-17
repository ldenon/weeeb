import { createFileRoute } from '@tanstack/react-router'
import AnimeSearchBar from '@/components/AnimeSearchBar'
import AnimeSubmitForm from '@/components/AnimeSubmitForm'

export const Route = createFileRoute('/anime/add')({
    component: RouteComponent,
})

function RouteComponent() {
    return <>
        <AnimeSearchBar />

        <div className="mt-12 hideOnSearch">
            <h2 className="text-xl text-[#bdccd8]">Ajouter un anime</h2>
            <AnimeSubmitForm />
        </div>

        <div className="flex flex-col mt-12 gap-2 hideOnSearch">
            <p className="text-text-secondary">Pour ajouter un anime</p>

            <p className="text-text-secondary font-light">
                - Aller sur <a
                    className="underline"
                    target="_blank"
                    href="https://voiranime.com" rel="noopener">VoirAnime</a> pour le synopsis
            </p>
            <p className="text-text-secondary font-light">
                - Aller sur <a
                    className="underline"
                    target="_blank"
                    href="https://www.anisearch.com" rel="noopener">AniSearch</a> pour récupérer le lien de l'image. Le lien doit ressembler à ça : https://cdn.anisearch.com/images/anime/cover/2/2788_600.webp
            </p>
        </div>
    </>
}
