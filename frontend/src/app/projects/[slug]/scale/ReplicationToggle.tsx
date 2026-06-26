"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  openForReplication: boolean;
}

export default function ReplicationToggle({ projectId, openForReplication }: Props) {
  const [enabled, setEnabled] = useState(openForReplication);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch("/api/projects/replication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, openForReplication: !enabled }),
      });
      if (res.ok) {
        setEnabled((v) => !v);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-seagrass" : "bg-gray-300"
        } disabled:opacity-50`}
        aria-label="Öppen för replikering"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-dark-slate/70">
        {enabled ? "Öppen för replikering" : "Stängd för replikering"}
      </span>
    </div>
  );
}
