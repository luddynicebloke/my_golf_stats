import { createSignal } from "solid-js";
import LogoSG from "../assets/logo.png";

export default function NewPassword() {
  return (
    <>
      <div class='flex mx-auto min-h-full flex-col  px-6 py-12 lg:px-8'>
        <div class='sm:mx-auto sm:w-full sm:max-w-sm'>
          <img
            class='mx-auto h-40 w-auto'
            src={LogoSG}
            alt='SG Calculater Logo'
          />
          <h2 class='mt-10 text-center text-2xl/9 font-bold tracking-tight text-white'>
            Change password
          </h2>
        </div>
        <div class='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'></div>
      </div>
    </>
  );
}
