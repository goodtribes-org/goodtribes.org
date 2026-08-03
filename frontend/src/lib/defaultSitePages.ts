import type { SitePageSlug } from "@/app/[locale]/site-pages-actions";

// Bootstrap copy for About/Privacy/Terms, shown until a site admin saves an
// edit via the inline pencil (see EditableSitePage.tsx) and used to seed the
// editor the first time it's opened for a given slug.
export const DEFAULT_SITE_PAGES: Record<SitePageSlug, { title: string; body: string }> = {
  about: {
    title: "Who are GoodTribes?",
    body: `
      <p>GoodTribes is run as a foundation with one overarching goal: to make the world better for those of us living in it today, and for the generations after us. We do not believe in waiting for someone else to solve the problems. We believe in organising from the bottom up.</p>
      <p>When a person has a good idea, it often takes a whole team to carry it out. By lowering the barriers and making it easy to collaborate, we create a people's movement of practical sustainability. No one is left alone with their vision.</p>
      <h2>What we do</h2>
      <ul>
        <li><strong>Projects</strong> — We build and run open digital tools for non-profit organisations and socially engaged initiatives.</li>
        <li><strong>Community</strong> — We bring together people with the will and skills to contribute to something bigger than themselves.</li>
        <li><strong>Transparency</strong> — Everything we do is open. Code, decisions and direction are shared openly.</li>
      </ul>
      <h2>Contact</h2>
      <p>Want to know more or become part of GoodTribes? <a href="mailto:hej@goodtribes.org">hej@goodtribes.org</a></p>
    `.trim(),
  },
  privacy: {
    title: "Privacy Policy",
    body: `
      <p><em>Last updated: June 2026</em></p>
      <h2>Who we are</h2>
      <p>GoodTribes is a nonprofit foundation operating GoodTribes.org — a platform connecting skilled volunteers with impact-driven organisations. Our contact address is <a href="mailto:hej@goodtribes.org">hej@goodtribes.org</a>.</p>
      <h2>What data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address, name, bio, country, profile photo, and social links — provided by you when you register.</li>
        <li><strong>Skills and project memberships:</strong> skills you add to your profile and projects you join or create.</li>
        <li><strong>Session data:</strong> authentication tokens stored in your browser to keep you logged in.</li>
        <li><strong>Usage data:</strong> actions you take on the platform (posting updates, chat messages, kanban cards, etc.) stored to provide the service.</li>
      </ul>
      <p>We do not collect any data beyond what is necessary to operate the platform. We do not sell your data. We do not use advertising.</p>
      <h2>How we use your data</h2>
      <ul>
        <li>To provide the GoodTribes.org service, including profile display, project collaboration, and notifications.</li>
        <li>To send transactional emails such as magic-link login, join request notifications, and project updates. You can opt out of the weekly digest in your settings.</li>
        <li>To match your skills with relevant projects (if you opt in to profile visibility).</li>
      </ul>
      <h2>Data storage and security</h2>
      <p>Your data is stored in a PostgreSQL database on servers within the European Union. File uploads are stored in object storage (S3-compatible). We use HTTPS for all connections. Authentication uses short-lived magic links — we never store passwords.</p>
      <h2>Your rights</h2>
      <p>Under GDPR you have the right to access, correct, and delete your personal data. You can delete your account at any time from Settings. For any data requests, contact us at <a href="mailto:hej@goodtribes.org">hej@goodtribes.org</a>.</p>
      <h2>Third-party services</h2>
      <ul>
        <li><strong>Resend</strong> — used to send transactional emails.</li>
        <li><strong>Meilisearch</strong> — used for full-text search of public profiles, projects, and organisations.</li>
      </ul>
      <p>These services only receive the minimum data necessary to perform their function.</p>
      <h2>Changes</h2>
      <p>We may update this policy. Significant changes will be communicated by email or a notice on the platform.</p>
    `.trim(),
  },
  terms: {
    title: "Terms of Service",
    body: `
      <p><em>Last updated: June 2026</em></p>
      <p>By using GoodTribes.org you agree to these terms. GoodTribes is operated by GoodTribes Foundation, a nonprofit organisation.</p>
      <h2>1. Your account</h2>
      <p>You are responsible for keeping your account secure and for all activity under it. You must be 16 years or older to use this platform. You may only have one account.</p>
      <h2>2. What you may do</h2>
      <ul>
        <li>Create a profile and join or start projects and organisations.</li>
        <li>Post updates, chat messages, wiki pages, ideas, and other content in the context of collaborative projects.</li>
        <li>Invite others to projects and organisations you administer.</li>
      </ul>
      <h2>3. What you may not do</h2>
      <ul>
        <li>Post content that is unlawful, harmful, abusive, defamatory, or that violates others' rights.</li>
        <li>Use the platform for commercial spam or unsolicited bulk messaging.</li>
        <li>Attempt to access others' accounts or data without authorisation.</li>
        <li>Use the platform for anything other than genuine social-impact collaboration.</li>
      </ul>
      <h2>4. Content and intellectual property</h2>
      <p>You retain ownership of content you create. By posting content you grant GoodTribes a licence to display and distribute it to other users as part of the service. You may not post content you do not have the right to share.</p>
      <h2>5. Volunteer work</h2>
      <p>GoodTribes facilitates volunteer collaboration. The platform does not create employment relationships. Any agreements between project owners and contributors are entirely between those parties — GoodTribes Foundation is not a party to them.</p>
      <h2>6. Termination</h2>
      <p>We may suspend or delete accounts that violate these terms. You may delete your account at any time from Settings.</p>
      <h2>7. Liability</h2>
      <p>GoodTribes.org is provided as-is. We make no warranty that the service will be uninterrupted or error-free. To the extent permitted by law, GoodTribes Foundation is not liable for any damages arising from use of the platform.</p>
      <h2>8. Changes</h2>
      <p>We may update these terms. Continued use of the platform after changes constitutes acceptance. We will notify users of material changes by email.</p>
      <h2>9. Contact</h2>
      <p>Questions? Email us at <a href="mailto:hej@goodtribes.org">hej@goodtribes.org</a>.</p>
    `.trim(),
  },
};
