"use client";

import { useRef } from "react";
import FileUpload from "@/components/FileUpload";
import { createOrg } from "./actions";

export default function NewOrgForm() {
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={createOrg} className="flex flex-col gap-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
          Namn <span className="text-watermelon">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Organisationens namn"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          Beskrivning
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Berätta om organisationen, vad ni gör och vad ni söker hjälp med..."
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">Logotyp</label>
        <FileUpload
          visibility="public"
          accept="image/*"
          onUpload={(url) => {
            if (imageInputRef.current) imageInputRef.current.value = url;
          }}
        />
        <input type="hidden" name="imageUrl" ref={imageInputRef} />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="isPublic"
          name="isPublic"
          type="checkbox"
          defaultChecked
          className="accent-seagrass w-4 h-4"
        />
        <label htmlFor="isPublic" className="text-sm text-dark-slate">
          Visa organisationen publikt
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
      >
        Skapa organisation
      </button>
    </form>
  );
}
