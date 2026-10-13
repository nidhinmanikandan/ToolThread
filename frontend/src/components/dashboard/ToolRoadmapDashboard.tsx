import ToolTree from "../ToolTree";
import type { ToolRoadmap } from "@/types/roadmap";

type Props = {
  tool: ToolRoadmap;
};

function getLogoSrc(tool: ToolRoadmap) {
  if (tool?.logoDomain) {
    return `https://www.google.com/s2/favicons?sz=128&domain=${tool.logoDomain}`;
  }

  if (tool?.logo) {
    return tool.logo;
  }

  return null;
}

export function ToolRoadmapDashboard({ tool }: Props) {
  const logoSrc = getLogoSrc(tool);

  return (
    <div className="relative flex h-full min-h-screen w-full overflow-visible">
      <div className="absolute inset-0 z-0 overflow-visible">
        <ToolTree tool={tool} />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col gap-8 overflow-visible pointer-events-none">
        <div className="mb-12 flex items-start gap-2 pointer-events-auto">
          <div className="mt-[16px] flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm pointer-events-auto">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`${tool.title} logo`}
                className="h-24 w-24 rounded-md object-contain"
              />
            ) : (
              <span className="text-xl font-semibold">{tool.title?.charAt(0) || "T"}</span>
            )}
          </div>

          <div className="mt-[16px] flex-col justify-center pointer-events-auto">
            <h1 className="text-[40px] font-regular">{tool.title}</h1>
            <p className="mt-2 text-[16px] text-muted-foreground max-w-[350px]">
              {tool.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
