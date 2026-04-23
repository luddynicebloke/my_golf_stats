import { Component, Show, createEffect, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { type Role, useAuth } from "../context/AuthProvider";

type Props = {
  children: JSX.Element;
  redirectTo?: string;
  allowedRoles?: Role[];
  forbiddenRedirectTo?: string;
};

export const ProtectedRoute: Component<Props> = (props) => {
  const auth = useAuth();
  const nav = useNavigate();
  const redirectTo = props.redirectTo ?? "/signin";
  const forbiddenRedirectTo = props.forbiddenRedirectTo ?? "/dashboard";
  const hasAllowedRole = () => {
    if (!props.allowedRoles || props.allowedRoles.length === 0) {
      return true;
    }

    const currentRole = auth.role();
    return currentRole != null && props.allowedRoles.includes(currentRole);
  };
  const isAllowed = () =>
    auth.initialized() &&
    !auth.loading() &&
    Boolean(auth.user()) &&
    hasAllowedRole();

  createEffect(() => {
    if (!auth.initialized() || auth.loading()) {
      return;
    }

    if (!auth.user()) {
      nav(redirectTo, { replace: true });
      return;
    }

    if (!hasAllowedRole()) {
      nav(forbiddenRedirectTo, { replace: true });
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
