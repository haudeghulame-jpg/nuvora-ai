"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { parseProfile } from "../../lib/accounts/parse-profile";
import type { UserProfile } from "../../lib/accounts/profile";
import { isFirebaseConfigured } from "../../lib/firebase/config";
import { getFirebaseAuth, getFirebaseDb } from "../../lib/firebase/client";

// Who is signed in and what their stored profile says. The profile shown here
// is for display only: every real decision is made by the Firestore rules and
// by the server.
export type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      user: User;
      profile: UserProfile | null;
      profileState: "loading" | "ready" | "missing" | "error";
    };

const AuthContext = createContext<AuthState>({ status: "loading" });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The settings are inserted at build time, so the server and the browser
  // agree on this first value.
  const [state, setState] = useState<AuthState>(() =>
    isFirebaseConfigured() ? { status: "loading" } : { status: "unconfigured" },
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) return;

    let stopProfile: (() => void) | null = null;

    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile?.();
      stopProfile = null;

      if (!user) {
        setState({ status: "signedOut" });
        return;
      }

      setState({
        status: "signedIn",
        user,
        profile: null,
        profileState: "loading",
      });

      stopProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          // "estimate" avoids an empty date while the server time is pending.
          const data = snapshot.data({ serverTimestamps: "estimate" });
          const profile = data ? parseProfile(data) : null;
          setState({
            status: "signedIn",
            user,
            profile,
            profileState: !snapshot.exists()
              ? "missing"
              : profile
                ? "ready"
                : "error",
          });
        },
        () =>
          setState({
            status: "signedIn",
            user,
            profile: null,
            profileState: "error",
          }),
      );
    });

    return () => {
      stopProfile?.();
      stopAuth();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
