import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
});

// Load sources from the project root (bundled at deploy time)
import fs from "node:fs";
const sourcesPath = new URL("../../sources.json", import.meta.url);
const sources = JSON.parse(fs.readFileSync(sourcesPath));

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
  const pageSize = Number(event.queryStringParameters?.pageSize ?? "10");

  try {
    const allItems = (await Promise.all(
      sources.map(async (src) => {
        try {
          const res = await fetch(src.feedUrl, { headers: { "User-Agent": "NetlifyFunction/1.0" } });
          const xml = await res.text();
          const json = parser.parse(xml);
          const { items, titleKey } = extractItems(json);
          // Normalize to a schema
          const norm = items
            .map((it) => ({
              source: src.name || (json?.rss?.channel?.title ?? json?.feed?.title ?? "Fonte"),
              title: it.title || it["media:title"] || it["dc:title"] || "(sem título)",
              link: it.link?.href || it.link || it.guid || "#",
              pubDate: parseDate(it.pubDate || it.published || it.updated),
              image: pickImage(it),
              summary: it.description || it.summary || it.content || "",
            }))
            // Filter only posts that mention Bolsonaro (title or summary)
            .filter((x) => /bolsonaro/i.test(`${x.title} ${x.summary}`));
          return norm;
        } catch (e) {
          console.error("Erro ao buscar/parsing", src.feedUrl, e.message);
          return [];
        }
      })
    )).flat();

    // Sort newest first
    allItems.sort((a,b) => (b.pubDate || 0) - (a.pubDate || 0));

    // Paginate
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

function parseDate(d){
  if(!d) return Date.now();
  const t = Date.parse(d);
  return isNaN(t) ? Date.now() : t;
}

function extractItems(json){
  // Handle common RSS/Atom shapes
  if(json?.rss?.channel?.item) return { items: toArray(json.rss.channel.item) };
  if(json?.feed?.entry) return { items: toArray(json.feed.entry) };
  // Some sites put items at root
  if(json?.channel?.item) return { items: toArray(json.channel.item) };
  return { items: [] };
}

function toArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }

function pickImage(it){
  // RSS enclosure
  if(it.enclosure?.url) return it.enclosure.url;
  // media:content
  if(it["media:content"]?.url) return it["media:content"].url;
  if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url;
  // media:thumbnail
  if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url;
  // itunes:image, common in podcasts
  if(it["itunes:image"]?.href) return it["itunes:image"].href;
  // content:encoded might include <img>
  const html = it["content:encoded"] || it.content || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if(m) return m[1];
  return null;
}