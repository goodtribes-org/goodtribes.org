import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — GoodTribes.org" };

export default function TermsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-dark-slate mb-2">Terms of Service</h1>
        <p className="text-sm text-dark-slate/50">Last updated: June 2026</p>
      </div>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <p>By using GoodTribes.org you agree to these terms. GoodTribes is operated by GoodTribes Foundation, a nonprofit organisation.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">1. Your account</h2>
        <p>You are responsible for keeping your account secure and for all activity under it. You must be 16 years or older to use this platform. You may only have one account.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">2. What you may do</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li>Create a profile and join or start projects and organisations.</li>
          <li>Post updates, chat messages, wiki pages, ideas, and other content in the context of collaborative projects.</li>
          <li>Invite others to projects and organisations you administer.</li>
        </ul>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">3. What you may not do</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li>Post content that is unlawful, harmful, abusive, defamatory, or that violates others' rights.</li>
          <li>Use the platform for commercial spam or unsolicited bulk messaging.</li>
          <li>Attempt to access others' accounts or data without authorisation.</li>
          <li>Use the platform for anything other than genuine social-impact collaboration.</li>
        </ul>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">4. Content and intellectual property</h2>
        <p>You retain ownership of content you create. By posting content you grant GoodTribes a licence to display and distribute it to other users as part of the service. You may not post content you do not have the right to share.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">5. Volunteer work</h2>
        <p>GoodTribes facilitates volunteer collaboration. The platform does not create employment relationships. Any agreements between project owners and contributors are entirely between those parties — GoodTribes Foundation is not a party to them.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">6. Termination</h2>
        <p>We may suspend or delete accounts that violate these terms. You may delete your account at any time from <Link href="/settings" className="text-coral hover:underline">Settings</Link>.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">7. Liability</h2>
        <p>GoodTribes.org is provided as-is. We make no warranty that the service will be uninterrupted or error-free. To the extent permitted by law, GoodTribes Foundation is not liable for any damages arising from use of the platform.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">8. Changes</h2>
        <p>We may update these terms. Continued use of the platform after changes constitutes acceptance. We will notify users of material changes by email.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">9. Contact</h2>
        <p>Questions? Email us at <a href="mailto:hej@goodtribes.org" className="text-coral hover:underline">hej@goodtribes.org</a>.</p>
      </section>
    </div>
  );
}
