import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import SignupForm from "./SignupForm";

export default async function SignupPage({
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
      <h1 className="text-2xl font-bold mb-2">{t("signupTitle")}</h1>
      <p className="text-dark-slate/70 mb-8">{t("signupSubtitle")}</p>

      {params.error && (
        <div className="mb-6 p-3 bg-watermelon/10 border border-watermelon/40 rounded text-sm text-watermelon">
          {t("genericError")}
        </div>
      )}

      <SignupForm callbackUrl={params.callbackUrl ?? "/"} />

      <p className="mt-6 text-sm text-dark-slate/60 text-center">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-coral hover:text-seagrass underline underline-offset-4">
          {t("logInLink")}
        </Link>
      </p>
    </div>
  );
}
