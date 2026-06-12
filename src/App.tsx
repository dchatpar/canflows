import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { LanguageProvider } from "./contexts/language-context.tsx";
import AppShell from "./components/AppShell.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import Workflows from "./pages/workflows/page.tsx";
import WorkflowEditor from "./pages/workflows/editor/page.tsx";
import Credentials from "./pages/credentials/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminPage from "./pages/admin/page.tsx";
import TenantsPage from "./pages/tenants/page.tsx";
import FormsPage from "./pages/forms/page.tsx";
import FormEditorPage from "./pages/forms/editor/page.tsx";
import TemplateLibraryPage from "./pages/forms/templates/page.tsx";
import FormSharePage from "./pages/forms/share/page.tsx";

import FormIntegrationsPage from "./pages/forms/integrations/page.tsx";
import PublicFormPage from "./pages/submit/page.tsx";
import TrackSubmissionPage from "./pages/track/page.tsx";
import MySubmissionsPage from "./pages/submissions/page.tsx";
import TasksPage from "./pages/tasks/page.tsx";
import SlaPage from "./pages/sla/page.tsx";
import ApiIntegrationsPage from "./pages/api-integrations/page.tsx";
import DocumentsPage from "./pages/documents/page.tsx";
import ESignaturePage from "./pages/esignature/page.tsx";
import SignPage from "./pages/sign/page.tsx";
import AnalyticsPage from "./pages/analytics/page.tsx";
import IntelligencePage from "./pages/intelligence/page.tsx";
import AccessibilityPage from "./pages/accessibility/page.tsx";
import SecurityPage from "./pages/security/page.tsx";
import AdminConsolePage from "./pages/admin-console/page.tsx";
import CompliancePage from "./pages/compliance/page.tsx";
import TrustPage from "./pages/trust/page.tsx";
import PrivacyPage from "./pages/privacy/page.tsx";
import TermsPage from "./pages/terms/page.tsx";
import CookiesPage from "./pages/cookies/page.tsx";
import { TenantProvider } from "./contexts/tenant-context.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <LanguageProvider>
        <BrowserRouter>
          <TenantProvider>
          <Routes>
            {/* Landing page — no shell */}
            <Route path="/" element={<Index />} />
            {/* Auth callback — no shell */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public form submission & tracking — no app shell */}
            <Route path="/submit/:formId" element={<PublicFormPage />} />
            <Route path="/track" element={<TrackSubmissionPage />} />
            {/* Public signing portal — no app shell */}
            <Route path="/sign/:token" element={<SignPage />} />

            {/* App shell wraps all authenticated pages */}
            <Route element={<AppShell />}>
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/workflows/:id" element={<WorkflowEditor />} />
              <Route path="/credentials" element={<Credentials />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/forms" element={<FormsPage />} />
              <Route path="/forms/templates" element={<TemplateLibraryPage />} />
              <Route path="/forms/:formId/edit" element={<FormEditorPage />} />
              <Route path="/forms/:formId/share" element={<FormSharePage />} />
              <Route path="/forms/:formId/integrations" element={<FormIntegrationsPage />} />
              <Route path="/submissions" element={<MySubmissionsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/sla" element={<SlaPage />} />
              <Route path="/api-integrations" element={<ApiIntegrationsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/esignature" element={<ESignaturePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/intelligence" element={<IntelligencePage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/admin-console" element={<AdminConsolePage />} />
              <Route path="/compliance" element={<CompliancePage />} />
            </Route>

            {/* Public Trust Centre — no app shell */}
            <Route path="/trust" element={<TrustPage />} />
            {/* Legal pages — no app shell */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiesPage />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TenantProvider>
        </BrowserRouter>
      </LanguageProvider>
    </DefaultProviders>
  );
}
