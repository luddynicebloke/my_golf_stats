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
  const isAllowed = () => auth.initialized() && !auth.loading() && Boolean(auth.user());

  createEffect(() => {
    if (auth.initialized() && !auth.loading() && !auth.user()) {
      nav(redirectTo, { replace: true });
    }
  });

  return (
    <Show when={isAllowed()} fallback={
      <div class='mx-auto p-4 flex flex-col items-center '>
        <div class='lds-dual-ring '></div>
      </div>
    }>
      {props.children}
    </Show>
  );
};
