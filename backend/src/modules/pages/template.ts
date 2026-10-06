import { readFile } from "node:fs/promises";
import path from "node:path";

/** The built index.html, which every rendered page starts from. */
export type TemplateSource = (origin: string) => Promise<string>;

/* Where the build leaves it, from wherever the process started: the repo
   root on Vercel (vercel.json's includeFiles puts it there), or backend/
   when run with npm -w. */
const CANDIDATES = [
  path.join(process.cwd(), "frontend/dist/index.html"),
  path.join(process.cwd(), "../frontend/dist/index.html"),
];

/**
 * Read once per instance and kept: it only changes with a deploy, and a
 * deploy is a new instance. Failing the disk, it is fetched from the site
 * itself, where it is a plain static file.
 */
export const createTemplateSource = (): TemplateSource => {
  let cached: Promise<string> | null = null;

  const load = async (origin: string): Promise<string> => {
    for (const candidate of CANDIDATES) {
      const html = await readFile(candidate, "utf8").catch(() => null);
      if (html) return html;
    }
    const response = await fetch(`${origin}/index.html`);
    if (!response.ok) throw new Error(`index.html: ${response.status}`);
    return response.text();
  };

  return (origin) => {
    cached ??= load(origin).catch((error) => {
      cached = null;
      throw error;
    });
    return cached;
  };
};
