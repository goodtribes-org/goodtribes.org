"use client";

import { useState } from "react";

export default function NewDraftForm({
  action,
  nameLabel,
  namePlaceholder,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  nameLabel: string;
  namePlaceholder: string;
  submitLabel: string;
}) {
  const [name, setName] = useState("");

  return (
    <form action={action} className="flex flex-col items-stretch gap-3">
      <label htmlFor="draft-name" className="sr-only">{nameLabel}</label>
      <input
        id="draft-name"
        name="name"
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
        className="w-full px-4 py-2.5 border border-muted-teal/40 rounded text-sm text-dark-slate focus:outline-none focus:ring-2 focus:ring-coral/40"
      />
      <button
        type="submit"
        disabled={name.trim().length === 0}
        className="px-5 py-2.5 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-coral self-center"
      >
        {submitLabel}
      </button>
    </form>
  );
}
