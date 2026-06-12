/**
 * TenantContext — tracks which tenant the current user is "working in".
 * Persisted in localStorage so the selection survives refreshes.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type TenantSummary = {
  _id: Id<"tenants">;
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  logoUrl?: string;
  role: string;
};

type TenantContextValue = {
  tenants: TenantSummary[];
  activeTenant: TenantSummary | null;
  setActiveTenant: (t: TenantSummary | null) => void;
  isLoading: boolean;
};

const TenantContext = createContext<TenantContextValue>({
  tenants: [],
  activeTenant: null,
  setActiveTenant: () => undefined,
  isLoading: true,
});

const STORAGE_KEY = "canflow_active_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!user;
  const tenants = useQuery(api.tenants.listMine, isAuthenticated ? {} : "skip");
  const [activeTenant, setActiveTenantState] = useState<TenantSummary | null>(null);

  // Restore persisted selection once tenants load
  useEffect(() => {
    if (!tenants) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = tenants.find((t) => t._id === saved) ?? null;
      setActiveTenantState(found ?? tenants[0] ?? null);
    } else {
      setActiveTenantState(tenants[0] ?? null);
    }
  }, [tenants]);

  const setActiveTenant = (t: TenantSummary | null) => {
    setActiveTenantState(t);
    if (t) {
      localStorage.setItem(STORAGE_KEY, t._id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenants: tenants ?? [],
        activeTenant,
        setActiveTenant,
        isLoading: tenants === undefined,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  return useContext(TenantContext);
}
