import type { ParentComponent } from "solid-js";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

import {
  createSignal,
  createContext,
  useContext,
  onMount,
} from "solid-js";

type UserProfile = {
  email: string;
  avatar_url: string;
  category_id: string;
  units: string;
  user_role: string;
};

type UserMetadata = {
  name?: string;
  email?: string;
  avatar_url?: string;
};

type ProfileData = {
  user_name: string | null;
  email: string | null;
  avatar_url: string | null;
  category_id: string | null;
  preferred_distance_unit: string | null;
};

type Role = "admin" | "user" | "Pro";

type AuthContextType = {
  user: () => User | null; // supabase user object
  session: () => Session | null; // supabase session object
  metaData: () => UserMetadata | null;
  profile: () => ProfileData | null;
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfile] = createSignal<ProfileData | null>(null);
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

  const refreshProfile = async () => {
    const currentUser = user();
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "user_name, email, avatar_url, category_id, preferred_distance_unit",
      )
      .eq("id", currentUser.id)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data as ProfileData);
  };

  onMount(async () => {
    // get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session ?? null);
    setUser(session?.user ?? null);
    setMetaData(session?.user?.user_metadata as UserMetadata | null);
    if (session?.user) {
      await fetchUserRole(session.user.id);
      await refreshProfile();
    } else {
      setProfile(null);
    }
    setLoading(false);
    setInitialized(true);

    // Listen for session changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        setMetaData(newSession?.user?.user_metadata as UserMetadata | null);
        if (newSession?.user) {
          await fetchUserRole(newSession.user.id);
          await refreshProfile();
        } else {
          setRole(null);
          setProfile(null);
        }
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
    // Clear local auth state immediately to avoid stale UI if remote revoke fails.
    setSession(null);
    setUser(null);
    setMetaData(null);
    setRole(null);
    setProfile(null);
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        metaData,
        session,
        profile,
        refreshProfile,
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
