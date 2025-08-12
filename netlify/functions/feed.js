import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"", allowBooleanAttributes:true, parseTagValue:true, parseAttributeValue:true });
function getDirnameSafe(){ try{ if(typeof import.meta!=="undefined" && import.meta.url){ const here = url.fileURLToPath(import.meta.url); return path.dirname(here); } }catch{} if(typeof __dirname!=="undefined") return __dirname; return process.cwd(); }
function loadSources(){ const dir=getDirnameSafe(); const root=process.env.LAMBDA_TASK_ROOT||process.cwd(); const candidates=[path.resolve(dir,"../../sources.json"),path.resolve(dir,"../sources.json"),path.resolve(root,"sources.json"),"/var/task/sources.json"]; for(const p of candidates){ try{ if(fs.existsSync(p)){ const raw=fs.readFileSync(p,"utf-8"); return JSON.parse(raw); } }catch(e){} } throw new Error("sources.json não encontrado."); }
const sources = loadSources();
const CORS_HEADERS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };
export async function handler(event){
  if(event.httpMethod==="OPTIONS") return { statusCode:200, headers:CORS_HEADERS, body:"" };
  const page=Number(event.queryStringParameters?.page ?? "0");
  const pageSize=Number(event.queryStringParameters?.pageSize ?? "12");
  const days=Number(event.queryStringParameters?.days ?? "60");
  const cutoff=Date.now()-days*24*60*60*1000;
  const debug=event.queryStringParameters?.debug==="1";
  const results=[];
  try{
    const perSource = await Promise.all(sources.map(async (src)=>{
      const info={ source:src.name, feedUrl:src.feedUrl, ok:false, status:null, parsed:0, matched:0, err:null, sample:[] };
      try{
        const res = await fetch(src.feedUrl,{ headers:{ "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 NetlifyFunction", "Accept":"application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8", "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.8" } });
        info.status=res.status;
        const xml=await res.text();
        const json=parser.parse(xml);
        const items=extractItems(json); info.parsed=items.length;
        const norm=items.map((it)=>({ source: src.name || (json?.rss?.channel?.title ?? json?.feed?.title ?? "Fonte"), title: it.title || it["media:title"] || it["dc:title"] || "(sem título)", link: it.link?.href || it.link || it.guid || "#", pubDate: pickDate(it), image: pickImage(it), summary: it.description || it.summary || it["content:encoded"] || it.content || "" }));
        const matched=norm.filter((x)=>/bolsonaro/i.test(`${x.title} ${x.summary}`)).filter((x)=>(x.pubDate?x.pubDate>=cutoff:true));
        info.matched=matched.length; info.sample=matched.slice(0,3).map(x=>x.title); info.ok=true;
        return { items: matched };
      }catch(e){ info.err=String(e?.message||e); return { items: [] }; } finally { results.push(info); }
    }));
    const allItems = perSource.flatMap(x=>x.items).sort((a,b)=>((b.pubDate ?? 0)-(a.pubDate ?? 0)));
    const start=page*pageSize; const pageItems=allItems.slice(start,start+pageSize);
    const payload = debug ? { items: pageItems, debug: results } : { items: pageItems };
    return { statusCode:200, headers:{ ...CORS_HEADERS, "Content-Type":"application/json; charset=utf-8", "Cache-Control":"public, s-maxage=120, stale-while-revalidate=300" }, body: JSON.stringify(payload) };
  }catch(err){ const message=String(err?.message||err); const payload= debug ? { error:message, debug:results } : "Erro interno"; return { statusCode:500, headers:{...CORS_HEADERS}, body: JSON.stringify(payload) }; }
}
function extractItems(json){ if(json?.rss?.channel?.item) return toArray(json.rss.channel.item); if(json?.feed?.entry) return toArray(json.feed.entry); if(json?.channel?.item) return toArray(json.channel.item); return []; }
function toArray(x){ return Array.isArray(x)?x:(x?[x]:[]); }
function pickDate(it){ const cand=it.pubDate||it.published||it.updated||it["dc:date"]; if(!cand) return null; const t=Date.parse(cand); return Number.isFinite(t)?t:null; }
function pickImage(it){ if(it.enclosure?.url) return it.enclosure.url; if(it["media:content"]?.url) return it["media:content"].url; if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url; if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url; if(it["itunes:image"]?.href) return it["itunes:image"].href; const html=it["content:encoded"]||it.content||it.description||""; const m=/<img[^>]+src=['\"]([^'\"]+)['\"]/i.exec(html); return m?m[1]:null; }