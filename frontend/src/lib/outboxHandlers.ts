// One place to see every outbox event type this app knows how to process --
// imported (for its side effect of calling registerOutboxHandler) by
// anything that needs the full registry available, most notably
// /api/cron/process-outbox. Add a line here whenever a new feature
// registers a handler via src/lib/outbox.ts's registerOutboxHandler.
import "@/lib/notify";
