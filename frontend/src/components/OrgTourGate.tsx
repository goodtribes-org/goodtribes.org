"use client";

import { useState } from "react";
import SpotlightTour, { type TourStep } from "@/components/SpotlightTour";
import { dismissOrgTour } from "@/lib/tourActions";

const STEPS: TourStep[] = [
  {
    target: "org-edit",
    title: "Fyll i mer om er",
    body: "Lägg till kategori, kompetenser ni söker och en beskrivning så att rätt volontärer hittar er.",
  },
  {
    target: "org-invite",
    title: "Bjud in medlemmar",
    body: "Bjud in fler personer till organisationen via e-post här.",
  },
  {
    target: "org-projects-tab",
    title: "Starta ert första projekt",
    body: "Projekt är där det verkliga samarbetet händer — skapa ett och koppla det till organisationen.",
  },
  {
    target: "org-resources-tab",
    title: "Resurser och aktivitet",
    body: "Dela filer med medlemmarna och håll koll på vad som händer i organisationen.",
  },
  {
    target: "org-workspace",
    title: "Workspace",
    body: "En intern yta för uppgifter och medlemsansökningar, bara synlig för medlemmar.",
  },
];

export default function OrgTourGate({ organisationId, show }: { organisationId: string; show: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!show || dismissed) return null;

  return (
    <SpotlightTour
      steps={STEPS}
      onDismiss={() => {
        setDismissed(true);
        dismissOrgTour(organisationId);
      }}
    />
  );
}
