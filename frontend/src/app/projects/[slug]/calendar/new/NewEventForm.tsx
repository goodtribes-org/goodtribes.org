"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  slug: string;
  defaultType?: string;
  action: (formData: FormData) => Promise<void>;
}

export default function NewEventForm({ slug, defaultType = "meeting", action }: Props) {
  const [type, setType] = useState(defaultType);
  const isMilestone = type === "milestone";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Titel <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder={isMilestone ? "Milstolpens titel" : "Händelsens titel"}
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          Beskrivning
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Valfri beskrivning"
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-dark-slate mb-1">
          Typ
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
        >
          <option value="meeting">Möte</option>
          <option value="deadline">Deadline</option>
          <option value="custom">Anpassad</option>
          <option value="milestone">Milstolpe</option>
        </select>
      </div>

      {isMilestone ? (
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-dark-slate mb-1">
            Förfallodatum
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-dark-slate mb-1">
              Starttid <span className="text-watermelon">*</span>
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-dark-slate mb-1">
              Sluttid
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-coral text-white text-sm font-medium px-5 py-2 rounded hover:bg-watermelon transition-colors"
        >
          {isMilestone ? "Skapa milstolpe" : "Skapa händelse"}
        </button>
        <Link
          href={`/projects/${slug}/calendar`}
          className="text-sm text-dark-slate/60 hover:text-dark-slate px-5 py-2 rounded border border-muted-teal/40 transition-colors"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
