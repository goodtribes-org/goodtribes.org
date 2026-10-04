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
// 2. Pinned: the drawer's project tools as a fixed left rail
//    (ProjectSideNav), on by default; "📌" unpins it. A per-viewer choice in
//    localStorage, wrapped in try/catch; the default works without it.

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

// Pinned by default (2026-10-04): a new member should see the project's
// menu on the left without first finding "📌 Fäst menyn". Only an explicit
// unpin ("0") hides it.
function readPinned(): boolean {
  if (pinned === null) {
    try {
      pinned = window.localStorage.getItem(PIN_KEY) !== "0";
    } catch {
      pinned = true;
    }
  }
  return pinned;
}

export function setProjectMenuPinned(next: boolean) {
  pinned = next;
  try {
    window.localStorage.setItem(PIN_KEY, next ? "1" : "0");
  } catch {
    // private browsing etc. — the choice just won't survive a reload
  }
  emit();
}

// true on the server, the default, so the rail is in the server HTML for
// almost everyone; a viewer who unpinned it sees it go after hydration.
export function useProjectMenuPinned(): boolean {
  return useSyncExternalStore(subscribe, readPinned, () => true);
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
