"use client";

import React, { useState } from "react";
import { toProxyUrl } from "@/lib/storageUrl";

export type CardCreator = { name: string | null; image?: string | null };

export type Member = { id: string; name: string | null; image?: string | null };

export type TaskEstimate = {
  aiHours: number;
  aiConfidence: string;
  aiReasoning: string;
} | null;

export type Subtask = { id: string; title: string; done: boolean; order: number };

export type Comment = {
  id: string;
  authorId: string;
  author: { id: string; name: string | null };
  body: string;
  createdAt: Date | string;
  likeCount?: number;
  likedByMe?: boolean;
};

export type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  startDate?: Date | string | null;
  column: string;
  order: number;
  priority: string;
  category?: string | null;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: CardCreator | null;
  estimate?: TaskEstimate;
  subtasks?: Subtask[];
  comments?: Comment[];
  likeCount?: number;
  likedByMe?: boolean;
  aiTaskRuns?: Array<{
    id: string;
    agentType: string;
    status: string;
    outputMarkdown: string | null;
    attemptNumber: number;
    completedAt: Date | string | null;
  }>;
};

export type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

export const CATEGORY_META: Record<string, { label: string; bg: string; text: string; hex: string }> = {
  teknik:         { label: "Teknik",        bg: "bg-blue-100",   text: "text-blue-700",   hex: "#3b82f6" },
  design:         { label: "Design",        bg: "bg-pink-100",   text: "text-pink-700",   hex: "#ec4899" },
  ekonomi:        { label: "Ekonomi",       bg: "bg-emerald-100",text: "text-emerald-700",hex: "#10b981" },
  strategi:       { label: "Strategi",      bg: "bg-amber-100",  text: "text-amber-700",  hex: "#f59e0b" },
  administration: { label: "Admin",         bg: "bg-slate-100",  text: "text-slate-600",  hex: "#64748b" },
  community:      { label: "Community",     bg: "bg-orange-100", text: "text-orange-700", hex: "#f97316" },
};

export const PRIORITY_META: Record<string, { label: string; color: string; dot: string; bottomHex: string }> = {
  low:    { label: "Low",    color: "text-gray-400",   dot: "bg-gray-300",   bottomHex: "#d1d5db" },
  normal: { label: "Normal", color: "text-blue-500",   dot: "bg-blue-400",   bottomHex: "#60a5fa" },
  high:   { label: "High",   color: "text-orange-500", dot: "bg-orange-400", bottomHex: "#fb923c" },
  urgent: { label: "Urgent", color: "text-red-500",    dot: "bg-red-500",    bottomHex: "#ef4444" },
};

export const COLUMNS = [
  { key: "BACKLOG", label: "Backlog", color: "#ef4444" },
  { key: "TODO",    label: "ToDo",    color: "#f97316" },
  { key: "DOING",   label: "Doing",   color: "#facc15" },
  { key: "REVIEW",  label: "Review",  color: "#3b82f6" },
  { key: "DONE",    label: "Done",    color: "#16a34a" },
];

export const COLUMN_ORDER = COLUMNS.map((c) => c.key);

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

export function Avatar({ name, image }: { name: string | null; image?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  if (image && !imgFailed) {
    return (
      <img
        src={toProxyUrl(image)}
        alt={name ?? ""}
        className="w-5 h-5 rounded-full object-cover shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-seagrass flex items-center justify-center text-white text-[9px] font-bold shrink-0">
      {initials}
    </div>
  );
}

export class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError(error: unknown) {
    if (typeof window !== "undefined" && error instanceof Error && error.name === "ChunkLoadError") {
      window.location.reload();
    }
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}
