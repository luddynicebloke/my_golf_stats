import { A } from "@solidjs/router";
import { createSignal } from "solid-js";

export default function NotFound() {
  return (
    <div class='mt-25 mx-auto flex h-screen flex-col items-center align-center gap-4 text-center'>
      <h1 class='text-9xl font-bold text-blue-700/80 '>404</h1>
      <p class='text-4xl font-semibold'>Something's missing.</p>
      <p>
        Sorry, but we are unable to find the page you're looking for. Head back
        to the dashboard.
      </p>
      <A
        class='bg-blue-700/80 text-gray-100 px-4 py-3 rounded-md'
        href='/dashboard'
      >
        Go Back to Dashboard
      </A>
    </div>
  );
}
