import { Component, Show, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "../context/AuthProvider";

type Props = {
  children: any; // JSX.Element or component
  redirectTo?: string;
};

export const ProtectedRoute: Component<Props> = (props) => {
  const auth = useAuth();
  const nav = useNavigate();
  const redirectTo = props.redirectTo ?? "/signin";

  createEffect(() => {
    // If loading, do nothing; once loading=false check user
    if (!auth.loading()) {
      if (!auth.user()) {
        // Not authenticated -> navigate to login
        nav(redirectTo, { replace: true });
      }
    }
  });

  return (
    <Show when={auth.loading()} fallback={props.children}>
      {/* Loading UI while verifying session */}
      <div class='mx-auto p-4 flex flex-col items-center '>
        <div class='lds-dual-ring '></div>
      </div>
    </Show>
  );
};
