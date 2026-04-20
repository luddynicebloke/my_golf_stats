/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";

// translating pages
import { TransProvider } from "@mbarzda/solid-i18next";
import i18n from "./i18n/index";

import App from "./App";
import { AuthProvider } from "./context/AuthProvider";

if (import.meta.env.DEV) {
  void import("solid-devtools");
}

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <AuthProvider>
      <TransProvider instance={i18n}>
        <App />
      </TransProvider>
    </AuthProvider>
  ),
  root!
);
