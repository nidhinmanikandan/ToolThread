import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type SidebarCollapseContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
};

const SidebarCollapseContext = createContext<SidebarCollapseContextType | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <SidebarCollapseContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) throw new Error("useSidebarCollapse must be used within SidebarCollapseProvider");
  return ctx;
}
