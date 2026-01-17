import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import Sidebar from "@/components/Sidebar"

import "@fontsource-variable/outfit";
import { AuthProvider } from '@/contexts/AuthContext'
import { pb } from '@/lib/pocketbase'
import { queryClient } from '@/lib/queryClient'
import appCss from '../styles.css?url'


pb.authStore.onChange((token, record) => {
  // On met à jour manuellement le cache de TanStack Query
  queryClient.setQueryData(["currentUser"], record);
  // Si déconnexion, on vide tout le cache pour éviter les fuites de données privées
  if (!token) {
    queryClient.clear();
  }
});



export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'La meilleure watchlist d\'anime - Weeeb',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <main className="md:grid grid-cols-5 min-h-screen pt-6 pb-16">
              <Sidebar />
              <div className="col-span-3 py-6 px-8 md:px-0">
                {children}

              </div>
              <div></div>
            </main>
          </AuthProvider>

        </QueryClientProvider>

        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html >
  )
}
