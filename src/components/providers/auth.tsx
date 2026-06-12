import { HerculesAuthProvider } from "@usehercules/auth/react";

const authAuthority = import.meta.env.VITE_HERCULES_OIDC_AUTHORITY;
const authClientId = import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!authAuthority || !authClientId) {
    return <>{children}</>;
  }

  return (
    <HerculesAuthProvider
      authority={authAuthority}
      client_id={authClientId}
      userManagerSettings={{
        prompt: import.meta.env.VITE_HERCULES_OIDC_PROMPT ?? "select_account",
        response_type:
          import.meta.env.VITE_HERCULES_OIDC_RESPONSE_TYPE ?? "code",
        scope:
          import.meta.env.VITE_HERCULES_OIDC_SCOPE ??
          "openid profile email offline_access",
        redirect_uri:
          import.meta.env.VITE_HERCULES_OIDC_REDIRECT_URI ??
          `${window.location.origin}/auth/callback`,
      }}
    >
      {children}
    </HerculesAuthProvider>
  );
}
