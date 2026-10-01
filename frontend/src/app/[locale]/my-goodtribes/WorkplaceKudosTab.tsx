import Link from "next/link";
import { relativeTime, type T } from "./workplaceHelpers";

type KudosRow = {
  id: string;
  message: string;
  createdAt: Date;
  fromUser: { name: string | null };
  project: { title: string; slug: string } | null;
};

export default function WorkplaceKudosTab({
  t,
  totalKudosReceived,
  kudosReceived,
}: {
  t: T;
  totalKudosReceived: number;
  kudosReceived: KudosRow[];
}) {
  return (
    <div className="space-y-10">
      {/* Total count */}
      <section>
        <div className="border border-muted-teal rounded-lg p-8 flex flex-col items-center gap-2 text-center">
          <span className="text-5xl font-bold text-seagrass">{totalKudosReceived}</span>
          <span className="text-lg font-semibold text-dark-slate">{t("kudosReceivedLabel")}</span>
          <span className="text-sm text-dark-slate/50">{t("totalLabel")}</span>
        </div>
      </section>

      {/* Kudos list */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("receivedKudosHeading")}</h2>
        {kudosReceived.length === 0 ? (
          <p className="text-dark-slate/50 italic text-sm">
            {t("noKudosYet")}
          </p>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {kudosReceived.map((kudos) => (
              <div key={kudos.id} className="flex items-start gap-3 px-4 py-4">
                <span className="text-xl flex-shrink-0 w-7 text-center mt-0.5" aria-hidden="true">
                  &#128079;
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-slate">{kudos.message}</p>
                  <p className="text-xs text-dark-slate/40 mt-1">
                    {kudos.fromUser.name ?? t("anonymousFallback")}
                    {kudos.project && (
                      <>
                        {" "}
                        &middot;{" "}
                        <Link
                          href={`/projects/${kudos.project.slug}`}
                          className="hover:text-seagrass underline underline-offset-2"
                        >
                          {kudos.project.title}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-dark-slate/40 flex-shrink-0 mt-0.5">
                  {relativeTime(t, kudos.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
