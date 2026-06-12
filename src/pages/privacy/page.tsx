/**
 * Privacy Policy page — PIPA (BC), PIPEDA (federal), CASL compliant.
 * Last updated: June 2026
 */
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const SECTIONS = [
  {
    id: "intro",
    title: "1. Introduction",
    content: `CanFlows ("CanFlow.ai", "we", "us", or "our"), incorporated in British Columbia, Canada, operates the CanFlow.ai platform available at canflow.ai.

We are committed to protecting your personal information in accordance with the Personal Information Protection Act (British Columbia) (PIPA), the Personal Information Protection and Electronic Documents Act (Canada) (PIPEDA), and Canada's Anti-Spam Legislation (CASL).

This Privacy Policy explains what personal information we collect, why we collect it, how we use it, and your rights as an individual. By using our platform, you acknowledge the practices described in this Policy.

Questions about this Policy may be directed to our Privacy Officer at: privacy@canflow.ai`,
  },
  {
    id: "who",
    title: "2. Who This Policy Applies To",
    content: `This Policy applies to:
• Registered users of the CanFlow.ai platform (staff, administrators, and organizational users)
• Citizens and members of the public who submit forms published by CanFlow.ai customers
• Visitors to the canflow.ai website

This Policy does not apply to the personal information practices of our customers (organizations that deploy CanFlow.ai). Each customer is a separate data controller responsible for the personal information they collect through their own deployed forms. Customers should maintain their own privacy policies for their end users.`,
  },
  {
    id: "what",
    title: "3. What Personal Information We Collect",
    content: `We collect personal information as follows:

Account Information (registered users):
• Name and email address
• Organization name and role
• Authentication credentials (managed via our identity provider — passwords are never stored in plaintext)
• Account preferences and settings

Form Submission Data (citizens submitting forms):
• Any information you voluntarily provide in a form published by a CanFlow.ai customer
• Submission reference numbers and timestamps
• Email address (if provided for status notifications)

Usage Data (all users):
• IP address and approximate geolocation (country/province level)
• Browser type and version
• Pages visited and features used (aggregated, not per-user profiles)
• Session timestamps

Signing Data (eSignature module):
• Signer name and email
• IP address at time of signing
• Timestamp of signature event
• Signing certificate metadata

We do not collect health information, financial account numbers, Social Insurance Numbers, or other highly sensitive personal information unless explicitly required by a specific form created by a customer, in which case that customer bears responsibility for the appropriate collection authority.`,
  },
  {
    id: "why",
    title: "4. Why We Collect Personal Information (Purposes)",
    content: `We collect and use personal information only for the following identified purposes:

• To create and manage your account on the CanFlow.ai platform
• To process and route form submissions as directed by the deploying organization
• To provide status updates and notifications about submissions you have made
• To detect and prevent fraud, unauthorized access, and security incidents
• To send service-related communications (e.g., password resets, system alerts)
• To send promotional and marketing communications where you have provided express consent under CASL
• To improve platform features through aggregated, anonymized usage analytics
• To comply with legal obligations, including PIPEDA breach notification requirements
• To maintain immutable audit logs for security and compliance purposes

We do not sell, rent, or trade your personal information to any third party for their marketing purposes.`,
  },
  {
    id: "legal-basis",
    title: "5. Legal Basis for Collection",
    content: `Under PIPA (BC) and PIPEDA, we collect and use personal information based on:

Consent: For account registration, optional analytics, and CASL-covered commercial electronic messages. You may withdraw consent at any time (see Section 9).

Contractual Necessity: For processing form submissions and providing the services described in our Terms of Service.

Legitimate Interests: For security monitoring, fraud prevention, and platform integrity — balanced against your privacy interests.

Legal Obligation: For maintaining audit logs, breach notification procedures, and responding to lawful requests from public authorities.`,
  },
  {
    id: "residency",
    title: "6. Data Residency & Storage",
    content: `All primary personal information collected through the CanFlow.ai platform is stored exclusively in Canadian AWS regions (ca-central-1 primary, ca-west-1 disaster recovery).

No personal data is replicated, transferred, or stored outside of Canada without your explicit consent or a lawful basis under PIPEDA.

Third-party notification services (such as email delivery providers) may transmit notification metadata (e.g., your email address) to process a message. We select service providers that provide appropriate data protection safeguards and Data Processing Agreements.

Sub-processors used by CanFlow.ai:
• Amazon Web Services Canada (data storage, compute)
• Convex Inc. (database, configured for Canada-region deployment)

A current list of sub-processors is available on request at privacy@canflow.ai.`,
  },
  {
    id: "retention",
    title: "7. Data Retention",
    content: `We retain personal information only for as long as necessary to fulfill the purposes for which it was collected:

• Account information: Retained for the duration of your account, plus 90 days after account closure to allow for reactivation, then deleted.
• Form submission data: Retained as configured by the deploying organization (the data controller). Default retention is 7 years unless configured otherwise. Deletion requests are processed per Section 9.
• Audit logs: Retained for 7 years to comply with applicable record-keeping obligations and to support security investigations.
• Usage analytics (aggregated): Retained indefinitely in anonymized form.
• Security incident records: Retained for 7 years.

After the applicable retention period expires, personal information is securely deleted or anonymized.`,
  },
  {
    id: "sharing",
    title: "8. Disclosure of Personal Information",
    content: `We do not sell your personal information.

We may disclose personal information to:

Service Providers: Third-party vendors who assist in operating the platform under written agreements that require them to protect personal information (see Section 6 for sub-processors).

Deploying Organizations: If you submit a form published by a government or enterprise customer, your submission data is shared with that customer organization as the intended recipient.

Legal Requirements: We may disclose personal information if required by law, court order, or lawful request from a Canadian public authority. We will notify you of such a request where legally permitted to do so.

Business Transfers: In the event of a merger, acquisition, or sale of assets, personal information may be transferred to the successor organization, subject to the same privacy protections.

PIPEDA Breach Notification: In the event of a security breach affecting personal information that poses a real risk of significant harm, we will notify affected individuals and report to the Office of the Privacy Commissioner of Canada within 72 hours of discovery.`,
  },
  {
    id: "rights",
    title: "9. Your Rights",
    content: `Under PIPA (BC) and PIPEDA, you have the right to:

Access: Request access to the personal information we hold about you.

Correction: Request correction of inaccurate or incomplete personal information.

Withdrawal of Consent: Withdraw your consent to collect and use your personal information for non-essential purposes at any time. Note that withdrawal may limit your ability to use certain platform features.

Deletion: Request deletion of your personal information, subject to legal retention obligations (see Section 7).

Unsubscribe from Commercial Messages: Opt out of marketing communications at any time by clicking the unsubscribe link in any commercial email or by contacting privacy@canflow.ai. We will honour unsubscribe requests within 10 business days as required by CASL.

Complaint: If you are not satisfied with our response to a privacy concern, you may file a complaint with:
• Office of the Privacy Commissioner of Canada: www.priv.gc.ca
• Office of the Information and Privacy Commissioner for BC: www.oipc.bc.ca

To exercise any of these rights, contact our Privacy Officer at: privacy@canflow.ai
We will respond within 30 days.`,
  },
  {
    id: "cookies",
    title: "10. Cookies & Tracking",
    content: `We use cookies and similar technologies as described in our Cookie Policy (/cookies). In summary:

Essential cookies are required for the platform to function (authentication, session management) and cannot be disabled.

Analytics cookies are disabled by default. You may enable or disable them in the Accessibility Settings within the platform.

We do not use advertising, tracking, or third-party marketing cookies.`,
  },
  {
    id: "casl",
    title: "11. CASL — Commercial Electronic Messages",
    content: `Canada's Anti-Spam Legislation (CASL) applies to commercial electronic messages (CEM) we send to you.

We will only send you promotional or marketing emails if:
• You have provided express consent (e.g., opted in during account registration or a sign-up form), or
• You are an existing customer and the message relates to your current use of the platform (implied consent under CASL s. 10(9))

Each CEM we send includes:
• Our name and contact information
• A clear and accessible unsubscribe mechanism

To unsubscribe from commercial messages, click the unsubscribe link in any email or contact privacy@canflow.ai. We will process unsubscribe requests within 10 business days.

Transactional messages (e.g., password resets, submission confirmations) are not commercial electronic messages and are not subject to CASL opt-out requirements.`,
  },
  {
    id: "children",
    title: "12. Children's Privacy",
    content: `CanFlow.ai is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact privacy@canflow.ai and we will take immediate steps to delete that information.`,
  },
  {
    id: "changes",
    title: "13. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons. When we make material changes, we will:
• Update the "Last Updated" date at the top of this page
• Provide notice within the platform (for registered users) at least 30 days before changes take effect for material changes
• Obtain fresh consent where required by PIPA/PIPEDA

Continued use of the platform after the effective date of any update constitutes your acceptance of the revised Policy.`,
  },
  {
    id: "contact",
    title: "14. Contact Our Privacy Officer",
    content: `For all privacy-related inquiries, access requests, correction requests, or complaints:

Privacy Officer
CanFlows (CanFlow.ai)
British Columbia, Canada

Email: privacy@canflow.ai
Response time: Within 30 days of receipt

For security vulnerability disclosures: security@canflow.ai
For legal and DPA requests: legal@canflow.ai`,
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#284162] text-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="size-5" />
            <span className="font-bold">CanFlow.ai</span>
            <span className="text-white/50">|</span>
            <span className="text-white/80 text-sm">Privacy Policy</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Title */}
        <div className="mb-8 pb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            <strong>CanFlows (CanFlow.ai)</strong> · Incorporated in British Columbia, Canada
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Last Updated:</strong> June 12, 2026 · <strong>Effective Date:</strong> June 12, 2026
          </p>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>Legal Notice:</strong> This Privacy Policy has been prepared in good faith to comply with PIPA (BC), PIPEDA, and CASL. It is not a substitute for advice from a qualified Canadian privacy lawyer. Organizations subject to sector-specific legislation (e.g., PHIPA, FIPPA) should seek independent legal advice.
          </div>
        </div>

        {/* Table of Contents */}
        <nav className="mb-10 p-5 rounded-xl border bg-muted/40">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Contents</p>
          <ol className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-primary hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
              <div className="prose-sm text-sm text-foreground leading-relaxed whitespace-pre-line">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
          <Link to="/trust" className="text-primary hover:underline">Trust Centre</Link>
        </div>
      </main>

      <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CanFlows · British Columbia, Canada
      </footer>
    </div>
  );
}
