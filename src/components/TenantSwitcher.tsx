/**
 * TenantSwitcher — compact dropdown in the sidebar to switch active tenant.
 */
import { useTenant } from "@/contexts/tenant-context.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export default function TenantSwitcher({ collapsed }: { collapsed: boolean }) {
  const { tenants, activeTenant, setActiveTenant } = useTenant();

  if (tenants.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 w-full rounded-md px-2 py-2 text-left text-sm text-[#c9d0e0]",
            "hover:bg-white/10 transition-colors cursor-pointer",
            collapsed && "justify-center",
          )}
          title={collapsed ? (activeTenant?.name ?? "Select tenant") : undefined}
        >
          <div
            className="flex size-5 shrink-0 items-center justify-center rounded text-white text-[10px] font-bold"
            style={{ backgroundColor: activeTenant?.primaryColor ?? "#4a6fa5" }}
          >
            {activeTenant?.name[0] ?? <Building2 className="size-3" />}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-xs font-medium">
                {activeTenant?.name ?? "Select organisation"}
              </span>
              <ChevronDown className="size-3 shrink-0 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Organisation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t._id}
            onClick={() => setActiveTenant(t)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div
              className="flex size-5 items-center justify-center rounded text-white text-[10px] font-bold"
              style={{ backgroundColor: t.primaryColor ?? "#4a6fa5" }}
            >
              {t.name[0]}
            </div>
            <span className="truncate text-sm">{t.name}</span>
            {activeTenant?._id === t._id && (
              <span className="ml-auto text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
