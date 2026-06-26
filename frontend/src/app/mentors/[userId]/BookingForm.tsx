"use client";

import { useState, useTransition } from "react";
import { requestMentorship } from "../actions";

type Project = { id: string; title: string };

interface BookingFormProps {
  mentorId: string;
  projects: Project[];
}

export default function BookingForm({ mentorId, projects }: BookingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("mentorId", mentorId);
    startTransition(async () => {
      const result = await requestMentorship(formData);
      if (result?.success) {
        setSuccess(true);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="p-5 bg-seagrass/10 border border-seagrass/30 rounded-xl text-sm text-seagrass font-medium">
        Din förfrågan har skickats! Mentorn hör av sig inom kort.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-watermelon bg-watermelon/10 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label htmlFor="projectId" className="block text-sm font-medium text-dark-slate mb-1">
          Vilket projekt gäller det? <span className="text-watermelon">*</span>
        </label>
        {projects.length === 0 ? (
          <p className="text-sm text-dark-slate/50 italic">
            Du har inga projekt. Skapa ett projekt först för att boka en mentor.
          </p>
        ) : (
          <select
            id="projectId"
            name="projectId"
            required
            className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">— välj projekt —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-dark-slate mb-1">
          Meddelande <span className="text-dark-slate/50 font-normal">(valfritt)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Berätta kort vad du vill ha hjälp med och var ditt projekt befinner sig just nu..."
          className="w-full border border-muted-teal rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || projects.length === 0}
        className="px-6 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors disabled:opacity-60"
      >
        {isPending ? "Skickar…" : "Skicka förfrågan"}
      </button>
    </form>
  );
}
