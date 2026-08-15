import { useNavigate } from "@tanstack/react-router";

import { SectionCard } from "./SectionCard";
import { ToolCard } from "./ToolCard";

import type { AiTool } from "@/types";
import { setSelectedTool } from "@/lib/toolStore";

export function TrendingTools({ tools }: { tools: AiTool[] }) {
  const navigate = useNavigate();

  return (
    <SectionCard title="For You" action="View all" actionArrow className="ml-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard
            key={tool.name}
            tool={tool}
            onClick={() => {
              setSelectedTool(tool);

              navigate({
                to: "/tool/$toolName",
                params: {
                  toolName: tool.name,
                },
              });
            }}
          />
        ))}
      </div>
    </SectionCard>
  );
}
