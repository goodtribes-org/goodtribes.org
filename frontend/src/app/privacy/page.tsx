import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — GoodTribes.org" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-dark-slate mb-2">Privacy Policy</h1>
        <p className="text-sm text-dark-slate/50">Last updated: June 2026</p>
      </div>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">Who we are</h2>
        <p>GoodTribes is a nonprofit foundation operating GoodTribes.org — a platform connecting skilled volunteers with impact-driven organisations. Our contact address is <a href="mailto:hej@goodtribes.org" className="text-coral hover:underline">hej@goodtribes.org</a>.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">What data we collect</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong>Account data:</strong> your email address, name, bio, country, profile photo, and social links — provided by you when you register.</li>
          <li><strong>Skills and project memberships:</strong> skills you add to your profile and projects you join or create.</li>
          <li><strong>Session data:</strong> authentication tokens stored in your browser to keep you logged in.</li>
          <li><strong>Usage data:</strong> actions you take on the platform (posting updates, chat messages, kanban cards, etc.) stored to provide the service.</li>
        </ul>
        <p>We do not collect any data beyond what is necessary to operate the platform. We do not sell your data. We do not use advertising.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">How we use your data</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li>To provide the GoodTribes.org service, including profile display, project collaboration, and notifications.</li>
          <li>To send transactional emails such as magic-link login, join request notifications, and project updates. You can opt out of the weekly digest in your settings.</li>
          <li>To match your skills with relevant projects (if you opt in to profile visibility).</li>
        </ul>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">Data storage and security</h2>
        <p>Your data is stored in a PostgreSQL database on servers within the European Union. File uploads are stored in object storage (S3-compatible). We use HTTPS for all connections. Authentication uses short-lived magic links — we never store passwords.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">Your rights</h2>
        <p>Under GDPR you have the right to access, correct, and delete your personal data. You can delete your account at any time from <Link href="/settings" className="text-coral hover:underline">Settings</Link>. For any data requests, contact us at <a href="mailto:hej@goodtribes.org" className="text-coral hover:underline">hej@goodtribes.org</a>.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">Third-party services</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong>Resend</strong> — used to send transactional emails.</li>
          <li><strong>Meilisearch</strong> — used for full-text search of public profiles, projects, and organisations.</li>
        </ul>
        <p>These services only receive the minimum data necessary to perform their function.</p>
      </section>

      <section className="space-y-3 text-dark-slate/80 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-dark-slate">Changes</h2>
        <p>We may update this policy. Significant changes will be communicated by email or a notice on the platform.</p>
      </section>
    </div>
  );
}
