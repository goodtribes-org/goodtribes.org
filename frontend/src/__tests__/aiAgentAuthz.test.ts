const auth = jest.fn();
const isRealMember = jest.fn();
const hasProjectRole = jest.fn();
const getAiClientFor = jest.fn();
const cardFindUnique = jest.fn();
const cardUpdate = jest.fn();
const runFindUnique = jest.fn();
const runCreate = jest.fn();
const runUpdate = jest.fn();
const reviewCreate = jest.fn();
const awardTokens = jest.fn();
const transaction = jest.fn();

jest.mock("../auth", () => ({ auth: () => auth() }));
jest.mock("../lib/authz", () => ({
  PROJECT_LEAD_ROLES: ["FOUNDER", "ADMIN"],
  isRealMember: (...a: unknown[]) => isRealMember(...a),
  hasProjectRole: (...a: unknown[]) => hasProjectRole(...a),
  isCardClaimant: (card: { assigneeId: string | null; openToPublic: boolean }, userId: string) =>
    card.openToPublic && card.assigneeId === userId,
}));
jest.mock("../lib/aiMode", () => ({
  getAiClientFor: (...a: unknown[]) => getAiClientFor(...a),
  aiGateStatus: () => 403,
}));
jest.mock("../lib/githubSync", () => ({ GITHUB_CARD_LOCKED_MESSAGE: "locked" }));
jest.mock("../lib/tokens", () => ({ awardTokens: (...a: unknown[]) => awardTokens(...a) }));
jest.mock("../lib/prisma", () => ({
  prisma: {
    kanbanCard: { findUnique: (...a: unknown[]) => cardFindUnique(...a), update: (...a: unknown[]) => cardUpdate(...a) },
    aiTaskRun: {
      findUnique: (...a: unknown[]) => runFindUnique(...a),
      create: (...a: unknown[]) => runCreate(...a),
      update: (...a: unknown[]) => runUpdate(...a),
    },
    aiTaskReview: { create: (...a: unknown[]) => reviewCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

import { POST as startRun } from "../app/api/ai-agent/route";
import { POST as reviewRun } from "../app/api/ai-agent/review/route";

function request(body: unknown) {
  return new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) }) as never;
}

const card = {
  id: "c1",
  title: "Task",
  description: null,
  source: "manual",
  projectSlug: "proj",
  assigneeId: null,
  openToPublic: false,
  project: { id: "p1", title: "Proj", description: null, slug: "proj" },
  estimate: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "outsider" } });
  isRealMember.mockResolvedValue(false);
  hasProjectRole.mockResolvedValue(false);
  cardFindUnique.mockResolvedValue(card);
  runFindUnique.mockResolvedValue({ id: "r1", kanbanCardId: "c1", agentType: "writer", attemptNumber: 1, kanbanCard: card, reviews: [] });
});

describe("POST /api/ai-agent (start a run)", () => {
  it("refuses a logged-in non-member before any AI call or write", async () => {
    const res = await startRun(request({ kanbanCardId: "c1", agentType: "writer" }));
    expect(res.status).toBe(403);
    expect(getAiClientFor).not.toHaveBeenCalled();
    expect(runCreate).not.toHaveBeenCalled();
    expect(cardUpdate).not.toHaveBeenCalled();
  });

  it("lets a real member through to the AI gate", async () => {
    isRealMember.mockResolvedValue(true);
    getAiClientFor.mockResolvedValue({ ok: false, reason: "mode" });
    const res = await startRun(request({ kanbanCardId: "c1", agentType: "writer" }));
    expect(isRealMember).toHaveBeenCalledWith("p1", "outsider");
    expect(getAiClientFor).toHaveBeenCalled();
    expect(res.status).toBe(403); // blocked by the (mocked) AI mode, not by membership
    expect(runCreate).not.toHaveBeenCalled();
  });

  it("lets the claimant of an open micro-task through, like moving the card", async () => {
    cardFindUnique.mockResolvedValue({ ...card, openToPublic: true, assigneeId: "outsider" });
    getAiClientFor.mockResolvedValue({ ok: false, reason: "mode" });
    await startRun(request({ kanbanCardId: "c1", agentType: "writer" }));
    expect(getAiClientFor).toHaveBeenCalled();
  });
});

describe("POST /api/ai-agent/review", () => {
  it.each(["approved", "rejected", "revision"] as const)(
    "refuses %s from a non-lead before any AI call, write or token award",
    async (decision) => {
      isRealMember.mockResolvedValue(true); // an ordinary member is still not a reviewer
      const res = await reviewRun(request({ aiTaskRunId: "r1", decision }));
      expect(res.status).toBe(403);
      expect(hasProjectRole).toHaveBeenCalledWith("p1", "outsider", ["FOUNDER", "ADMIN"]);
      expect(getAiClientFor).not.toHaveBeenCalled();
      expect(runUpdate).not.toHaveBeenCalled();
      expect(runCreate).not.toHaveBeenCalled();
      expect(reviewCreate).not.toHaveBeenCalled();
      expect(cardUpdate).not.toHaveBeenCalled();
      expect(awardTokens).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("lets a project lead reject a run", async () => {
    hasProjectRole.mockResolvedValue(true);
    const res = await reviewRun(request({ aiTaskRunId: "r1", decision: "rejected" }));
    expect(res.status).toBe(200);
  });
});
