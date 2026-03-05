import type { ParentComponent } from "solid-js";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

import {
  createSignal,
  createContext,
  useContext,
  onMount,
  createEffect,
} from "solid-js";

type UserProfile = {
  email: string;
  avatar_url: string;
  category: string;
  units: string;
  user_role: string;
};

type UserMetadata = {
  name?: string;
  email?: string;
  avatar_url?: string;
};

type Role = "admin" | "user" | "Pro";

type AuthContextType = {
  user: () => User | null; // supabase user object
  session: () => Session | null; // supabase session object
  metaData: () => UserMetadata | null;
  role: () => Role | null;
  loading: () => boolean; // true while initial session is loading or signing in/out
  initialized: () => boolean; // true when first session check finished
  // signUp: (email: string, password: string) => Promise<void>;
  update: (user: UserProfile) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [metaData, setMetaData] = createSignal<UserMetadata | null>(null);
  const [session, setSession] = createSignal<Session | null>(null);
  const [role, setRole] = createSignal<Role | null>(null);
  const [loading, setLoading] = createSignal<boolean>(true);
  const [initialized, setInitialized] = createSignal<boolean>(false);

  // fetch the user's role
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (!error && data) setRole(data.role as Role);
    else setRole(null);
  };

  onMount(async () => {
    // get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session ?? null);
    setUser(session?.user ?? null);
    setMetaData(session?.user?.user_metadata as UserMetadata | null);
    if (session?.user) await fetchUserRole(session.user.id);
    setLoading(false);
    setInitialized(true);

    // Listen for session changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        if (newSession?.user) await fetchUserRole(newSession.user.id);
        else setRole(null);
      },
    );

    return () => sub.subscription.unsubscribe();
  });

  // fetch profile when user changes

  function update(user: UserProfile) {
    console.log(user);
    return true;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        metaData,
        session,
        role,
        loading,
        initialized,
        update,
        signOut,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
