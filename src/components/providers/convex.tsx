import { ConvexProviderWithHerculesAuth } from "@usehercules/auth/convex-react";
import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (!convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithHerculesAuth client={convexClient}>
      {children}
    </ConvexProviderWithHerculesAuth>
  );
}
