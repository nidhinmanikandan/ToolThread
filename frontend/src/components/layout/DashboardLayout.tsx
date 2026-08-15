import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarCollapseProvider, useSidebarCollapse } from "./SidebarContext";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex h-screen w-screen overflow-visible bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-visible">
        <Topbar />

        <main
          className="relative flex-1 min-h-screen overflow-visible px-8 pb-12"
          style={{
            paddingLeft: collapsed ? "92px" : "260px",
            transition: "padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarCollapseProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SidebarCollapseProvider>
  );
}
