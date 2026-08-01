import { isCommercialLegalType } from "@/lib/legalType";

type ProjectInvoiceFields = {
  isSandbox: boolean;
  legalType: string;
  commercialUmbrellaEntityId: string | null;
};

// A commercial project can only invoice once it has graduated Sandbox AND
// been assigned a CommercialUmbrellaEntity — both happen together via
// approveSandboxGraduation (see site-admin/sandbox-graduation/actions.ts).
// Named/placed generically since a future invoicing feature is likely to
// reuse it, not just the legal-type-change gate below.
export function canInvoice(project: ProjectInvoiceFields): boolean {
  return !project.isSandbox && isCommercialLegalType(project.legalType) && project.commercialUmbrellaEntityId !== null;
}
