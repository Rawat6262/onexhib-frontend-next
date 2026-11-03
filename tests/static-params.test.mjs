// Prerendered routes never read searchParams: node tests/static-params.test.mjs
//
// A page that exports generateStaticParams is rendered statically, and reading
// searchParams there throws DYNAMIC_SERVER_USAGE. Dev mode renders it anyway,
// so the build passes and every request 500s in production. This has shipped
// twice (exhibitions-in, then the venue page's paging); this test stops a third.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/^page\.(jsx?|tsx?)$/.test(name)) pages.push(p);
  }
};
walk(join(root, "app"));

// Comments mention both names when explaining this rule, so strip them first.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let failed = 0;
for (const file of pages) {
  const src = code(readFileSync(file, "utf8"));
  const prerendered = /export\s+(async\s+)?function\s+generateStaticParams|export\s+const\s+generateStaticParams/.test(src);
  const readsQuery = /\bsearchParams\b/.test(src);
  if (prerendered && readsQuery) {
    console.log(`  FAIL  ${relative(root, file)}  -> exports generateStaticParams and reads searchParams`);
    failed += 1;
  }
}
console.log(`  ${failed ? "FAIL" : "PASS"}  ${pages.length} pages checked`);
if (failed) process.exit(1);
