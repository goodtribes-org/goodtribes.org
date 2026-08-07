"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SpotlightTour, { type TourStep } from "@/components/SpotlightTour";
import { dismissOrgTour } from "@/lib/tourActions";

export default function OrgTourGate({ organisationId, show }: { organisationId: string; show: boolean }) {
  const t = useTranslations("OrgTourGate");
  const [dismissed, setDismissed] = useState(false);
  if (!show || dismissed) return null;

  const steps: TourStep[] = [
    {
      target: "org-edit",
      title: t("editTitle"),
      body: t("editBody"),
    },
    {
      target: "org-invite",
      title: t("inviteTitle"),
      body: t("inviteBody"),
    },
    {
      target: "org-projects-tab",
      title: t("projectsTitle"),
      body: t("projectsBody"),
    },
    {
      target: "org-resources-tab",
      title: t("resourcesTitle"),
      body: t("resourcesBody"),
    },
    {
      target: "org-workspace",
      title: t("workspaceTitle"),
      body: t("workspaceBody"),
    },
  ];

  return (
    <SpotlightTour
      steps={steps}
      onDismiss={() => {
        setDismissed(true);
        dismissOrgTour(organisationId);
      }}
    />
  );
}
