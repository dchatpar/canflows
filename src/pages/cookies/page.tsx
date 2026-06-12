/**
 * Cookie Policy page — PIPEDA / BC PIPA compliant.
 * Last updated: June 2026
 */
import { ArrowLeft, Globe } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function CookiesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#284162] text-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="size-5" />
            <span className="font-bold">CanFlow.ai</span>
            <span className="text-white/50">|</span>
            <span className="text-white/80 text-sm">Cookie Policy</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* Title */}
        <div className="pb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">
            <strong>AOT Technologies Inc. (CanFlow.ai)</strong> · Incorporated in British Columbia, Canada
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Last Updated:</strong> June 12, 2026 · <strong>Effective Date:</strong> June 12, 2026
          </p>
        </div>

        <section id="what-are-cookies">
          <h2 className="text-lg font-bold mb-3">What Are Cookies?</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Cookies are small text files placed on your device by a website. They help the website function correctly, remember your preferences, and (where permitted) measure usage.
          </p>
          <p className="text-sm text-foreground leading-relaxed mt-3">
            We use cookies in accordance with the Personal Information Protection Act (BC) (PIPA) and the Personal Information Protection and Electronic Documents Act (Canada) (PIPEDA). We will seek your consent before placing any non-essential cookies.
          </p>
        </section>

        <section id="categories">
          <h2 className="text-lg font-bold mb-4">Cookie Categories We Use</h2>

          {/* Essential */}
          <div className="mb-6 p-5 rounded-xl border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white">Always Active</span>
              <h3 className="font-bold text-foreground">Essential Cookies</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">
              These cookies are strictly necessary for the platform to function. They cannot be disabled. Without them, you cannot sign in, maintain a session, or submit forms.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-100">
                  <th className="text-left p-2 border border-emerald-200 font-semibold">Cookie Name</th>
                  <th className="text-left p-2 border border-emerald-200 font-semibold">Purpose</th>
                  <th className="text-left p-2 border border-emerald-200 font-semibold">Duration</th>
                  <th className="text-left p-2 border border-emerald-200 font-semibold">Provider</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "oidc.user:*", purpose: "Stores your authenticated session (OIDC token)", duration: "Session / 8 hours", provider: "canflow.ai" },
                  { name: "canflow_lang", purpose: "Remembers your language preference (EN or FR)", duration: "1 year", provider: "canflow.ai" },
                  { name: "__cf_bm", purpose: "Bot detection and DDoS protection", duration: "30 minutes", provider: "Cloudflare" },
                ].map((row) => (
                  <tr key={row.name} className="even:bg-emerald-50/50">
                    <td className="p-2 border border-emerald-200 font-mono">{row.name}</td>
                    <td className="p-2 border border-emerald-200">{row.purpose}</td>
                    <td className="p-2 border border-emerald-200">{row.duration}</td>
                    <td className="p-2 border border-emerald-200">{row.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Analytics */}
          <div className="mb-6 p-5 rounded-xl border bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white">Opt-In</span>
              <h3 className="font-bold text-foreground">Analytics Cookies</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">
              These cookies help us understand how the platform is used in aggregate so we can improve it. They are <strong>disabled by default</strong>. You can enable or disable them in the Accessibility Settings within the platform.
            </p>
            <p className="text-sm text-foreground leading-relaxed mb-3">
              Analytics data is aggregated and anonymized. We do not build individual user profiles for analytics purposes.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="text-left p-2 border border-blue-200 font-semibold">Cookie Name</th>
                  <th className="text-left p-2 border border-blue-200 font-semibold">Purpose</th>
                  <th className="text-left p-2 border border-blue-200 font-semibold">Duration</th>
                  <th className="text-left p-2 border border-blue-200 font-semibold">Provider</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "_canflow_session", purpose: "Anonymized session analytics (page views, feature usage)", duration: "30 days", provider: "canflow.ai (self-hosted)" },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="p-2 border border-blue-200 font-mono">{row.name}</td>
                    <td className="p-2 border border-blue-200">{row.purpose}</td>
                    <td className="p-2 border border-blue-200">{row.duration}</td>
                    <td className="p-2 border border-blue-200">{row.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advertising — explicitly none */}
          <div className="p-5 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500 text-white">Not Used</span>
              <h3 className="font-bold text-foreground">Advertising & Third-Party Tracking Cookies</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              <strong>We do not use advertising cookies, social media tracking pixels, or any third-party marketing trackers.</strong> No cookies from Google Ads, Meta, LinkedIn, Twitter/X, or any advertising network are placed on this site.
            </p>
          </div>
        </section>

        <section id="manage">
          <h2 className="text-lg font-bold mb-3">How to Manage Your Cookie Preferences</h2>
          <div className="space-y-3 text-sm text-foreground leading-relaxed">
            <p>
              <strong>In the CanFlow.ai platform:</strong> Navigate to Accessibility Settings and toggle the "Analytics Cookies" option on or off at any time.
            </p>
            <p>
              <strong>In your browser:</strong> Most browsers allow you to view and delete cookies, and to block future cookies. Note that blocking essential cookies will prevent you from signing in to the platform. Common browser settings:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Chrome: Settings → Privacy and Security → Cookies and other site data</li>
              <li>Firefox: Options → Privacy {"&"} Security → Cookies and Site Data</li>
              <li>Safari: Preferences → Privacy → Manage Website Data</li>
              <li>Edge: Settings → Cookies and site permissions → Manage and delete cookies</li>
            </ul>
            <p>
              <strong>Contact us:</strong> To make a cookie-related privacy request, email privacy@canflow.ai.
            </p>
          </div>
        </section>

        <section id="local-storage">
          <h2 className="text-lg font-bold mb-3">Local Storage</h2>
          <p className="text-sm text-foreground leading-relaxed">
            In addition to cookies, we use browser Local Storage to save your language preference and certain UI settings (e.g., sidebar collapsed state). Local Storage data does not leave your device and is not transmitted to our servers. You can clear Local Storage via your browser developer tools or by clearing site data in browser settings.
          </p>
        </section>

        <section id="changes">
          <h2 className="text-lg font-bold mb-3">Changes to This Policy</h2>
          <p className="text-sm text-foreground leading-relaxed">
            We may update this Cookie Policy from time to time. When we add new categories of cookies requiring consent, we will seek your consent before placing them. We will update the "Last Updated" date at the top of this page with each revision. Continued use of the platform after any update constitutes acceptance of the revised Policy.
          </p>
        </section>

        <section id="contact">
          <h2 className="text-lg font-bold mb-3">Contact</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Questions about this Cookie Policy or our use of cookies may be directed to our Privacy Officer at: <strong>privacy@canflow.ai</strong>
          </p>
        </section>

        {/* Footer links */}
        <div className="mt-8 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/trust" className="text-primary hover:underline">Trust Centre</Link>
        </div>
      </main>

      <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AOT Technologies Inc. · British Columbia, Canada
      </footer>
    </div>
  );
}
