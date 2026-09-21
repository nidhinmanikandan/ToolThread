import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ToolCard } from "@/components/dashboard/ToolCard";
import { api } from "@/services/api";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
});

function DiscoverPage() {
  const [tools, setTools] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getFeed({ type: "popular", limit: 12 }).then((data) => {
      setTools(data.tools || []);
    });
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-3">Recommended Tools For You</h1>

      <p className="text-muted-foreground mb-8">Based on your learning profile.</p>

      <div className="space-y-4">
        {tools.map((tool: any) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  );
}
