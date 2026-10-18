// Construit SILLO 8 en une seule page HTML autonome (script et styles en ligne), publiable comme artifact.
// Usage : node tools/build-artifact.mjs <fichier de sortie>
import { build } from "esbuild";
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "sillo8.html";
const result = await build({
  entryPoints: ["artifact/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  write: false,
  outdir: "dist",
  loader: { ".module.css": "local-css", ".css": "css", ".json": "json" },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
const html = `<title>SILLO 8</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grandstander:wght@700&family=Patrick+Hand&family=Special+Elite&display=swap">
<style>
:root { color-scheme: dark; }
html, body { height: 100%; background: #1b2321; }
${css.replace(/<\/style/gi, "<\\/style")}
</style>
<div id="sillo8"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`;
writeFileSync(out, html);
console.log(out, (html.length / 1024 / 1024).toFixed(2), "Mo");
