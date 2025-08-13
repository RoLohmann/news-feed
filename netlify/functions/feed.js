
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs"; import path from "node:path"; import url from "node:url";
const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"", allowBooleanAttributes:true, parseTagValue:true, parseAttributeValue:true });
function getDirnameSafe(){ try{ if(typeof import.meta!=="undefined" && import.meta.url){ const here = url.fileURLToPath(import.meta.url); return path.dirname(here); } }catch{} if(typeof __dirname!=="undefined") return __dirname; return process.cwd(); }
function loadSources(){ const dir=getDirnameSafe(); const root=process.env.LAMBDA_TASK_ROOT||process.cwd(); const candidates=[path.resolve(dir,"../../sources.json"),path.resolve(dir,"../sources.json"),path.resolve(root,"sources.json"),"/var/task/sources.json"]; for(const p of candidates){ try{ if(fs.existsSync(p)){ const raw=fs.readFileSync(p,"utf-8"); return JSON.parse(raw); } }catch(e){} } throw new Error("sources.json não encontrado."); }
const sources = loadSources();
function extractItems(json){ if(json?.rss?.channel?.item) return Array.isArray(json.rss.channel.item)?json.rss.channel.item:[json.rss.channel.item]; if(json?.feed?.entry) return Array.isArray(json.feed.entry)?json.feed.entry:[json.feed.entry]; if(json?.channel?.item) return Array.isArray(json.channel.item)?json.channel.item:[json.channel.item]; return []; }
function pickDate(it){ const d = it.pubDate||it.published||it.updated||it["dc:date"]; const t = d?Date.parse(d):null; return Number.isFinite(t)?t:null; }
function pickImage(it){ if(it.enclosure?.url) return it.enclosure.url; if(it["media:content"]?.url) return it["media:content"].url; if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url; if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url; if(it["itunes:image"]?.href) return it["itunes:image"].href; const html=it["content:encoded"]||it.content||it.description||""; const m=/<img[^>]+src=['\"]([^'\"]+)['\"]/i.exec(html); return m?m[1]:null; }
export async function handler(event){
  const page=Number(event.queryStringParameters?.page ?? "0");
  const pageSize=Number(event.queryStringParameters?.pageSize ?? "12");
  const days=Number(event.queryStringParameters?.days ?? "60");
  const cutoff=Date.now()-days*24*60*60*1000;
  try{
    const per = await Promise.all(sources.map(async s=>{
      try{
        const r = await fetch(s.feedUrl, { headers:{ "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 NetlifyFunction", "Accept":"application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8", "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.8" } });
        const xml = await r.text(); const json = parser.parse(xml);
        const items = extractItems(json).map(it => ({
          source: s.name, title: it.title || it["media:title"] || "(sem título)",
          link: it.link?.href || it.link || it.guid || "#",
          pubDate: pickDate(it), image: pickImage(it), summary: it.description || it.summary || it["content:encoded"] || it.content || ""
        })).filter(x => /bolsonaro/i.test(`${x.title} ${x.summary}`)).filter(x => (x.pubDate? x.pubDate >= cutoff: true));
        return items;
      }catch{ return []; }
    }));
    const all = per.flat().sort((a,b)=>((b.pubDate??0)-(a.pubDate??0)));
    const start = page*pageSize;
    return { statusCode:200, headers:{ "Access-Control-Allow-Origin":"*", "Content-Type":"application/json; charset=utf-8", "Cache-Control":"public, s-maxage=120, stale-while-revalidate=300" }, body: JSON.stringify({ items: all.slice(start,start+pageSize) }) };
  }catch(err){ return { statusCode:500, headers:{ "Access-Control-Allow-Origin":"*" }, body: JSON.stringify({ error: String(err?.message||err) }) }; }
}
