import type { ParentComponent } from "solid-js";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { fetchAccessiblePlayersForPro, type AccessiblePlayer } from "../supabase/proAccess";

import {
  createSignal,
  createContext,
  useContext,
  onCleanup,
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
  user_name?: string;
  category_code?: string;
  preferred_distance_unit?: string;
};

type ProfileData = {
  user_name: string | null;
  email: string | null;
  avatar_url: string | null;
  category: { code: string | null; id: number | null; name: string } | null;

  preferred_distance_unit: string | null;
};

export type Role = "admin" | "user" | "pro";

type AuthContextType = {
  user: () => User | null; // supabase user object
  session: () => Session | null; // supabase session object
  metaData: () => UserMetadata | null;
  profile: () => ProfileData | null;
  refreshProfile: () => Promise<void>;
  refreshAccessiblePlayers: () => Promise<void>;
  role: () => Role | null;
  accessiblePlayers: () => AccessiblePlayer[];
  selectedPlayer: () => AccessiblePlayer | null;
  selectedPlayerId: () => string | null;
  setSelectedPlayerId: (playerId: string | null) => void;
  targetUserId: () => string | null;
  isReadOnly: () => boolean;
  loading: () => boolean; // true while initial session is loading or signing in/out
  initialized: () => boolean; // true when first session check finished
  // signUp: (email: string, password: string) => Promise<void>;
  update: (user: UserProfile) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>();
const SELECTED_PLAYER_STORAGE_KEY = "sg:selected-pro-player-id";
const AUTH_REQUEST_TIMEOUT_MS = 15000;

const withAuthTimeout = <T,>(
  request: PromiseLike<T>,
  message: string,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, AUTH_REQUEST_TIMEOUT_MS);

    void Promise.resolve(request)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeoutId));
  });

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [metaData, setMetaData] = createSignal<UserMetadata | null>(null);
  const [session, setSession] = createSignal<Session | null>(null);
  const [profile, setProfile] = createSignal<ProfileData | null>(null);
  const [role, setRole] = createSignal<Role | null>(null);
  const [accessiblePlayers, setAccessiblePlayers] = createSignal<
    AccessiblePlayer[]
  >([]);
  const [selectedPlayerId, setSelectedPlayerIdState] = createSignal<
    string | null
  >(typeof window === "undefined"
    ? null
    : window.localStorage.getItem(SELECTED_PLAYER_STORAGE_KEY));
  const [loading, setLoading] = createSignal<boolean>(true);
  const [initialized, setInitialized] = createSignal<boolean>(false);
  let authHydrationRequestId = 0;
  let authChangeTimerId: number | undefined;

  const ensureProfileExists = async (
    currentUser: User,
    userMetadata: UserMetadata | null,
  ): Promise<ProfileData | null> => {
    const categoryCode = userMetadata?.category_code?.trim();
    let categoryId: number | null = null;

    if (categoryCode) {
      const { data: categoryRow, error: categoryError } = await supabase
        .from("category")
        .select("id")
        .eq("code", categoryCode)
        .maybeSingle();

      if (categoryError) {
        console.error("Failed to resolve signup category:", categoryError);
      } else {
        categoryId = categoryRow?.id == null ? null : Number(categoryRow.id);
      }
    }

    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email ?? userMetadata?.email ?? null,
      user_name: userMetadata?.user_name ?? userMetadata?.name ?? null,
      avatar_url: userMetadata?.avatar_url ?? null,
      category_id: categoryId,
      preferred_distance_unit: userMetadata?.preferred_distance_unit ?? "yards",
      role: "user",
    };

    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertError) {
      console.error("Failed to create missing profile row:", upsertError);
      return null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "user_name, email, avatar_url, category_id, preferred_distance_unit",
      )
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to reload profile after creation:", error);
      return null;
    }

    return (data as ProfileData | null) ?? null;
  };

  // fetch the user's role
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (!error && data) {
      const nextRole =
        data.role === "admin" || data.role === "pro" ? data.role : "user";
      setRole(nextRole);
      return;
    }

    setRole(null);
  };

  const setSelectedPlayerId = (playerId: string | null) => {
    setSelectedPlayerIdState(playerId);

    if (typeof window === "undefined") {
      return;
    }

    if (playerId) {
      window.localStorage.setItem(SELECTED_PLAYER_STORAGE_KEY, playerId);
      return;
    }

    window.localStorage.removeItem(SELECTED_PLAYER_STORAGE_KEY);
  };

  const refreshAccessiblePlayers = async () => {
    if (role() !== "pro") {
      setAccessiblePlayers([]);
      setSelectedPlayerId(null);
      return;
    }

    const players = await fetchAccessiblePlayersForPro();
    setAccessiblePlayers(players);

    const currentSelectedPlayerId = selectedPlayerId();
    const hasSelectedPlayer = players.some(
      (player) => player.id === currentSelectedPlayerId,
    );

    if (hasSelectedPlayer) {
      return;
    }

    setSelectedPlayerId(players[0]?.id ?? null);
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
        "user_name, email, avatar_url, category:category_id(id, code, name), preferred_distance_unit",
      )
      .eq("id", currentUser.id)
      .maybeSingle<ProfileData>();

    if (error) {
      setProfile(null);
      return;
    }

    if (!data) {
      const createdProfile = await ensureProfileExists(currentUser, metaData());
      setProfile(createdProfile);
      return;
    }

    setProfile(data as ProfileData);
  };

  const clearSignedOutState = () => {
    setRole(null);
    setProfile(null);
    setAccessiblePlayers([]);
    setSelectedPlayerId(null);
  };

  const hydrateSession = async (
    nextSession: Session | null,
    completeInitialLoad = false,
  ) => {
    const requestId = ++authHydrationRequestId;

    setLoading(true);
    setSession(nextSession ?? null);
    setUser(nextSession?.user ?? null);
    setMetaData(nextSession?.user?.user_metadata as UserMetadata | null);

    try {
      if (!nextSession?.user) {
        clearSignedOutState();
        return;
      }

      await withAuthTimeout(
        fetchUserRole(nextSession.user.id),
        "Timed out while loading the user role.",
      );
      if (requestId !== authHydrationRequestId) return;

      await withAuthTimeout(
        refreshProfile(),
        "Timed out while loading the user profile.",
      );
      if (requestId !== authHydrationRequestId) return;

      await withAuthTimeout(
        refreshAccessiblePlayers(),
        "Timed out while loading accessible players.",
      );
    } catch (error) {
      if (requestId !== authHydrationRequestId) return;

      console.error("Failed to hydrate auth state:", error);
      setRole(null);
      setProfile(null);
      setAccessiblePlayers([]);
    } finally {
      if (requestId !== authHydrationRequestId) {
        if (completeInitialLoad) {
          setInitialized(true);
        }
        return;
      }

      setLoading(false);
      if (completeInitialLoad) {
        setInitialized(true);
      }
    }
  };

  onMount(() => {
    void (async () => {
      try {
        const {
          data: { session },
        } = await withAuthTimeout(
          supabase.auth.getSession(),
          "Timed out while loading the current auth session.",
        );

        await hydrateSession(session ?? null, true);
      } catch (error) {
        console.error("Failed to load auth session:", error);

        if (!user()) {
          setSession(null);
          setUser(null);
          setMetaData(null);
          clearSignedOutState();
        }

        setLoading(false);
        setInitialized(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (authChangeTimerId != null) {
          window.clearTimeout(authChangeTimerId);
        }

        authChangeTimerId = window.setTimeout(() => {
          void hydrateSession(newSession ?? null, false);
        }, 0);
      },
    );

    onCleanup(() => {
      if (authChangeTimerId != null) {
        window.clearTimeout(authChangeTimerId);
      }

      sub.subscription.unsubscribe();
    });
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
    setAccessiblePlayers([]);
    setSelectedPlayerId(null);
    await supabase.auth.signOut({ scope: "local" });
  }

  const selectedPlayer = () =>
    accessiblePlayers().find((player) => player.id === selectedPlayerId()) ??
    null;
  const targetUserId = () =>
    role() === "pro" ? selectedPlayerId() : user()?.id ?? null;
  const isReadOnly = () => role() === "pro";

  return (
    <AuthContext.Provider
      value={{
        user,
        metaData,
        session,
        profile,
        refreshProfile,
        refreshAccessiblePlayers,
        role,
        accessiblePlayers,
        selectedPlayer,
        selectedPlayerId,
        setSelectedPlayerId,
        targetUserId,
        isReadOnly,
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
