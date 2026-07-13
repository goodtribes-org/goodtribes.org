import { getTranslations } from "next-intl/server";

export default async function MessagesIndexPage() {
  const t = await getTranslations("Messages");
  return (
    <div className="hidden md:flex items-center justify-center h-[calc(100dvh-220px)] text-dark-slate/40 text-sm">
      {t("selectRoom")}
    </div>
  );
}
