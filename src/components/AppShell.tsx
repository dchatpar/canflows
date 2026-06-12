/**
 * AppShell — persistent layout for authenticated pages.
 * Canada.ca-inspired: GC top bar, sidebar nav (navy), content area.
 */
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import Logo from "@/components/Logo.tsx";
import GCTopBar from "@/components/GCTopBar.tsx";
import TenantSwitcher from "@/components/TenantSwitcher.tsx";
import { useLanguage } from "@/contexts/language-context.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  ClipboardList,
  Inbox,
  Timer,
  BarChart3,
  KeyRound,
  ShieldCheck,
  Settings,
  Building2,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Webhook,
  FileOutput,
  PenLine,
  Brain,
  Accessibility,
  ShieldAlert,
  Server,
  BadgeCheck,
} from "lucide-react";

type NavItem = {
  icon: React.ElementType;
  labelKey: keyof ReturnType<typeof useLanguage>["t"];
  href: string;
  section?: keyof ReturnType<typeof useLanguage>["t"];
  comingSoon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "navDashboard", href: "/app/dashboard", comingSoon: true },
  { icon: FileText, labelKey: "navForms", href: "/forms" },
  { icon: GitBranch, labelKey: "navWorkflows", href: "/workflows" },
  { icon: ClipboardList, labelKey: "navSubmissions", href: "/submissions" },
  { icon: Inbox, labelKey: "navTasks", href: "/tasks" },
  { icon: Timer, labelKey: "navSla", href: "/sla" },
  { icon: Webhook, labelKey: "navApiIntegrations", href: "/api-integrations" },
  { icon: FileOutput, labelKey: "navDocuments", href: "/documents" },
  { icon: PenLine, labelKey: "navEsignature", href: "/esignature" },
  { icon: BarChart3, labelKey: "navAnalytics", href: "/analytics" },
  { icon: Brain, labelKey: "navIntelligence", href: "/intelligence" },
  { icon: Accessibility, labelKey: "navAccessibility", href: "/accessibility" },
  { icon: ShieldAlert, labelKey: "navSecurity", href: "/security" },
  { icon: BadgeCheck, labelKey: "navCompliance", href: "/compliance" },
  { icon: Server, labelKey: "navAdminConsole", href: "/admin-console" },
  { icon: KeyRound, labelKey: "navCredentials", href: "/credentials" },
  { icon: Building2, labelKey: "navTenants", href: "/tenants" },
  { icon: ShieldCheck, labelKey: "navAdmin", href: "/admin" },
  { icon: Settings, labelKey: "navSettings", href: "/app/settings", comingSoon: true },
];

function NavItemRow({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
  const { t } = useLanguage();
  const label = t[item.labelKey] as string;

  const handleComingSoon = (e: React.MouseEvent) => {
    if (item.comingSoon) {
      e.preventDefault();
      toast.info(`${label} — Coming soon in a future milestone!`);
    }
    onClick?.();
  };

  return (
    <NavLink
      to={item.href}
      onClick={handleComingSoon}
      aria-label={collapsed ? label : undefined}
      aria-current={undefined /* react-router sets aria-current="page" automatically */}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
          "text-[#c9d0e0] hover:bg-white/10 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#284162]",
          isActive && !item.comingSoon && "bg-white/15 text-white",
          collapsed && "justify-center px-2"
        )
      }
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" focusable="false" />
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}
      {!collapsed && item.comingSoon && (
        <span
          className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50"
          aria-label={`(${t.comingSoon})`}
        >
          {t.comingSoon}
        </span>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { t } = useLanguage();
  const auth = useAuth();
  const user = auth.user;

  const handleSignout = () => {
    // removeUser clears local session; signout is available in newer versions
    const a = auth as unknown as Record<string, unknown>;
    if (typeof a["signout"] === "function") {
      void (a["signout"] as () => Promise<void>)();
    } else if (typeof a["removeUser"] === "function") {
      void (a["removeUser"] as () => Promise<void>)();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className={cn("flex items-center border-b border-white/10 py-4", collapsed ? "justify-center px-2" : "px-4 gap-2")}>
        <Logo light showText={!collapsed} />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-auto rounded p-1 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tenant switcher */}
      <div className="px-2 py-2 border-b border-white/10">
        <Authenticated>
          <TenantSwitcher collapsed={collapsed} />
        </Authenticated>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItemRow key={item.href} item={item} collapsed={collapsed} onClick={onClose} />
        ))}
      </nav>

      {/* User profile */}
      <div className={cn("border-t border-white/10 p-3", collapsed ? "flex justify-center" : "")}>
        <Authenticated>
          <div className={cn("flex items-center gap-2 rounded-md px-2 py-2", !collapsed && "w-full")}>
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">
              {user?.profile.name?.[0]?.toUpperCase() ?? <User className="size-4" />}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-white">{user?.profile.name ?? "User"}</p>
                  <p className="truncate text-[10px] text-white/50">{user?.profile.email ?? ""}</p>
                </div>
                <button
            onClick={() => handleSignout()}
            title={t.signOut}
            aria-label={t.signOut}
            className="rounded p-1 text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition"
          >
                  <LogOut className="size-4" />
                </button>
              </>
            )}
          </div>
        </Authenticated>
        <Unauthenticated>
          {collapsed ? (
            <SignInButton className="w-full" />
          ) : (
            <div className="px-1">
              <SignInButton className="w-full" />
            </div>
          )}
        </Unauthenticated>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* GC Top Bar */}
      <GCTopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          aria-label="Application sidebar"
          className={cn(
            "hidden md:flex flex-col flex-shrink-0 bg-[#284162] transition-all duration-200",
            collapsed ? "w-14" : "w-60"
          )}
        >
          <SidebarContent collapsed={collapsed} />
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center border-t border-white/10 py-3 text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <ChevronRight className={cn("size-4 transition-transform", !collapsed && "rotate-180")} />
          </button>
        </aside>

          {/* Mobile overlay sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#284162]" aria-label="Mobile navigation">
              <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden" role="banner">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Logo />
          </header>

          {/* Page content */}
          <main id="main-content" className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
