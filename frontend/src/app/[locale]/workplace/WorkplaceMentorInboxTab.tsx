import Link from "next/link";
import { acceptMentorship } from "@/app/[locale]/mentors/actions";
import { relativeTime, type T } from "./workplaceHelpers";

// A thin server-action wrapper, rather than passing acceptMentorship (or an
// inline closure around it) straight into <form action>: acceptMentorship
// resolves to a { success/error } result, which doesn't satisfy the
// `(formData: FormData) => void | Promise<void>` shape a form action expects,
// and an inline arrow closure defined in this non-page file isn't picked up
// by Next's automatic inline-server-action extraction the way it was when
// this same JSX lived directly in workplace/page.tsx. An explicit "use
// server" directive on a void-returning wrapper is the documented, boundary-
// safe way to do this regardless of which file the JSX lives in.
async function acceptMentorshipAction(requestId: string) {
  "use server";
  await acceptMentorship(requestId);
}

type MentorRequest = {
  id: string;
  status: string;
  message: string | null;
  sessionAt: Date | null;
  createdAt: Date;
  project: { title: string; slug: string };
  feedback: { rating: number } | null;
};

export default function WorkplaceMentorInboxTab({
  t,
  locale,
  mentorRequests,
}: {
  t: T;
  locale: string;
  mentorRequests: MentorRequest[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("mentorRequestsHeading")}</h2>
      {mentorRequests.length === 0 ? (
        <p className="text-dark-slate/50 italic text-sm">
          {t("noMentorRequests")}
        </p>
      ) : (
        <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
          {mentorRequests.map((req) => (
            <div key={req.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/projects/${req.project.slug}`}
                    className="font-semibold text-dark-slate hover:text-seagrass transition-colors"
                  >
                    {req.project.title}
                  </Link>
                  {req.message && (
                    <p className="text-sm text-dark-slate/70 mt-1">{req.message}</p>
                  )}
                  <p className="text-xs text-dark-slate/40 mt-1">
                    {relativeTime(t, req.createdAt)}
                    {req.sessionAt && (
                      <>
                        {" "}&middot;{" "}
                        {t("sessionDateLabel")}{" "}
                        {new Date(req.sessionAt).toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE")}
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                    req.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {req.status === "pending" ? t("statusPending") : t("statusAccepted")}
                </span>
              </div>
              <div className="flex gap-2">
                {req.status === "pending" && (
                  <form action={acceptMentorshipAction.bind(null, req.id)}>
                    <button
                      type="submit"
                      className="text-sm font-medium px-4 py-1.5 rounded-md bg-seagrass text-white hover:bg-seagrass/80 transition-colors"
                    >
                      {t("acceptButton")}
                    </button>
                  </form>
                )}
                {req.status === "accepted" && !req.feedback && (
                  <Link
                    href={`/projects/${req.project.slug}`}
                    className="text-sm font-medium px-4 py-1.5 rounded-md border border-seagrass text-seagrass hover:bg-seagrass/10 transition-colors"
                  >
                    {t("completeLink")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
