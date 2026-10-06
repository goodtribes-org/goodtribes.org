import { isCommercialLegalType } from "@/lib/legalType";

type ProjectInvoiceFields = {
  legalType: string;
  commercialUmbrellaEntityId: string | null;
};

// A commercial project can only invoice once it has been assigned a
// CommercialUmbrellaEntity, which a site admin does when approving its
// application for invoicing (site-admin/invoicing/actions.ts, #226).
// Named/placed generically since a future invoicing feature is likely to
// reuse it, not just the legal-type-change gate below.
export function canInvoice(project: ProjectInvoiceFields): boolean {
  return isCommercialLegalType(project.legalType) && project.commercialUmbrellaEntityId !== null;
}
