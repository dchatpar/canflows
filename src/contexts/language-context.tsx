import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "en" | "fr";

type Strings = {
  // Nav
  navDashboard: string;
  navForms: string;
  navWorkflows: string;
  navSubmissions: string;
  navProcessIntelligence: string;
  navCredentials: string;
  navAdmin: string;
  navTenants: string;
  navTasks: string;
  navSla: string;
  navApiIntegrations: string;
  navDocuments: string;
  navEsignature: string;
  navAnalytics: string;
  navIntelligence: string;
  navAccessibility: string;
  navSecurity: string;
  navAdminConsole: string;
  navCompliance: string;
  navSettings: string;
  // Top bar
  skipToMain: string;
  officialSite: string;
  langToggle: string;
  signIn: string;
  signOut: string;
  // Common
  comingSoon: string;
  loading: string;
  forbidden: string;
  // Sections
  sectionBuild: string;
  sectionAnalyze: string;
  sectionManage: string;
};

const EN: Strings = {
  navDashboard: "Dashboard",
  navForms: "Forms",
  navWorkflows: "Workflows",
  navSubmissions: "Submissions",
  navProcessIntelligence: "Process Intelligence",
  navCredentials: "Credentials",
  navAdmin: "Admin",
  navTenants: "Tenants",
  navTasks: "Task Queue",
  navSla: "SLA & Deadlines",
  navApiIntegrations: "API & Integrations",
  navDocuments: "Document Generation",
  navEsignature: "eSignature",
  navAnalytics: "Analytics",
  navIntelligence: "AI Intelligence",
  navAccessibility: "Accessibility",
  navSecurity: "Security & Compliance",
  navAdminConsole: "Admin Console",
  navCompliance: "Compliance & Trust",
  navSettings: "Settings",
  skipToMain: "Skip to main content",
  officialSite: "An official website of the Government of Canada",
  langToggle: "Français",
  signIn: "Sign in",
  signOut: "Sign out",
  comingSoon: "Coming soon",
  loading: "Loading…",
  forbidden: "Access Denied",
  sectionBuild: "Build",
  sectionAnalyze: "Analyze",
  sectionManage: "Manage",
};

const FR: Strings = {
  navDashboard: "Tableau de bord",
  navForms: "Formulaires",
  navWorkflows: "Flux de travail",
  navSubmissions: "Soumissions",
  navProcessIntelligence: "Intelligence des processus",
  navCredentials: "Justificatifs d'identité",
  navAdmin: "Administration",
  navTenants: "Locataires",
  navTasks: "File de tâches",
  navSla: "ANS & Délais",
  navApiIntegrations: "API & Intégrations",
  navDocuments: "Génération de documents",
  navEsignature: "Signature électronique",
  navAnalytics: "Analytique",
  navIntelligence: "Intelligence IA",
  navAccessibility: "Accessibilité",
  navSecurity: "Sécurité et conformité",
  navAdminConsole: "Console d'administration",
  navCompliance: "Conformité & Confiance",
  navSettings: "Paramètres",
  skipToMain: "Passer au contenu principal",
  officialSite: "Un site officiel du gouvernement du Canada",
  langToggle: "English",
  signIn: "Se connecter",
  signOut: "Se déconnecter",
  comingSoon: "Bientôt disponible",
  loading: "Chargement…",
  forbidden: "Accès refusé",
  sectionBuild: "Créer",
  sectionAnalyze: "Analyser",
  sectionManage: "Gérer",
};

const TRANSLATIONS: Record<Language, Strings> = { en: EN, fr: FR };

const STORAGE_KEY = "canflow_lang";

type LanguageContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  t: Strings;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: EN,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "fr" ? "fr" : "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.setAttribute("lang", l);
  };

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
