import { detectSpamSignal } from "../lib/spamDetection";

// Deliberately conservative detector (per the file's own comment: a false
// positive immediately hides real content via proactiveModeration.ts), so it
// only flags a few high-confidence signals: 3+ links, a known spam phrase,
// or 8+ repeated identical characters in a row.
describe("detectSpamSignal", () => {
  it("returns null for ordinary, non-spam text", () => {
    expect(detectSpamSignal("Hej! Vi söker en frontend-utvecklare till vårt projekt.")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(detectSpamSignal("")).toBeNull();
  });

  it("returns null for a very short string", () => {
    expect(detectSpamSignal("hi")).toBeNull();
  });

  it("flags text containing 3 or more links, and reports the count", () => {
    const text =
      "Check https://a.com and https://b.com and also https://c.com for more info";
    const result = detectSpamSignal(text);
    expect(result).toBe("Automatiskt: innehåller 3 länkar");
  });

  it("does not flag text with only 2 links", () => {
    const text = "See https://a.com and https://b.com";
    expect(detectSpamSignal(text)).toBeNull();
  });

  it("counts http:// and https:// links the same way", () => {
    const text = "http://a.com http://b.com http://c.com";
    expect(detectSpamSignal(text)).toBe("Automatiskt: innehåller 3 länkar");
  });

  it("flags a known spam phrase, quoting the matched phrase", () => {
    expect(detectSpamSignal("Want to buy followers for your account?")).toBe(
      "Automatiskt: innehåller spamfras ('buy followers')"
    );
    expect(detectSpamSignal("This is a work from home guaranteed opportunity")).toBe(
      "Automatiskt: innehåller spamfras ('work from home guaranteed')"
    );
  });

  it("matches spam phrases case-insensitively", () => {
    expect(detectSpamSignal("BUY FOLLOWERS now!!")).toBe(
      "Automatiskt: innehåller spamfras ('buy followers')"
    );
    expect(detectSpamSignal("Double Your Bitcoin today")).toBe(
      "Automatiskt: innehåller spamfras ('double your bitcoin')"
    );
  });

  it("returns the first matching phrase when multiple would match", () => {
    // "click here now" appears before "make money fast" in SPAM_PHRASES,
    // and .find() returns the first match in array order.
    const result = detectSpamSignal("click here now to make money fast");
    expect(result).toBe("Automatiskt: innehåller spamfras ('click here now')");
  });

  it("flags 8 or more repeated identical characters in a row", () => {
    expect(detectSpamSignal("woooooooow that's amazing")).toBe(
      "Automatiskt: upprepade tecken"
    );
    expect(detectSpamSignal("aaaaaaaa")).toBe("Automatiskt: upprepade tecken");
  });

  it("does not flag 7 or fewer repeated characters (below the threshold)", () => {
    // REPEATED_CHAR_RE is (\S)\1{7,} — the captured char plus 7 more
    // repeats, i.e. 8 total occurrences minimum.
    expect(detectSpamSignal("aaaaaaa")).toBeNull(); // 7 a's
  });

  it("does not flag repeated whitespace (only non-whitespace \\S repeats count)", () => {
    expect(detectSpamSignal("word" + " ".repeat(20) + "word")).toBeNull();
  });

  it("prioritizes the link-count check over phrase/repeated-char checks", () => {
    // 3+ links AND a spam phrase both present -> link message wins because
    // it's checked first and returns early.
    const text =
      "buy followers at https://a.com and https://b.com and https://c.com";
    expect(detectSpamSignal(text)).toBe("Automatiskt: innehåller 3 länkar");
  });

  it("checks phrase match before the repeated-character check", () => {
    const text = "buy followers wooooooow";
    expect(detectSpamSignal(text)).toBe("Automatiskt: innehåller spamfras ('buy followers')");
  });
});
