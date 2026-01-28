
'use client';

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { useAuth } from '../provider';

export function useAuthActions() {
    const auth = useAuth();

    const signUp = (email: string, password: string) => {
        if (!auth) throw new Error("Auth not initialized");
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const signIn = (email: string, password: string) => {
        if (!auth) throw new Error("Auth not initialized");
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        if (!auth) throw new Error("Auth not initialized");
        return signOut(auth);
    };

    return { signUp, signIn, logout };
}
