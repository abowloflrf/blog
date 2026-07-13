import { readFile } from "node:fs/promises";

const smileySans = readFile(
  new URL("../../public/fonts/SmileySans-Oblique.ttf", import.meta.url)
);

export function loadOgFont() {
  return smileySans;
}
