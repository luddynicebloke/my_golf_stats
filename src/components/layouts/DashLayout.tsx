import type { ParentComponent } from "solid-js";
import Sidenav from "./sidenav";

const DashLayout: ParentComponent = (props) => {
  return (
    <div class='flex flex-col h-screen md:flex-row md:overflow-hidden'>
      <div class='w-full flex-none md:w-64'>
        <Sidenav />
      </div>
      <div class='grow p-6 md:overflow-y-auto md:p-12 '>{props.children}</div>
    </div>
  );
};

export default DashLayout;
