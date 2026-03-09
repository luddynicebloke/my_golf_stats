import type { ParentComponent } from "solid-js";
import Sidenav from "./sidenav";

const DashLayout: ParentComponent = (props) => {
  return (
    <div class='min-h-screen bg-slate-100'>
      <div class='mx-auto flex min-h-screen w-full max-w-[1600px] flex-col md:flex-row md:overflow-hidden'>
        <div class='w-full flex-none border-b border-slate-200 bg-white md:w-72 md:border-b-0 md:border-r'>
          <Sidenav />
        </div>
        <main class='grow p-4 md:overflow-y-auto md:p-8 lg:p-10'>
          <div class='mx-auto w-full max-w-7xl'>{props.children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashLayout;
