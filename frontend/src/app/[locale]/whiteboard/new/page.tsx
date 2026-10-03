import { redirect } from "next/navigation";

// Standalone whiteboard drafts can no longer be created (2026-10-03): the tool
// is used inside a project. Old links land on "Nytt projekt"; existing
// drafts stay readable at /whiteboard/[draftId], with "Gör om till projekt".
export default async function NewWhiteboardDraftPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/projects/new`);
}
