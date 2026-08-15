import { Bell, ChevronDown, Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-20 flex h-auto py-4 items-center justify-between bg-background/80 backdrop-blur-xl pr-[48px] pl-[48px]"
      
      
    >
      {/* Top Left Logo & App Name */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--surface-dark-active)]">
          <Sparkles className="h-4 w-4 text-foreground" />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-foreground">ToolThread</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative h-10 w-10 grid place-items-center rounded-[16px] bg-[var(--surface-dark-hover)] hover:bg-[var(--surface-dark-active)] transition"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] text-foreground" />
          ) : (
            <Moon className="h-[18px] w-[18px] text-foreground" />
          )}
        </button>
        <button className="relative h-10 w-10 grid place-items-center rounded-[16px] bg-[var(--surface-dark-hover)] hover:bg-[var(--surface-dark-active)] transition">
          <Bell className="h-[18px] w-[18px] text-foreground" />
          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>
        <button className="flex items-center gap-1.5 rounded-[16px] bg-[var(--surface-dark-hover)] pl-1 pr-2.5 py-1 hover:bg-[var(--surface-dark-active)] transition">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
