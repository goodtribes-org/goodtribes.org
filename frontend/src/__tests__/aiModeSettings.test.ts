const auth = jest.fn();
const hasProjectRole = jest.fn();
const projectFindUnique = jest.fn();
const projectUpdate = jest.fn();
const phaseUpsert = jest.fn();
const phaseDeleteMany = jest.fn();
const stepUpsert = jest.fn();
const stepDeleteMany = jest.fn();

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
jest.mock("../auth", () => ({ auth: () => auth() }));
jest.mock("../lib/authz", () => ({
  PROJECT_LEAD_ROLES: ["FOUNDER", "ADMIN"],
  hasProjectRole: (...a: unknown[]) => hasProjectRole(...a),
}));
jest.mock("../lib/prisma", () => ({
  prisma: {
    project: { findUnique: (...a: unknown[]) => projectFindUnique(...a), update: (...a: unknown[]) => projectUpdate(...a) },
    projectPhaseAiSetting: { upsert: (...a: unknown[]) => phaseUpsert(...a), deleteMany: (...a: unknown[]) => phaseDeleteMany(...a) },
    projectStepAiSetting: { upsert: (...a: unknown[]) => stepUpsert(...a), deleteMany: (...a: unknown[]) => stepDeleteMany(...a) },
  },
}));

import { setPhaseAiMode, setProjectAiMode, setStepAiMode } from "../lib/actions/aiModeSettings";

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "lead" } });
  projectFindUnique.mockResolvedValue({ id: "p1" });
  hasProjectRole.mockResolvedValue(true);
});

describe("AI mode settings actions", () => {
  it("a project lead can set the project mode", async () => {
    await setProjectAiMode("proj", "ASSIST");
    expect(projectUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { aiMode: "ASSIST" } });
  });

  it("a non-lead is refused before anything is written", async () => {
    hasProjectRole.mockResolvedValue(false);
    await expect(setProjectAiMode("proj", "AGENT")).rejects.toThrow("Forbidden");
    await expect(setPhaseAiMode("proj", "IDEA", "AGENT")).rejects.toThrow("Forbidden");
    await expect(setStepAiMode("proj", "lean_canvas_created", "MANUAL")).rejects.toThrow("Forbidden");
    expect(projectUpdate).not.toHaveBeenCalled();
    expect(phaseUpsert).not.toHaveBeenCalled();
    expect(stepUpsert).not.toHaveBeenCalled();
  });

  it("rejects invalid modes, phases and step keys", async () => {
    await expect(setProjectAiMode("proj", "SOMETIMES")).rejects.toThrow("Ogiltigt AI-läge");
    // SPRINT is not a display phase — it's folded into IDEA.
    await expect(setPhaseAiMode("proj", "SPRINT", "AGENT")).rejects.toThrow("Ogiltig fas");
    await expect(setStepAiMode("proj", "not_a_step", "AGENT")).rejects.toThrow("Okänt steg");
    expect(projectUpdate).not.toHaveBeenCalled();
  });

  it("null removes the phase/step override so the level inherits again", async () => {
    await setPhaseAiMode("proj", "PILOT", null);
    expect(phaseDeleteMany).toHaveBeenCalledWith({ where: { projectId: "p1", phase: "PILOT" } });
    await setStepAiMode("proj", "lean_canvas_created", null);
    expect(stepDeleteMany).toHaveBeenCalledWith({ where: { projectId: "p1", stepKey: "lean_canvas_created" } });
    expect(phaseUpsert).not.toHaveBeenCalled();
    expect(stepUpsert).not.toHaveBeenCalled();
  });

  it("records who set a phase override", async () => {
    await setPhaseAiMode("proj", "IDEA", "MANUAL");
    expect(phaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ aiMode: "MANUAL", updatedById: "lead" }) }),
    );
  });
});
