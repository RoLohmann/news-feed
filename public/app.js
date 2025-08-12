const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 12;
const DAYS = 60;
let page = 0;
let loading = false;
const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");
const seen = new Set();
function key(it){ return (it.link || "").trim().toLowerCase(); }

(async function boot(){
  try {
    const res = await fetch("/static-news.json", { cache: "force-cache" });
    if(res.ok){
      const data = await res.json();
      const items = (data.items || []).map(normalize);
      renderItems(dedupe(items));
    }
  } catch(e){ console.warn("fallback falhou", e); }
  fetchPage();
})();

function normalize(it){
  return { source: it.source || "Fonte", title: it.title || "(sem título)", link: it.link || "#",
    pubDate: it.pubDate ? Date.parse(it.pubDate) : null, image: it.image || null, summary: it.summary || "" };
}
function dedupe(arr){
  const out = [];
  for(const it of arr){ const k = key(it); if(k && !seen.has(k)){ seen.add(k); out.push(it); } }
  out.sort((a,b)=> ( (b.pubDate ?? 0) - (a.pubDate ?? 0) )); return out;
}

async function fetchPage(){
  if(loading) return; loading = true;
  try{
    const res = await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}&days=${DAYS}`, { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = (data.items || []).map(normalize);
    const fresh = dedupe(items);
    if(fresh.length){ renderItems(fresh); page += 1; } else { observer.disconnect(); }
  }catch(err){ console.error("feed err", err); observer.disconnect(); }
  finally{ loading = false; }
}

function renderItems(items){
  for(const it of items){
    const node = template.content.cloneNode(true);
    node.querySelector(".image-link").href = it.link;
    const img = node.querySelector(".thumb"); img.src = it.image || pickPatriot(); img.alt = it.title;
    const aTitle = node.querySelector(".title"); aTitle.href = it.link; aTitle.textContent = it.title;
    const when = it.pubDate ? new Date(it.pubDate) : new Date();
    node.querySelector(".meta").textContent = `${it.source} • ${when.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
    node.querySelectorAll(".share-btn").forEach(btn => {
      btn.addEventListener("click", () => share(it, btn.dataset.platform));
    });
    feedEl.appendChild(node);
  }
}

function share(it, platform){
  const url = encodeURIComponent(it.link);
  const text = encodeURIComponent(it.title + " — via Voz do Brasil");
  const routes = {
    whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`
  };
  window.open(routes[platform] || it.link, "_blank");
}

function pickPatriot(){
  const options = [
    "/assets/patriot/patriot_flag.svg",
    "/assets/patriot/patriot_map.svg",
    "/assets/patriot/patriot_rays.svg",
    "/assets/patriot/patriot_ribbon.svg",
    "/assets/patriot/patriot_wave.svg",
    "/assets/patriot/patriot_sunburst.svg",
    "/assets/patriot/patriot_stars.svg",
    "/assets/patriot/patriot_diamond.svg"
  ];
  return options[Math.floor(Math.random()*options.length)];
}

const sentinel = document.getElementById("sentinel");
const observer = new IntersectionObserver((entries)=>{
  for(const e of entries){ if(e.isIntersecting) fetchPage(); }
},{ rootMargin:"400px 0px" });
observer.observe(sentinel);