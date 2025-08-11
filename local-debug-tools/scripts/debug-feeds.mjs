
/**
 * scripts/debug-feeds.mjs
 * Run locally (no Netlify) to test your sources.json and see which feeds match "Bolsonaro".
 *
 * Usage:
 *   node scripts/debug-feeds.mjs --days 90 --pattern bolsonaro --limit 3
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { XMLParser } from "fast-xml-parser";

const argv = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (k && v && k.startsWith("--")) argv.set(k.slice(2), v);
}
const DAYS = Number(argv.get("days") ?? "90");
const PATTERN = new RegExp(argv.get("pattern") ?? "bolsonaro", "i");
const LIMIT = Number(argv.get("limit") ?? "3");

function loadSources() {
  const here = url.fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  const root = process.cwd();
  const candidates = [
    path.resolve(root, "sources.json"),
    path.resolve(dir, "../sources.json"),
    path.resolve(root, "netlify/functions/../sources.json"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {}
  }
  throw new Error("sources.json not found. Run from repo root.");
}

const sources = loadSources();
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
});

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 LocalDebug",
  "Accept":
    "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;

function extractItems(json) {
  if (json?.rss?.channel?.item) return toArray(json.rss.channel.item);
  if (json?.feed?.entry) return toArray(json.feed.entry);
  if (json?.channel?.item) return toArray(json.channel.item);
  return [];
}
function toArray(x) { return Array.isArray(x) ? x : (x ? [x] : []); }
function pickDate(it) {
  const cand = it.pubDate || it.published || it.updated || it["dc:date"];
  if (!cand) return null;
  const t = Date.parse(cand);
  return Number.isFinite(t) ? t : null;
}
function pickImage(it) {
  if (it.enclosure?.url) return it.enclosure.url;
  if (it["media:content"]?.url) return it["media:content"].url;
  if (Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url;
  if (it["media:thumbnail"]?.url) return it["media:thumbnail"].url;
  if (it["itunes:image"]?.href) return it["itunes:image"].href;
  const html = it["content:encoded"] || it.content || it.description || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

let totalMatched = 0;
const all = [];

console.log(`🔎 Debugging ${sources.length} feeds — pattern: /${"{PATTERN}".toString()}/, last ${"${DAYS}"} days\n`);

for (const src of sources) {
  const info = { name: src.name, url: src.feedUrl };
  const start = Date.now();
  try {
    const res = await fetch(src.feedUrl, { headers: HEADERS });
    info.http = res.status;
    const xml = await res.text();
    const json = parser.parse(xml);
    const items = extractItems(json);
    info.parsed = items.length;
    const normalized = items.map((it) => ({
      source: src.name || (json?.rss?.channel?.title ?? json?.feed?.title ?? "Fonte"),
      title: it.title || it["media:title"] || it["dc:title"] || "(sem título)",
      link: it.link?.href || it.link || it.guid || "#",
      pubDate: pickDate(it),
      image: pickImage(it),
      summary: it.description || it.summary || it["content:encoded"] || it.content || "",
    }));
    const matched = normalized
      .filter((x) => PATTERN.test(`${"${"}x.title${"}"} ${"${"}x.summary${"}"}`))
      .filter((x) => (x.pubDate ? x.pubDate >= cutoff : true));
    totalMatched += matched.length;
    all.push(...matched);
    info.matched = matched.length;
    info.sample = matched.slice(0, LIMIT).map((x) => x.title);
    info.ms = Date.now() - start;
    console.log(`• ${"${"}info.name${"}"} [${"${"}info.http${"}"}] parsed=${"${"}info.parsed${"}"} matched=${"${"}info.matched${"}"} (${ "${"}info.ms${"}"}ms)`);
    if (info.sample.length) {
      for (const t of info.sample) console.log(`   - ${"${"}t${"}"}`);
    }
  } catch (e) {
    info.err = String(e?.message || e);
    info.ms = Date.now() - start;
    console.log(`• ${"${"}info.name${"}"} ERROR: ${"${"}info.err${"}"}`);
  }
}

all.sort((a,b) => ((b.pubDate ?? 0) - (a.pubDate ?? 0)));
console.log(`\n✅ Total matched: ${"${"}totalMatched${"}"}`);
console.log(`Top ${"${"}Math.min(all.length, 10)${"}"} results:`);
for (const it of all.slice(0, 10)) {
  const d = it.pubDate ? new Date(it.pubDate).toISOString().slice(0,10) : "no-date";
  console.log(`- [${"${"}d${"}"}] ${"${"}it.title${"}"} (${ "${"}it.source${"}"} ) => ${"${"}it.link${"}"}`);
}
