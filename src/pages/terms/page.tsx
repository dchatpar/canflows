/**
 * Terms of Service page — BC/Canada governing law.
 * Last updated: June 2026
 */
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const SECTIONS = [
  {
    id: "intro",
    title: "1. Introduction and Acceptance",
    content: `These Terms of Service ("Terms") govern your access to and use of the canflows.ca platform, website, and services (collectively, the "Service") operated by CanFlows ("canflows.ca", "we", "us", or "our"), a corporation incorporated under the laws of British Columbia, Canada.

By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Service.

If you are using the Service on behalf of an organization (such as a government department or enterprise), you represent and warrant that you have the authority to bind that organization to these Terms, and references to "you" include both you personally and that organization.`,
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    content: `You must be at least 13 years of age to use the Service. By using the Service, you represent that you are at least 13 years old.

If you are accepting these Terms on behalf of a government entity or regulated organization, you represent that you have the appropriate authorization under applicable procurement and contracting policies.`,
  },
  {
    id: "account",
    title: "3. Accounts and Access",
    content: `To access certain features of the Service, you must create an account. You agree to:
• Provide accurate, current, and complete information during registration
• Maintain the security of your login credentials
• Notify us immediately at security@canflows.ca if you suspect unauthorized access to your account
• Accept responsibility for all activities that occur under your account

We reserve the right to suspend or terminate accounts that violate these Terms, are associated with fraudulent activity, or have been inactive for more than 24 consecutive months after providing reasonable notice.`,
  },
  {
    id: "service",
    title: "4. Description of Service",
    content: `canflows.ca provides an AI-native forms, workflow, and analytics platform designed for government and regulated enterprise use. The Service includes:

• Drag-and-drop form builder and AI form generation
• BPMN 2.0 workflow engine
• Public form submission portal
• Staff task queue and review tools
• SLA and deadline management
• eSignature capabilities
• Document generation
• REST API and third-party integrations
• Analytics and AI process intelligence
• Security, compliance, and accessibility management tools

The Community edition is provided as open-source software under the Apache 2.0 License. Professional and Enterprise tiers are provided under these Terms as a commercial SaaS offering.

We reserve the right to modify, suspend, or discontinue features of the Service with reasonable notice. We will provide at least 90 days notice before discontinuing the Service entirely.`,
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable Use",
    content: `You agree to use the Service only for lawful purposes and in compliance with all applicable laws, including but not limited to PIPA (BC), PIPEDA, CASL, and applicable government procurement policies.

You must not use the Service to:
• Collect personal information without a lawful basis under PIPA/PIPEDA
• Send unsolicited commercial electronic messages in violation of CASL
• Collect or process personal information of children under 13 without verifiable parental consent
• Upload or transmit malware, viruses, or any malicious code
• Attempt to gain unauthorized access to other accounts, systems, or networks
• Violate any applicable privacy, data protection, or computer crime laws
• Impersonate any person or organization
• Use the Service in any way that violates any applicable municipal, provincial, federal, or international law

We reserve the right to investigate and take appropriate action, including suspending or terminating access, for violations of this section.`,
  },
  {
    id: "data",
    title: "6. Data and Privacy",
    content: `Your use of the Service is also governed by our Privacy Policy (/privacy), which is incorporated into these Terms by reference.

As between you and canflows.ca:
• You retain ownership of all personal information and data you collect through forms deployed on the Service
• You are the "data controller" under applicable privacy legislation for personal information collected from your form respondents
• canflows.ca acts as a "data processor" or "service provider" when processing personal information on your behalf
• By using the Service, you authorize canflows.ca to process data as described in these Terms and the Privacy Policy

You are responsible for ensuring you have a lawful basis under PIPA/PIPEDA to collect each type of personal information you collect through the Service, and for providing appropriate privacy notices to your form respondents.

Data Processing Agreement (DPA): Enterprise customers requiring a formal DPA for GDPR or PIPEDA compliance may request one at legal@canflows.ca.`,
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    content: `canflows.ca Platform: The canflows.ca platform source code (Community edition) is licensed under the Apache License 2.0. You may use, copy, modify, and distribute it in accordance with that license. Proprietary Enterprise modules are licensed separately and may not be copied or distributed without a written license from CanFlows

Your Content: You retain all intellectual property rights in the forms, workflows, and data you create using the Service. By using the Service, you grant canflows.ca a limited, non-exclusive, royalty-free license to host, store, and process your content solely to provide the Service.

Trademarks: "canflows.ca" and related logos are trademarks of CanFlows You may not use our trademarks without our prior written consent except as permitted by applicable law.

Feedback: If you provide feedback or suggestions about the Service, we may use that feedback without restriction or compensation to you.`,
  },
  {
    id: "fees",
    title: "8. Fees and Payment",
    content: `Community Edition: Free of charge under Apache 2.0. No payment required.

Professional and Enterprise Tiers: Fees are as agreed in a separate Order Form or Statement of Work. Unless otherwise agreed:
• Fees are quoted in Canadian dollars (CAD)
• Invoices are due net 30 days from issuance
• We reserve the right to suspend access for accounts with outstanding invoices older than 30 days after providing 14 days written notice
• All fees are exclusive of applicable taxes (GST/HST/PST), which will be added to invoices as required by law`,
  },
  {
    id: "warranty",
    title: "9. Disclaimers and Warranties",
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

We do not warrant that:
• The Service will be uninterrupted, timely, secure, or error-free
• Any defects will be corrected
• The Service or the servers that make it available are free of viruses or other harmful components

Some jurisdictions do not allow the exclusion of implied warranties. To the extent such exclusions are not permitted by applicable Canadian law, we limit the duration of any implied warranty to 90 days.

We do not warrant that using the Service will ensure your compliance with any specific regulatory requirement (ITSG-33, SOC 2, etc.). Compliance is a shared responsibility.`,
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW IN BRITISH COLUMBIA AND CANADA:

IN NO EVENT SHALL canflows.ca, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.

OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED CANADIAN DOLLARS (CAD $100).

NOTHING IN THESE TERMS EXCLUDES OR LIMITS LIABILITY FOR FRAUD, GROSS NEGLIGENCE, OR WILFUL MISCONDUCT, OR ANY LIABILITY THAT CANNOT BE LIMITED OR EXCLUDED BY APPLICABLE LAW.`,
  },
  {
    id: "termination",
    title: "11. Termination",
    content: `You may stop using the Service at any time. To close your account, contact support@canflows.ca.

We may suspend or terminate your access to the Service immediately if:
• You materially breach these Terms and fail to cure the breach within 14 days of written notice
• You engage in fraudulent or illegal activity
• We are required to do so by applicable law or court order

Upon termination:
• Your right to access the Service ceases immediately
• We will retain your data for 90 days post-termination to allow for data export, after which it will be deleted per our retention policy
• Sections 7, 9, 10, 12, and 13 survive termination`,
  },
  {
    id: "governing",
    title: "12. Governing Law and Dispute Resolution",
    content: `These Terms are governed by and construed in accordance with the laws of the Province of British Columbia and the applicable federal laws of Canada, without regard to conflict of law principles.

Disputes: You and canflows.ca agree to attempt to resolve any dispute informally first. If a dispute cannot be resolved informally within 30 days, either party may initiate proceedings in the courts of British Columbia. Both parties consent to the exclusive jurisdiction of the courts of the Province of British Columbia for all disputes arising from these Terms.

Class Action Waiver: To the extent permitted by applicable law, you waive the right to participate in a class action lawsuit or class-wide arbitration against canflows.ca.`,
  },
  {
    id: "general",
    title: "13. General Provisions",
    content: `Entire Agreement: These Terms, together with the Privacy Policy and any applicable Order Form, constitute the entire agreement between you and canflows.ca with respect to the Service and supersede all prior agreements.

Severability: If any provision of these Terms is found to be unenforceable, that provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force.

Waiver: Our failure to enforce any provision of these Terms shall not be deemed a waiver of that provision.

Notices: Legal notices to canflows.ca should be sent to legal@canflows.ca. We may provide notices to you via the email address associated with your account or via in-platform notifications.

Amendments: We may amend these Terms from time to time. We will provide at least 30 days notice of material changes via in-platform notification or email. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.

Language: These Terms are written in English. In the event of any conflict between an English version and a French translation, the English version shall prevail.`,
  },
  {
    id: "contact",
    title: "14. Contact Us",
    content: `For questions about these Terms:

Legal & Contracts
CanFlows (canflows.ca)
British Columbia, Canada

Email: legal@canflows.ca
General Support: support@canflows.ca
Privacy: privacy@canflows.ca
Security: security@canflows.ca`,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#284162] text-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-5" />
            <span className="font-bold">canflows.ca</span>
            <span className="text-white/50">|</span>
            <span className="text-white/80 text-sm">Terms of Service</span>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            <strong>CanFlows (canflows.ca)</strong> · Incorporated in British Columbia, Canada
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Last Updated:</strong> June 12, 2026 · <strong>Effective Date:</strong> June 12, 2026
          </p>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>Legal Notice:</strong> These Terms have been prepared in good faith under BC/Canada law. They are not a substitute for advice from a qualified Canadian lawyer. Enterprise customers should seek independent legal review before executing a contract.
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
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
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
