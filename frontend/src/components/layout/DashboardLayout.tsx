import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarCollapseProvider, useSidebarCollapse } from "./SidebarContext";
import DotField from "../DotField";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex h-screen w-screen overflow-visible bg-background">
      <div style={{ width: "100%", height: "600px", position: "relative" }}>
        <DotField
          dotRadius={1}
          dotSpacing={15}
          bulgeStrength={67}
          glowRadius={140}
          sparkle
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#A855F7"
          gradientTo="#ff0000"
          glowColor="#000000"
        />
      </div>
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
