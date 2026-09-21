import { motion } from "motion/react";
import { Bookmark, ArrowRight } from "lucide-react";
import type { AiTool } from "@/types";

type ToolCardProps = {
  tool: AiTool;
  onClick?: () => void;
};

export function ToolCard({ tool, onClick }: ToolCardProps) {
  const logoDomain = tool.logoDomain || "github.com";
  const displayTag = tool.tag || (tool.tags && tool.tags.length > 0 ? tool.tags[0] : tool.category || "AI");
  const displayPopularity =
    tool.popularity ||
    (tool.githubStars
      ? tool.githubStars >= 1000
        ? `${(tool.githubStars / 1000).toFixed(1)}k ⭐`
        : `${tool.githubStars} ⭐`
      : "");

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-[var(--surface-dark)] p-[20px] hover:bg-[var(--surface-dark-hover)] transition cursor-pointer group"
    >
      <div className="flex items-start gap-2">
        <div className="h-11 w-11 rounded-xl bg-[var(--surface-dark)] flex items-center justify-center">
          <img
            src={`https://www.google.com/s2/favicons?sz=128&domain=${logoDomain}`}
            alt={tool.name}
            className="w-10 h-10 rounded-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-semibold text-foreground">{tool.name}</h3>
              <span className="inline-block mt-1 rounded-md bg-[var(--surface-dark-hover)] px-2 py-0.5 text-[10px] font-light">
                {tool.category}
              </span>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition">
              <Bookmark className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex-1">
          <div className="flex h-[64px] justify-start">
            <p className="text-[12px] text-[var(--text-soft-muted)] leading-snug tracking-[-0.04] font-regular">
              {tool.description}
            </p>
          </div>
          <span className="inline-block mt-2 text-[11px] text-[var(--text-soft-muted)]">
            #{displayTag}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[12px] font-medium text-foreground">
          {displayPopularity}
          <span className="inline-block mt-2 text-[10px] font-light pb-1">Learn More</span>
          <ArrowRight className="h-3 w-3 text-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
