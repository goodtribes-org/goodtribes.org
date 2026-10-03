import { permanentAiFailure } from "@/lib/aiFailure";

describe("permanentAiFailure", () => {
  it("recognises failures that retrying won't fix", () => {
    expect(permanentAiFailure({ status: 401, message: "invalid x-api-key" })).toBe("authentication");
    expect(permanentAiFailure({ status: 403, message: "Permission denied" })).toBe("permission");
    expect(permanentAiFailure({ status: 400, message: "Your credit balance is too low to access the Anthropic API." })).toBe("credit");
    expect(permanentAiFailure({ status: 404, message: "Publisher Model `claude-sonnet-4-6` was not found" })).toBe("model_not_found");
    expect(permanentAiFailure(new Error("Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication"))).toBe(
      "google_credentials",
    );
  });

  it("leaves passing trouble alone", () => {
    expect(permanentAiFailure({ status: 429, message: "rate_limit_error" })).toBeNull();
    expect(permanentAiFailure({ status: 529, message: "overloaded_error" })).toBeNull();
    expect(permanentAiFailure({ status: 500, message: "internal" })).toBeNull();
    expect(permanentAiFailure({ status: 400, message: "messages: text content blocks must be non-empty" })).toBeNull();
    expect(permanentAiFailure(new Error("Request timed out."))).toBeNull();
    expect(permanentAiFailure(undefined)).toBeNull();
  });
});
