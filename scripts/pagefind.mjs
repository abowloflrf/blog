import { cp, rm } from "node:fs/promises";

const command = process.argv[2];
const publicIndex = new URL("../public/pagefind/", import.meta.url);
const distIndex = new URL("../dist/pagefind/", import.meta.url);

async function cleanPublicIndex() {
  await rm(publicIndex, { recursive: true, force: true });
}

if (command === "clean") {
  await cleanPublicIndex();
} else if (command === "sync") {
  await cleanPublicIndex();
  await cp(distIndex, publicIndex, { recursive: true });
} else {
  throw new Error('Expected command "clean" or "sync".');
}
