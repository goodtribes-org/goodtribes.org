import { impactReportStatus, safeExternalUrl, verifiedSdgGoals } from "@/lib/impactReports";

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
