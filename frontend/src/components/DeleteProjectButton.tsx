"use client";

import { deleteProject } from "@/app/[locale]/projects/[slug]/leave-actions";

export default function DeleteProjectButton({ slug }: { slug: string }) {
  return (
    <form
      action={deleteProject.bind(null, slug)}
      onSubmit={(e) => {
        if (!confirm("Permanently delete this project and all its data? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
      >
        Delete project
      </button>
    </form>
  );
}
