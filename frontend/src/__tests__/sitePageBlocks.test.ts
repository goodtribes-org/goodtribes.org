import { sitePageBlocks, stripNumber } from "@/lib/sitePageBlocks";

describe("sitePageBlocks", () => {
  it("splits intro, sections, cards and callouts, with anchors", () => {
    const blocks = sitePageBlocks(
      "<p>Hej</p><h2>Resan</h2><p>Sex faser</p><h3>1. Idé</h3><p>Dröm</p><ul><li>Steg</li></ul>" +
        "<h3>2. Uppstart</h3><p>Team</p><blockquote><p>Ni bestämmer</p></blockquote><p>Efteråt</p><h2>AI</h2><p>Utkast</p>",
      { ide: "idea", uppstart: "startup" },
    );
    expect(blocks).toEqual([
      { kind: "text", html: "<p>Hej</p>" },
      { kind: "section", id: "resan", title: "Resan", html: "<p>Sex faser</p>" },
      { kind: "card", id: "idea", title: "1. Idé", html: "<p>Dröm</p><ul><li>Steg</li></ul>" },
      { kind: "card", id: "startup", title: "2. Uppstart", html: "<p>Team</p>" },
      { kind: "callout", html: "<p>Ni bestämmer</p>" },
      { kind: "text", html: "<p>Efteråt</p>" },
      { kind: "section", id: "ai", title: "AI", html: "<p>Utkast</p>" },
    ]);
  });

  it("sanitizes what it returns", () => {
    const [intro] = sitePageBlocks('<p onclick="x()">Hej<script>alert(1)</script></p>');
    expect(intro).toEqual({ kind: "text", html: "<p>Hej</p>" });
  });

  it("strips a leading number from a title", () => {
    expect(stripNumber("3. Lansering")).toBe("Lansering");
    expect(stripNumber("Lansering")).toBe("Lansering");
  });
});
