import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
const DAYS = Number(process.env.DAYS || "3");
const MAX_ITEMS = Number(process.env.MAX_ITEMS || "40");
const PATTERN = new RegExp(process.env.PATTERN || "bolsonaro", "i");
const cutoff = Date.now() - DAYS*24*60*60*1000;
const sources = JSON.parse(fs.readFileSync(path.resolve("sources.json"), "utf-8"));
const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"", allowBooleanAttributes:true, parseTagValue:true, parseAttributeValue:true });
const HEADERS={ "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GH-Actions", "Accept":"application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8", "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.8"};
function extractItems(json){ if(json?.rss?.channel?.item) return toArray(json.rss.channel.item); if(json?.feed?.entry) return toArray(json.feed.entry); if(json?.channel?.item) return toArray(json.channel.item); return []; } function toArray(x){ return Array.isArray(x)?x:(x?[x]:[]); } function pickDate(it){ const cand=it.pubDate||it.published||it.updated||it["dc:date"]; if(!cand) return null; const t=Date.parse(cand); return Number.isFinite(t)?t:null; } function pickImage(it){ if(it.enclosure?.url) return it.enclosure.url; if(it["media:content"]?.url) return it["media:content"].url; if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url; if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url; if(it["itunes:image"]?.href) return it["itunes:image"].href; const html=it["content:encoded"]||it.content||it.description||""; const m=/<img[^>]+src=['\"]([^'\"]+)['\"]/i.exec(html); return m?m[1]:null; }
const all = [];
for(const src of sources){
  try{
    const res = await fetch(src.feedUrl, { headers: HEADERS });
    const xml = await res.text();
    const json = parser.parse(xml);
    const items = extractItems(json);
    const norm = items.map(it => ({ source: src.name, title: it.title || it["media:title"] || it["dc:title"] || "(sem título)", link: it.link?.href || it.link || it.guid || "#", pubDate: pickDate(it), image: pickImage(it), summary: it.description || it.summary || it["content:encoded"] || it.content || "" }));
    const matched = norm.filter(x => PATTERN.test(`${x.title} ${x.summary}`)).filter(x => (x.pubDate ? x.pubDate >= cutoff : true));
    all.push(...matched);
  }catch(e){ console.log("skip", src.name, e.message); }
}
all.sort((a,b)=>((b.pubDate??0)-(a.pubDate??0)));
const trimmed = all.slice(0, MAX_ITEMS);
fs.mkdirSync(path.resolve("public"), { recursive: true });
fs.writeFileSync(path.resolve("public/static-news.json"), JSON.stringify({ items: trimmed }, null, 2), "utf-8");
console.log("static-news.json updated:", trimmed.length, "items");