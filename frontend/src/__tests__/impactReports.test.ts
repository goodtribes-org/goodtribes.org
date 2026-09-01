import {
  groupReportsByKind,
  impactReportStatus,
  isImpactReportKind,
  isImpactValueQualifier,
  safeExternalUrl,
  verifiedSdgGoals,
} from "@/lib/impactReports";

describe("impactReportStatus", () => {
  it("reads verified before rejected before pending", () => {
    expect(impactReportStatus({ verifiedAt: new Date(), rejectedAt: null })).toBe("verified");
    expect(impactReportStatus({ verifiedAt: null, rejectedAt: new Date() })).toBe("rejected");
    expect(impactReportStatus({ verifiedAt: null, rejectedAt: null })).toBe("pending");
  });
});

describe("safeExternalUrl", () => {
  // Evidence URLs are free-text input rendered straight into an anchor's
  // href, so anything that isn't plain http(s) has to be dropped rather than
  // linked — this is the only thing standing between a submitted report and
  // a clickable `javascript:` payload on a public project page.
  it("keeps http and https URLs", () => {
    expect(safeExternalUrl("https://example.org/report.pdf")).toBe("https://example.org/report.pdf");
    expect(safeExternalUrl("  http://example.org  ")).toBe("http://example.org/");
  });

  it("drops dangerous or non-absolute schemes", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("/projects/foo")).toBeNull();
    expect(safeExternalUrl("example.org")).toBeNull();
  });

  it("treats empty and missing input as no evidence", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
  });
});

describe("verifiedSdgGoals", () => {
  it("dedupes and sorts goals across reports", () => {
    expect(
      verifiedSdgGoals([{ sdgGoals: [10, 4] }, { sdgGoals: [4, 13] }, { sdgGoals: [] }])
    ).toEqual([4, 10, 13]);
  });

  it("returns an empty list when there is nothing verified", () => {
    expect(verifiedSdgGoals([])).toEqual([]);
  });
});

describe("groupReportsByKind", () => {
  // The INFOS history is the case this exists for: donated equipment worth
  // 50 MSEK and a 1 658 000 kr municipal grant are both real figures, but
  // listing them together would present money received as impact delivered.
  const reports = [
    { id: "units", kind: "DELIVERED" as const },
    { id: "value", kind: "DELIVERED" as const },
    { id: "stockholm-stad", kind: "SUPPORT_RECEIVED" as const },
  ];

  it("separates delivered impact from support received", () => {
    const { delivered, supportReceived } = groupReportsByKind(reports);
    expect(delivered.map((r) => r.id)).toEqual(["units", "value"]);
    expect(supportReceived.map((r) => r.id)).toEqual(["stockholm-stad"]);
  });

  it("returns empty groups rather than undefined when a kind is absent", () => {
    const { delivered, supportReceived } = groupReportsByKind([]);
    expect(delivered).toEqual([]);
    expect(supportReceived).toEqual([]);
  });
});

describe("enum guards", () => {
  it("accepts only real kind and qualifier values", () => {
    expect(isImpactReportKind("DELIVERED")).toBe(true);
    expect(isImpactReportKind("SUPPORT_RECEIVED")).toBe(true);
    expect(isImpactReportKind("delivered")).toBe(false);
    expect(isImpactReportKind(undefined)).toBe(false);

    expect(isImpactValueQualifier("AT_LEAST")).toBe(true);
    expect(isImpactValueQualifier("MADE_UP")).toBe(false);
  });
});
