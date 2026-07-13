import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const smileySans = readFile(
  resolve(process.cwd(), "public/fonts/SmileySans-Oblique.ttf")
);

export function loadOgFont() {
  return smileySans;
}
