"use client";

import { leaveProject } from "@/app/projects/[slug]/leave-actions";

export default function LeaveProjectButton({ projectId }: { projectId: string }) {
  return (
    <form
      action={leaveProject.bind(null, projectId)}
      onSubmit={(e) => {
        if (!confirm("Leave this project? You can request to rejoin later.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 rounded border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors"
      >
        Leave project
      </button>
    </form>
  );
}
