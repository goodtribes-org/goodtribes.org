"use client";

import { useState } from "react";
import SpotlightTour, { type TourStep } from "@/components/SpotlightTour";
import { dismissTour } from "@/lib/tourActions";

const STEPS: TourStep[] = [
  {
    target: "nav-discover",
    title: "Utforska",
    body: "Bläddra bland alla projekt, idéer, organisationer och kompetenser på plattformen.",
  },
  {
    target: "nav-messages",
    title: "Meddelanden",
    body: "Direktmeddelanden och kanaler för projekten och organisationerna du är med i.",
  },
  {
    target: "nav-account",
    title: "Ditt konto",
    body: "Här hittar du ditt Arbetsrum, din Dashboard och dina profilinställningar.",
  },
  {
    target: "workplace-projects",
    title: "Dina projekt",
    body: "De projekt du är med i visas här — redo att komma igång.",
  },
];

export default function VolunteerTourGate({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!show || dismissed) return null;

  return (
    <SpotlightTour
      steps={STEPS}
      onDismiss={() => {
        setDismissed(true);
        dismissTour();
      }}
    />
  );
}
