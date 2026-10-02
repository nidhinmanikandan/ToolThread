import { useState } from "react";
import { motion } from "motion/react";
import { Bookmark, ArrowRight } from "lucide-react";
import type { AiTool } from "@/types";

type ToolCardProps = {
  tool: AiTool;
  onClick?: () => void;
};

async function getLogoColor(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const image = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      image.close();
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const hueBuckets = Array.from({ length: 24 }, () => ({ weight: 0, red: 0, green: 0, blue: 0 }));

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3] / 255;
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;

      if (alpha < 0.5 || saturation < 0.2 || maximum < 45) continue;

      let hue = 0;
      if (maximum === red) hue = ((green - blue) / (maximum - minimum)) % 6;
      else if (maximum === green) hue = (blue - red) / (maximum - minimum) + 2;
      else hue = (red - green) / (maximum - minimum) + 4;
      hue = (((hue * 60) % 360) + 360) % 360;

      const bucket = hueBuckets[Math.floor(hue / 15) % hueBuckets.length];
      const weight = saturation * alpha;
      bucket.weight += weight;
      bucket.red += red * weight;
      bucket.green += green * weight;
      bucket.blue += blue * weight;
    }

    const dominantBucket = hueBuckets.reduce((best, bucket) =>
      bucket.weight > best.weight ? bucket : best,
    );
    if (!dominantBucket.weight) return null;

    const toHex = (value: number) => Math.round(value).toString(16).padStart(2, "0");
    return `#${toHex(dominantBucket.red / dominantBucket.weight)}${toHex(
      dominantBucket.green / dominantBucket.weight,
    )}${toHex(dominantBucket.blue / dominantBucket.weight)}`;
  } catch {
    return null;
  }
}

export function ToolCard({ tool, onClick }: ToolCardProps) {
  const [imgError, setImgError] = useState(false);
  const [logoColor, setLogoColor] = useState("#a0a0a0");

  let domain = tool.logoDomain;
  if (!domain || domain === "github.com" || domain === "npmjs.com") {
    if (tool.officialUrl) {
      try {
        const parsed = new URL(tool.officialUrl);
        const host = parsed.hostname.replace(/^www\./, "");
        if (host && host !== "github.com" && host !== "npmjs.com") {
          domain = host;
        }
      } catch {
        domain = tool.logoDomain;
      }
    }
  }

  const logoSrc =
    tool.logo || (domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null);
  const initialLetter = tool.name ? tool.name.charAt(0).toUpperCase() : "T";

  const displayTag =
    tool.tag || (tool.tags && tool.tags.length > 0 ? tool.tags[0] : tool.category || "AI");
  const displayPopularity =
    tool.popularity ||
    (tool.githubStars
      ? tool.githubStars >= 1000
        ? `${(tool.githubStars / 1000).toFixed(1)}k ⭐`
        : `${tool.githubStars} ⭐`
      : "");

  const rawDescription = tool.description || "";
  const shortDescription =
    rawDescription.length > 105 ? `${rawDescription.slice(0, 102).trim()}...` : rawDescription;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer overflow-visible rounded-2xl bg-[var(--surface-dark)] p-[20px] transition hover:bg-[var(--surface-dark-hover)]"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-visible p-[4px]">
          {logoSrc && !imgError ? (
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              className="h-11 w-11 rounded-[10px] object-contain"
              style={{ boxShadow: `0 8px 34px ${logoColor}33` }}
              onLoad={(event) => {
                void getLogoColor(event.currentTarget.currentSrc).then((color) => {
                  if (color) setLogoColor(color);
                });
              }}
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-base font-semibold text-foreground">{initialLetter}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-semibold text-foreground truncate max-w-[180px]">
                {tool.name}
              </h3>
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
          <div className="flex h-[44px] items-start justify-start overflow-hidden">
            <p className="text-[12px] text-[var(--text-soft-muted)] leading-snug tracking-[-0.04] font-regular line-clamp-2">
              {shortDescription}
            </p>
          </div>
          <span className="inline-block mt-2 text-[11px] text-[var(--text-soft-muted)] truncate max-w-[140px]">
            #{displayTag}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[12px] font-medium text-foreground shrink-0">
          {displayPopularity}
          <span className="inline-block mt-2 text-[10px] font-light pb-1">Learn More</span>
          <ArrowRight className="h-3 w-3 text-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
