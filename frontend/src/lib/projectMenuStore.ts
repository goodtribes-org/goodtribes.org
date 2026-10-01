"use client";

import { useSyncExternalStore } from "react";
import type { ProjectPhaseValue } from "@/lib/projectPhase";

// PROTOTYPE (proto/phases-top-tools-left): shared state between the project
// pages and the site header's SideMenu (the ☰ drawer), which lives in the
// root layout and otherwise knows nothing about the project it's on.
//
// 1. Project context: ProjectTopNav (rendered on every project page)
//    publishes the project's slug, phase and roles, so the drawer can show
//    that project's full, phase-aware tool menu (buildProjectNavGroups).
// 2. Pinned: "📌 Fäst menyn" turns the drawer's project tools into a fixed
//    left rail (ProjectSideNav). A per-viewer convenience in localStorage —
//    wrapped in try/catch, and the default (unpinned) is fine without it.

export type ProjectMenuContext = {
  slug: string;
  phase?: ProjectPhaseValue;
  completedChecklistKeys?: string[];
  isOwner?: boolean;
  isCommercial?: boolean;
};

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let context: ProjectMenuContext | null = null;

export function setProjectMenuContext(next: ProjectMenuContext | null) {
  context = next;
  emit();
}

export function useProjectMenuContext(): ProjectMenuContext | null {
  return useSyncExternalStore(subscribe, () => context, () => null);
}

const PIN_KEY = "projectMenuPinned";
let pinned: boolean | null = null;

function readPinned(): boolean {
  if (pinned === null) {
    try {
      pinned = window.localStorage.getItem(PIN_KEY) === "1";
    } catch {
      pinned = false;
    }
  }
  return pinned;
}

export function setProjectMenuPinned(next: boolean) {
  pinned = next;
  try {
    if (next) window.localStorage.setItem(PIN_KEY, "1");
    else window.localStorage.removeItem(PIN_KEY);
  } catch {
    // private browsing etc. — pinning just won't survive a reload
  }
  emit();
}

// false on the server and before hydration, so the rail never renders into
// the server HTML (no hydration mismatch for viewers who pinned it).
export function useProjectMenuPinned(): boolean {
  return useSyncExternalStore(subscribe, readPinned, () => false);
}

// "Hela menyn / bara symboler" for the pinned rail, like the original left
// menu had (removed in 1c1a37db): per viewer, localStorage, try/catch.
const ICON_ONLY_KEY = "projectMenuIconOnly";
let iconOnly: boolean | null = null;

function readIconOnly(): boolean {
  if (iconOnly === null) {
    try {
      iconOnly = window.localStorage.getItem(ICON_ONLY_KEY) === "1";
    } catch {
      iconOnly = false;
    }
  }
  return iconOnly;
}

export function setProjectMenuIconOnly(next: boolean) {
  iconOnly = next;
  try {
    if (next) window.localStorage.setItem(ICON_ONLY_KEY, "1");
    else window.localStorage.removeItem(ICON_ONLY_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useProjectMenuIconOnly(): boolean {
  return useSyncExternalStore(subscribe, readIconOnly, () => false);
}
