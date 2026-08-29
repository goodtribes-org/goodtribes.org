import { prisma } from "@/lib/prisma";

// Without this, the pg pool's open connection keeps the Node process alive
// after all specs finish — Jest reports "did not exit one second after the
// test run" and needs --forceExit to actually return.
afterAll(async () => {
  await prisma.$disconnect();
});
