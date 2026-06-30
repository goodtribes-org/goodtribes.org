"use client";

import { useRef, useState } from "react";
import FileUpload from "@/components/FileUpload";
import { saveProfile } from "./actions";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";

type Skill = { id: string; name: string; tag: string };

type Props = {
  name: string;
  bio: string;
  country: string;
  social: Record<string, string>;
  showProfile: boolean;
  image: string | null;
  isOnboarded: boolean;
  allSkills: Skill[];
  currentSkillIds: string[];
  availability: string | null;
  currentInterests: number[];
};

export default function ProfileSetupForm({
  name,
  bio,
  country,
  social,
  showProfile,
  image,
  isOnboarded,
  allSkills,
  currentSkillIds,
  availability,
  currentInterests,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>(currentInterests);

  function handleImageUpload(url: string) {
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  function toggleSdg(num: number) {
    setSelectedSdgs((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  }

  // Group skills by tag
  const byTag: Record<string, Skill[]> = {};
  for (const s of allSkills) {
    if (!byTag[s.tag]) byTag[s.tag] = [];
    byTag[s.tag].push(s);
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

      <div>
        <label htmlFor="availability" className="block text-sm font-medium text-dark-slate mb-1">
          Tillgänglighet
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={availability ?? ""}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
        >
          <option value="">Välj tillgänglighet...</option>
          <option value="available">✅ Tillgänglig för nya projekt</option>
          <option value="limited">⏳ Begränsad tid</option>
          <option value="busy">🔴 Inte tillgänglig just nu</option>
        </select>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-dark-slate mb-1">
          Country
        </label>
        <input
          id="country"
          name="country"
          type="text"
          defaultValue={country}
          placeholder="e.g. Sweden"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      {/* Skills */}
      {allSkills.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-dark-slate mb-3">Skills</legend>
          <div className="flex flex-col gap-4">
            {Object.entries(byTag).map(([tag, skills]) => (
              <div key={tag}>
                <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-2">
                  {tag}
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <label key={s.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="skillIds"
                        value={s.id}
                        defaultChecked={currentSkillIds.includes(s.id)}
                        className="sr-only peer"
                      />
                      <span className="inline-block px-3 py-1 rounded-full text-sm border border-muted-teal text-dark-slate/60 peer-checked:border-seagrass peer-checked:bg-seagrass/10 peer-checked:text-seagrass hover:border-dark-slate/40 transition-colors select-none">
                        {s.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {/* SDG Interests */}
      <div>
        <p className="text-sm font-medium text-dark-slate mb-3">
          Vilket SDG-mål brinner du för?
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SDG_NUMBERS.map((num) => {
            const selected = selectedSdgs.includes(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => toggleSdg(num)}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-colors select-none leading-tight text-center border-2 ${
                  selected
                    ? "border-dark-slate/60 bg-dark-slate/5"
                    : "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SdgIcon n={num} size={36} />
                <span className="mt-1 line-clamp-2 text-dark-slate">{SDG_LABELS_SV[num]}</span>
              </button>
            );
          })}
        </div>
        <input
          type="hidden"
          name="interests"
          value={JSON.stringify(selectedSdgs)}
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
