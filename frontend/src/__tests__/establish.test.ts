import { etableraStepsDone } from "../lib/establish";

describe("Etablera steps (#329)", () => {
  it("each step follows its own data", () => {
    expect(
      etableraStepsDone({ playbookHtml: "<h2>Vem gör vad</h2><p>Lisa bokar båten.</p>", fundingSecured: true, activePartnerships: 1, supporterBaseNotes: "- Volontärer från kyrkan" }),
    ).toEqual({ playbook_documented: true, stable_operations_funding: true, partnerships_formalized: true, supporter_base_built: true });
  });
  it("nothing is done without the data — an empty page or an applied-for grant doesn't count", () => {
    expect(etableraStepsDone({ playbookHtml: "<p> </p>", fundingSecured: false, activePartnerships: 0, supporterBaseNotes: " " })).toEqual({
      playbook_documented: false, stable_operations_funding: false, partnerships_formalized: false, supporter_base_built: false,
    });
  });
});
