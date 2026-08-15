import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TrendingTools } from "@/components/dashboard/TrendingTools";

import { api } from "@/services/api";
import type { AiTool } from "@/types";

export const Route = createFileRoute("/ai-tools")({
  component: AiToolsPage,
});

export function AiToolsPage() {
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/recommendations")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setTools(data);
      });
  }, []);

  return (
    <DashboardLayout>
      <section className="mb-[32px] mt-[80px] flex flex-col items-center justify-center text-center">
        <h1 className="text-[80px] font-regular text-foreground tracking-[-0.04em] mb-4 leading-[1.0] w-[600px]">
          Discover Tools That Fit You.
        </h1>

        {/* <p className="text-[20px] text-[var(--text-soft-muted)] tracking-[-0.04em] mb-8 max-w-[500px]">
          Explore trending tools and generate learning roadmaps for them.
        </p> */}

        {/* Search Bar Container under Hero Heading */}
        <div className="relative w-full max-w-[500px] mt-[16px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search AI tools, trends, technologies…"
            className="w-full h-14 rounded-[20px] bg-[var(--surface-dark)] pl-12 pr-16 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:bg-[var(--surface-dark-hover)] transition border border-[var(--border,rgba(255,255,255,0.08))]"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            ⌘ K
          </kbd>
        </div>
      </section>

      <TrendingTools tools={tools} />
    </DashboardLayout>
  );
}
