import type { AuthRecord } from 'pocketbase';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { queryClient } from '@/lib/queryClient';

// 1. Création du contexte
const AuthContext = createContext<{ user: AuthRecord | null; isInitialized: boolean }>({ user: null, isInitialized: false });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthRecord | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // 2. Synchronisation initiale (uniquement sur le client)
        setUser(pb.authStore.record);
        setIsInitialized(true);

        // 3. Écouteur global pour les changements (Login/Logout)
        const removeListener = pb.authStore.onChange((token, record) => {
            setUser(record);
            queryClient.setQueryData(['currentUser'], record);
            if (!token) queryClient.clear();
        });

        return () => removeListener(); // Nettoyage
    }, []);

    return (
        <AuthContext.Provider value={{ user, isInitialized }}>
            {/* On peut choisir de ne rien afficher tant que l'app n'est pas prête */}
            {children}
        </AuthContext.Provider>
    );
}

// Hook personnalisé pour consommer le contexte
export const useAuth = () => useContext(AuthContext);