import { useSidebarCollapse } from "./SidebarContext";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Wrench,
  TrendingUp,
  Map,
  Bookmark,
  User,
  Settings,
  HelpCircle,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type NavEntry = { label: string; icon: React.ElementType; to?: string };

const mainNav = [
  { label: "Discover Tools", icon: Wrench, to: "/" },
  { label: "My Roadmaps", icon: Map, to: "/roadmap" },
  { label: "Trends", icon: TrendingUp, to: "/trends" },
  { label: "Bookmarks", icon: Bookmark },
  { label: "Profile", icon: User },
];

const toolsNav: NavEntry[] = [
  { label: "Settings", icon: Settings },
  { label: "Help", icon: HelpCircle },
  { label: "Feedback", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed, setCollapsed } = useSidebarCollapse();

  return (
    <aside
      style={{
        width: collapsed ? "72px" : "240px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className="fixed left-[20px] top-[20px] z-30 flex h-auto flex-col rounded-[18px] px-4 py-6 overflow-hidden bg-transparent"
    >
      {/* Right-side separator line — fades away when collapsed */}
      <div
        className="pointer-events-none absolute right-0 top-[5%] h-[90%] w-px"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--border, rgba(255,255,255,0.08)) 20%, var(--border, rgba(255,255,255,0.08)) 80%, transparent)",
          opacity: collapsed ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Toggle button — sits at top */}
      <div className="mb-6 flex items-center justify-end px-1">
        <button
          id="sidebar-toggle-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--surface-dark-active)] hover:text-foreground"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1">
        {mainNav.map((item) => (
          <NavItem
            key={item.label}
            {...item}
            active={!!item.to && item.to === pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Separator line inside sidebar menu items */}
      <div className="my-4 border-t border-[var(--border,rgba(255,255,255,0.08))]" />

      {/* Bottom nav grouped together with no mt-auto */}
      <nav className="flex flex-col gap-1">
        {toolsNav.map((item) => (
          <NavItem key={item.label} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  to,
  collapsed,
}: NavEntry & { active?: boolean; collapsed: boolean }) {
  const itemClassName = `group relative flex items-center gap-4 rounded-2xl px-2 py-2.5 text-[14px] font-regular transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  const iconClassName = `flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--surface-dark-active)] transition-all ${active ? "opacity-100" : "opacity-70 hover:opacity-100"
    }`;

  const content = (
    <>
      <div className={iconClassName}>
        <Icon className="h-[18px] w-[18px]" />
      </div>

      {/* Label — fades and collapses out */}
      <span
        className="whitespace-nowrap overflow-hidden"
        style={{
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? "0px" : "160px",
          transition: "opacity 0.15s ease, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {label}
      </span>

      {/* Tooltip — only visible when collapsed */}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-[var(--surface-dark-active)] px-3 py-1.5 text-[13px] font-medium text-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100"
          style={{ transitionDelay: "0.05s" }}
        >
          {/* Arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--surface-dark-active)]" />
          {label}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={itemClassName}>
        {content}
      </Link>
    );
  }

  return (
    <a href="#" className={itemClassName}>
      {content}
    </a>
  );
}
