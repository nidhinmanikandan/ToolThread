import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type SidebarCollapseContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
};

const SidebarCollapseContext = createContext<SidebarCollapseContextType | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const getInitial = () => {
    try {
      if (typeof window === "undefined") return true;
      const v = localStorage.getItem("sidebar-collapsed");
      return v !== null ? v === "true" : true;
    } catch {
      return true;
    }
  };

  const [collapsed, setCollapsedState] = useState<boolean>(getInitial);

  const setCollapsed: SidebarCollapseContextType["setCollapsed"] = (v) => {
    setCollapsedState((prev) => {
      const next = typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : (v as boolean);
      try {
        if (typeof window !== "undefined") localStorage.setItem("sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
