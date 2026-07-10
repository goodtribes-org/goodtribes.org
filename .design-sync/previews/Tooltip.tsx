import { Tooltip } from "goodtribes-frontend";

export function Default() {
  return (
    <Tooltip lines={["Anna Andersson", "Frontend-utvecklare"]}>
      <span className="inline-flex items-center gap-1.5 text-sm text-dark-slate border border-muted-teal/40 rounded-full px-3 py-1">
        Hovra för info
      </span>
    </Tooltip>
  );
}

export function MultiLine() {
  return (
    <Tooltip lines={["12 volontärtimmar", "Senast aktiv: idag", "3 avslutade uppgifter"]}>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-seagrass rounded-md px-3 py-1.5">
        Visa statistik
      </span>
    </Tooltip>
  );
}
