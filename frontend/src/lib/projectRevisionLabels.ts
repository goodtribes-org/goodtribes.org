import { getTranslations } from "next-intl/server";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";

// The human name of a proposable field (#290), e.g. "Sammanfattning" or a
// canvas block's name.
export async function revisionFieldLabels(locale: string): Promise<(field: string) => string> {
  const [t, canvas] = await Promise.all([getTranslations({ locale, namespace: "ProjectRevisions" }), getCanvasFieldLabels(locale)]);
  return (field) => (field === "project.summary" ? t("field.summary") : field === "project.description" ? t("field.description") : canvas[field] ?? field);
}
