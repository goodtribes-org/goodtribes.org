"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import FileUpload from "@/components/FileUpload";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";
import { createUser } from "./actions";

type Skill = { id: string; name: string; tag: string };

export default function CreateUserForm({ allSkills }: { allSkills: Skill[] }) {
  const t = useTranslations("CreateUserForm");
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImageUpload(url: string) {
    setImage(url);
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  function toggleSdg(num: number) {
    setSelectedSdgs((prev) => (prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? t("genericError") });
        return;
      }
      formRef.current?.reset();
      setImage(null);
      setSelectedSdgs([]);
      setIsOpen(false);
      setMessage({ type: "ok", text: t("userAdded", { name: result.name ?? "" }) });
    });
  }

  const byTag: Record<string, Skill[]> = {};
  for (const s of allSkills) {
    if (!byTag[s.tag]) byTag[s.tag] = [];
    byTag[s.tag].push(s);
  }

  if (!isOpen) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-coral text-white hover:bg-watermelon transition-colors"
        >
          + {t("addNewUser")}
        </button>
        {message && (
          <p className={`text-xs mt-2 ${message.type === "ok" ? "text-seagrass" : "text-coral"}`}>{message.text}</p>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mb-8 border border-muted-teal/30 rounded-xl p-5 flex flex-col gap-4 bg-white"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-dark-slate">{t("newUser")}</h2>
        <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-dark-slate/50 hover:text-dark-slate">
          {t("cancel")}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <FileUpload visibility="public" accept="image/*" currentImageUrl={image ?? undefined} onUpload={handleImageUpload} />
        <input type="hidden" name="image" ref={imageInputRef} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            {t("name")} <span className="text-watermelon">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-1">
            {t("email")} <span className="text-watermelon">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-dark-slate mb-1">{t("bio")}</label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-dark-slate mb-1">{t("availability")}</label>
          <select
            id="availability"
            name="availability"
            defaultValue=""
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
          >
            <option value="">{t("availabilityPlaceholder")}</option>
            <option value="available">✅ {t("availabilityAvailable")}</option>
            <option value="limited">⏳ {t("availabilityLimited")}</option>
            <option value="busy">🔴 {t("availabilityBusy")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-dark-slate mb-1">{t("country")}</label>
          <input
            id="country"
            name="country"
            type="text"
            placeholder={t("countryPlaceholder")}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
      </div>

      {allSkills.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-dark-slate mb-3">{t("skills")}</legend>
          <div className="flex flex-col gap-4">
            {Object.entries(byTag).map(([tag, skills]) => (
              <div key={tag}>
                <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-2">{tag}</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <label key={s.id} className="cursor-pointer">
                      <input type="checkbox" name="skillIds" value={s.id} className="sr-only peer" />
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

      <div>
        <p className="text-sm font-medium text-dark-slate mb-3">{t("sdgInterests")}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SDG_NUMBERS.map((num) => {
            const selected = selectedSdgs.includes(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => toggleSdg(num)}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-colors select-none leading-tight text-center border-2 ${
                  selected ? "border-dark-slate/60 bg-dark-slate/5" : "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SdgIcon n={num} size={28} />
                <span className="mt-1 line-clamp-2 text-dark-slate">{SDG_LABELS_SV[num]}</span>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="interests" value={JSON.stringify(selectedSdgs)} />
      </div>

      <fieldset className="grid sm:grid-cols-2 gap-3">
        <legend className="text-sm font-medium text-dark-slate mb-1 sm:col-span-2">{t("socialLinks")}</legend>
        <input name="website" type="url" placeholder="Website" className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent" />
        <input name="linkedin" type="text" placeholder="LinkedIn" className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent" />
        <input name="github" type="text" placeholder="GitHub" className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent" />
        <input name="twitter" type="text" placeholder="Twitter / X" className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent" />
      </fieldset>

      <div className="flex items-center gap-3">
        <input id="showProfile" name="showProfile" type="checkbox" defaultChecked className="w-4 h-4 accent-coral" />
        <label htmlFor="showProfile" className="text-sm text-dark-slate">{t("showProfileLabel")}</label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {isPending ? t("addingButton") : t("addUserButton")}
      </button>

      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-seagrass" : "text-coral"}`}>{message.text}</p>
      )}
    </form>
  );
}
