import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
});

function loadSources(){
  const here = url.fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  const root = process.env.LAMBDA_TASK_ROOT || process.cwd();
  const candidates = [
    path.resolve(dir, "../../sources.json"),
    path.resolve(dir, "../sources.json"),
    path.resolve(root, "sources.json"),
    "/var/task/sources.json"
  ];
  for(const p of candidates){
    try{
      if(fs.existsSync(p)){
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    }catch(e){ /* tenta próxima */ }
  }
  throw new Error("sources.json não encontrado. Verifique included_files no netlify.toml.");
}

const sources = loadSources();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const page = Number(event.queryStringParameters?.page ?? "0");
  const pageSize = Number(event.queryStringParameters?.pageSize ?? "12");
  const days = Number(event.queryStringParameters?.days ?? "60"); // padrão ~2 meses
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  try {
    const allItems = (await Promise.all(
      sources.map(async (src) => {
        try {
          const res = await fetch(src.feedUrl, { headers: { "User-Agent": "NetlifyFunction/1.0" } });
          const xml = await res.text();
          const json = parser.parse(xml);
          const { items } = extractItems(json);

          const norm = items
            .map((it) => {
              const pub = pickDate(it);
              return {
                source: src.name || (json?.rss?.channel?.title ?? json?.feed?.title ?? "Fonte"),
                title: it.title || it["media:title"] || it["dc:title"] || "(sem título)",
                link: it.link?.href || it.link || it.guid || "#",
                pubDate: pub,
                image: pickImage(it),
                summary: it.description || it.summary || it["content:encoded"] || it.content || "",
              };
            })
            .filter((x) => /bolsonaro/i.test(`${x.title} ${x.summary}`))
            .filter((x) => (x.pubDate ? x.pubDate >= cutoff : true));

          return norm;
        } catch (e) {
          console.error("Erro ao buscar/parsing", src.feedUrl, e.message);
          return [];
        }
      })
    )).flat();

    allItems.sort((a, b) => ((b.pubDate ?? 0) - (a.pubDate ?? 0)));

    const start = page * pageSize;
    const pageItems = allItems.slice(start, start + pageSize);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ items: pageItems }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS },
      body: "Erro interno",
    };
  }
}

function extractItems(json){
  if(json?.rss?.channel?.item) return { items: toArray(json.rss.channel.item) };
  if(json?.feed?.entry) return { items: toArray(json.feed.entry) };
  if(json?.channel?.item) return { items: toArray(json.channel.item) };
  return { items: [] };
}

function toArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }

function pickDate(it){
  const cand = it.pubDate || it.published || it.updated || it["dc:date"];
  if(!cand) return null;
  const t = Date.parse(cand);
  return Number.isFinite(t) ? t : null;
}

function pickImage(it){
  if(it.enclosure?.url) return it.enclosure.url;
  if(it["media:content"]?.url) return it["media:content"].url;
  if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url;
  if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url;
  if(it["itunes:image"]?.href) return it["itunes:image"].href;
  const html = it["content:encoded"] || it.content || it.description || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if(m) return m[1];
  return null;
}