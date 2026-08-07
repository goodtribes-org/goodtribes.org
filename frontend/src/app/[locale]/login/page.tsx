import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const params = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-2">{t("loginTitle")}</h1>
      <p className="text-dark-slate/70 mb-8">{t("loginSubtitle")}</p>

      {params.error && (
        <div className="mb-6 p-3 bg-watermelon/10 border border-watermelon/40 rounded text-sm text-watermelon">
          {t("genericError")}
        </div>
      )}

      <LoginForm callbackUrl={params.callbackUrl ?? "/"} />

      <p className="mt-6 text-sm text-dark-slate/60 text-center">
        {t("newHere")}{" "}
        <Link href="/signup" className="text-coral hover:text-seagrass underline underline-offset-4">
          {t("createAccountLink")}
        </Link>
      </p>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 pt-6 border-t border-muted-teal/40">
          <p className="text-xs text-dark-slate/40 text-center mb-3">Dev shortcut</p>
          <a
            href={`/api/dev-login${params.callbackUrl ? `?callbackUrl=${encodeURIComponent(params.callbackUrl)}` : ""}`}
            className="block w-full text-center bg-dry-sage text-dark-slate/70 rounded-md px-4 py-2 text-sm font-medium hover:bg-muted-teal/30 transition-colors"
          >
            Log in as {process.env.DEV_EMAIL ?? "niklas.gunnas@goodtribes.org"}
          </a>
        </div>
      )}
    </div>
  );
}
