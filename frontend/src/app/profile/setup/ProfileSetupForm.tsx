"use client";

import { useRef } from "react";
import FileUpload from "@/components/FileUpload";
import { saveProfile } from "./actions";

type Props = {
  name: string;
  bio: string;
  social: Record<string, string>;
  showProfile: boolean;
  image: string | null;
  isOnboarded: boolean;
};

export default function ProfileSetupForm({ name, bio, social, showProfile, image, isOnboarded }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(url: string) {
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  return (
    <form action={saveProfile} className="flex flex-col gap-5">
      <div className="flex flex-col items-center mb-3">
        <FileUpload
          visibility="public"
          accept="image/*"
          currentImageUrl={image ?? undefined}
          onUpload={handleImageUpload}
        />
        <input type="hidden" name="image" ref={imageInputRef} defaultValue={image ?? ""} />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
          Name <span className="text-watermelon">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          defaultValue={name}
          placeholder="Your name"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-dark-slate mb-1">
          Description
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={bio}
          placeholder="Tell us a little about yourself, what you can contribute..."
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="showProfile"
          name="showProfile"
          type="checkbox"
          defaultChecked={showProfile}
          className="w-4 h-4 accent-coral"
        />
        <label htmlFor="showProfile" className="text-sm text-dark-slate">
          Show my profile on the members page
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-dark-slate mb-1">Social media</legend>

        <div>
          <label htmlFor="website" className="block text-xs text-dark-slate/60 mb-1">Website</label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={social.website ?? ""}
            placeholder="https://yourwebsite.com"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="linkedin" className="block text-xs text-dark-slate/60 mb-1">LinkedIn</label>
          <input
            id="linkedin"
            name="linkedin"
            type="text"
            defaultValue={social.linkedin ?? ""}
            placeholder="linkedin.com/in/yourname"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="github" className="block text-xs text-dark-slate/60 mb-1">GitHub</label>
          <input
            id="github"
            name="github"
            type="text"
            defaultValue={social.github ?? ""}
            placeholder="github.com/yourname"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="twitter" className="block text-xs text-dark-slate/60 mb-1">Twitter / X</label>
          <input
            id="twitter"
            name="twitter"
            type="text"
            defaultValue={social.twitter ?? ""}
            placeholder="@yourname"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
      >
        {isOnboarded ? "Save changes" : "Save and continue"}
      </button>
    </form>
  );
}
