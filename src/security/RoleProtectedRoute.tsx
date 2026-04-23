import type { Component, JSX } from "solid-js";

import { createEffect, Show } from "solid-js";

import { useNavigate } from "@solidjs/router";
import { useAuth } from "../context/AuthProvider";

type Props = {
  requiredRole: "admin" | "user";
  children: JSX.Element;
  redirectTo?: string;
};

export const RoleProtectedRoute: Component<Props> = (props) => {
  const { user, initialized, loading, role } = useAuth();
  const navigate = useNavigate();
  const redirectTo = props.redirectTo ?? "/";
  const isAllowed = () =>
    initialized() &&
    !loading() &&
    Boolean(user()) &&
    role() === props.requiredRole;

  createEffect(() => {
    // wait until the provider has carried out the initial session check
    if (initialized() && !loading()) {
      const currentUser = user();
      const userRole = role();
      // this is where the user/admin rights happen
      if (!currentUser) {
        navigate("/signin", { replace: true });
      } else if (userRole !== props.requiredRole) {
        navigate(redirectTo, { replace: true }); // e.g. /not autherised page
      }
    }
  });

  return (
    <Show when={isAllowed()} fallback={""}>
      {props.children}
    </Show>
  );
};
