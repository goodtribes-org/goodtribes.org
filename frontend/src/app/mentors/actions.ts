"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function applyAsMentor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const rawCategories = formData.getAll("categories") as string[];
  const categories = rawCategories.filter(Boolean);

  if (!bio) return { error: "Bio krävs." };
  if (categories.length === 0) return { error: "Välj minst en kategori." };

  const existing = await prisma.mentor.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) return { error: "Du har redan ansökt om att bli mentor." };

  await prisma.mentor.create({
    data: {
      userId: session.user.id,
      bio,
      categories,
      verified: false,
    },
  });

  revalidatePath("/mentors");
  return { success: true };
}

export async function requestMentorship(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const mentorId = (formData.get("mentorId") as string | null)?.trim() ?? "";
  const projectId = (formData.get("projectId") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!mentorId || !projectId) return { error: "Ogiltiga uppgifter." };

  // Verify the project is owned by the session user
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
    select: { id: true },
  });
  if (!project) return { error: "Du äger inte det projektet." };

  const mentor = await prisma.mentor.findUnique({
    where: { id: mentorId, verified: true },
    select: { id: true },
  });
  if (!mentor) return { error: "Mentor hittades inte." };

  // Prevent duplicate pending requests
  const existing = await prisma.mentorshipRequest.findFirst({
    where: { projectId, mentorId, status: "pending" },
  });
  if (existing) return { error: "Det finns redan en aktiv förfrågan för det här projektet." };

  await prisma.mentorshipRequest.create({
    data: { projectId, mentorId, message },
  });

  revalidatePath(`/mentors/${mentorId}`);
  return { success: true };
}

export async function acceptMentorship(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const request = await prisma.mentorshipRequest.findUnique({
    where: { id: requestId },
    include: { mentor: { select: { userId: true } } },
  });

  if (!request) return { error: "Förfrågan hittades inte." };
  if (request.mentor.userId !== session.user.id)
    return { error: "Inte behörig." };

  await prisma.mentorshipRequest.update({
    where: { id: requestId },
    data: { status: "accepted" },
  });

  revalidatePath("/mentors");
  return { success: true };
}

export async function completeMentorship(requestId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tokensRaw = formData.get("tokensAwarded") as string | null;
  const tokensAwarded = tokensRaw ? parseFloat(tokensRaw) : null;
  const rating = parseInt((formData.get("rating") as string | null) ?? "0");
  const comment = (formData.get("comment") as string | null)?.trim() ?? null;

  const request = await prisma.mentorshipRequest.findUnique({
    where: { id: requestId },
    include: { mentor: { select: { userId: true } } },
  });

  if (!request) return { error: "Förfrågan hittades inte." };
  if (request.mentor.userId !== session.user.id)
    return { error: "Inte behörig." };

  await prisma.mentorshipRequest.update({
    where: { id: requestId },
    data: {
      status: "completed",
      tokensAwarded: tokensAwarded ?? undefined,
    },
  });

  if (rating >= 1 && rating <= 5) {
    await prisma.mentorshipFeedback.upsert({
      where: { mentorshipRequestId: requestId },
      create: { mentorshipRequestId: requestId, rating, comment },
      update: { rating, comment },
    });
  }

  revalidatePath("/mentors");
  return { success: true };
}
