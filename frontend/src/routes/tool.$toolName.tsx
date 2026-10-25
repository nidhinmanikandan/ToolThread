import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToolRoadmapDashboard } from "@/components/dashboard/ToolRoadmapDashboard";
import { api } from "@/services/api";
import { getSelectedTool } from "@/lib/toolStore";

export const Route = createFileRoute("/tool/$toolName")({
  component: ToolRoadmapPage,
});

function ToolRoadmapPage() {
  const { toolName } = Route.useParams();

  const [tool, setTool] = useState<any>(null);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const selectedTool = getSelectedTool();

        if (!selectedTool) {
          throw new Error("No selected tool");
        }

        const roadmap = await api.getToolRoadmap(selectedTool);

        setTool({
          ...roadmap,
          logo: roadmap.logo || selectedTool.logo,
          logoDomain: roadmap.logoDomain || selectedTool.logoDomain || "",
          officialUrl: selectedTool.officialUrl,
        });
      } catch (err) {
        console.error(err);
      }
    }

    loadRoadmap();
  }, [toolName]);

  if (!tool) {
    return (
      <DashboardLayout>
        <div className="p-10">Generating roadmap...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ToolRoadmapDashboard tool={tool} />
    </DashboardLayout>
  );
}
