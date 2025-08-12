
import { XMLParser } from "fast-xml-parser";
const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"", allowBooleanAttributes:true, parseTagValue:true, parseAttributeValue:true });
const SOURCES = [
  { name:"Jovem Pan (site)", feedUrl: "https://jovempan.com.br/feed" },
  { name:"Revista Oeste", feedUrl: "https://revistaoeste.com/feed/" },
  { name:"Pleno.News", feedUrl: "https://pleno.news/feed" },
  { name:"Gazeta do Povo — República (Política)", feedUrl: "https://www.gazetadopovo.com.br/feed/rss/republica.xml" },
  { name:"Conexão Política", feedUrl: "https://www.conexaopolitica.com.br/feed/" },
  { name:"Renova Mídia", feedUrl: "https://renovamidia.com.br/feed/" },
  { name:"Gazeta Brasil", feedUrl: "https://gazetabrasil.com.br/feed/" },
  { name:"Diário do Poder", feedUrl: "https://diariodopoder.com.br/feed/" },
  { name:"Brasil Paralelo (YouTube)", feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCKDjjeeBmdaiicey2nImISw" }
];
function extractItems(json){ if(json?.rss?.channel?.item) return Array.isArray(json.rss.channel.item)?json.rss.channel.item:[json.rss.channel.item]; if(json?.feed?.entry) return Array.isArray(json.feed.entry)?json.feed.entry:[json.feed.entry]; if(json?.channel?.item) return Array.isArray(json.channel.item)?json.channel.item:[json.channel.item]; return []; }
function pickDate(it){ const d = it.pubDate||it.published||it.updated||it["dc:date"]; const t = d?Date.parse(d):null; return Number.isFinite(t)?t:null; }
function pickImage(it){ if(it.enclosure?.url) return it.enclosure.url; if(it["media:content"]?.url) return it["media:content"].url; if(Array.isArray(it["media:content"]) && it["media:content"][0]?.url) return it["media:content"][0].url; if(it["media:thumbnail"]?.url) return it["media:thumbnail"].url; if(it["itunes:image"]?.href) return it["itunes:image"].href; const html=it["content:encoded"]||it.content||it.description||""; const m=/<img[^>]+src=['\"]([^'\"]+)['\"]/i.exec(html); return m?m[1]:null; }
export async function handler(event){
  const page=Number(event.queryStringParameters?.page ?? "0");
  const pageSize=Number(event.queryStringParameters?.pageSize ?? "12");
  const days=Number(event.queryStringParameters?.days ?? "60");
  const cutoff=Date.now()-days*24*60*60*1000;
  try{
    const per = await Promise.all(SOURCES.map(async s=>{
      try{
        const r = await fetch(s.feedUrl, { headers:{ "User-Agent":"Mozilla/5.0", "Accept":"application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8" } });
        const xml = await r.text();
        const json = parser.parse(xml);
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
    return { statusCode:200, headers:{ "Access-Control-Allow-Origin":"*", "Content-Type":"application/json" }, body: JSON.stringify({ items: all.slice(start,start+pageSize) }) };
  }catch(err){ return { statusCode:500, headers:{ "Access-Control-Allow-Origin":"*" }, body: JSON.stringify({ error: String(err?.message||err) }) }; }
}
