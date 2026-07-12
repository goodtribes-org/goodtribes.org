"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { indexDocuments } from "@/lib/meili";
import { sendEmail } from "@/lib/email";


export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const country = (formData.get("country") as string | null)?.trim() || null;
  const image = (formData.get("image") as string | null)?.trim() || null;

  const socialLinks: Record<string, string> = {};
  for (const key of ["website", "linkedin", "github", "twitter"] as const) {
    const val = (formData.get(key) as string | null)?.trim();
    if (val) socialLinks[key] = val;
  }

  const showProfile = formData.get("showProfile") === "on";
  const skillIds = formData.getAll("skillIds") as string[];

  const interestsRaw = formData.get("interests") as string | null;
  const interests: number[] = interestsRaw ? (JSON.parse(interestsRaw) as number[]) : [];

  const availabilityRaw = (formData.get("availability") as string | null)?.trim() || null;
  const availability = availabilityRaw && ["available", "limited", "busy"].includes(availabilityRaw)
    ? availabilityRaw
    : null;

  const existing = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { onboardingDone: true },
  });
  const isFirstSetup = !existing?.onboardingDone;

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name,
      bio: bio || null,
      country,
      socialLinks,
      showProfile,
      interests,
      availability,
      ...(image ? { image } : {}),
    },
  });

  await prisma.$transaction([
    prisma.userSkill.deleteMany({ where: { userId: updated.id } }),
    prisma.userSkill.createMany({
      data: skillIds.map((skillId) => ({ userId: updated.id, skillId })),
      skipDuplicates: true,
    }),
  ]);

  if (showProfile) {
    await indexDocuments("members", [
      {
        id: `member-${updated.id}`,
        type: "member",
        title: name,
        description: bio || "",
        url: `/members/${updated.id}`,
      },
    ]);
  }

  if (isFirstSetup) {
    const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
    await sendEmail({
      to: session.user.email,
      subject: "Welcome to GoodTribes!",
      html: `
        <p>Hi ${name || "there"},</p>
        <p>Welcome to GoodTribes — a platform for people who want to make a real difference.</p>
        <p>Here's what you can do next:</p>
        <ul style="line-height:2;">
          <li>🔍 <a href="${base}/projects">Browse projects</a> and join one that inspires you</li>
          <li>💡 <a href="${base}/ideas/new">Share an idea</a> you want to see in the world</li>
          <li>👥 <a href="${base}/members">Explore members</a> with skills like yours</li>
        </ul>
        <p style="margin-top:24px;">
          <a href="${base}/projects" style="background:#E85D4A;color:white;padding:10px 24px;border-radius:4px;text-decoration:none;display:inline-block;">
            Explore GoodTribes →
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px;">GoodTribes.org — making the world better, together.</p>
      `,
    });
  }

  redirect("/profile");
}
