
const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 12;
const DAYS = 60;

let page = 0; let loading = false;
const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");
const seen = new Set();
const state = { items: [] };

const REALISTIC = [
  "/assets/realistic/bolsonaro_portrait_01.jpg",
  "/assets/realistic/bolsonaro_portrait_02.jpg",
  "/assets/realistic/bolsonaro_portrait_03.jpg",
  "/assets/realistic/bolsonaro_portrait_04.jpg",
  "/assets/realistic/protesto_amarelo_01.jpg",
  "/assets/realistic/protesto_amarelo_02.jpg",
  "/assets/realistic/protesto_amarelo_03.jpg",
  "/assets/realistic/protesto_amarelo_04.jpg"
];

function key(it){ return (it.link || "").trim().toLowerCase(); }
function normalize(it, isStatic=false){
  return { source: it.source || "Fonte", title: it.title || "(sem título)", link: it.link || "#",
    pubDate: isStatic ? 0 : (it.pubDate ? Date.parse(it.pubDate) : null),
    image: it.image || null, summary: it.summary || "", isStatic };
}
function dedupe(arr){ const out=[]; for(const it of arr){ const k=key(it); if(k && !seen.has(k)){ seen.add(k); out.push(it); } } return out; }
function resortAndPaint(){
  state.items.sort((a,b)=>{ if(a.isStatic && !b.isStatic) return 1; if(!a.isStatic && b.isStatic) return -1; return ((b.pubDate??0)-(a.pubDate??0)); });
  feedEl.innerHTML=""; renderItems(state.items);
}

(async function boot(){
  try{ const res=await fetch("/static-news.json",{cache:"force-cache"}); if(res.ok){ const data=await res.json(); const items=(data.items||[]).map(x=>normalize(x,true)); const first=dedupe(items); state.items.push(...first); renderItems(first);} }catch{}
  fetchPage();
  const sentinel=document.getElementById("sentinel");
  const observer=new IntersectionObserver((es)=>{ for(const e of es){ if(e.isIntersecting) fetchPage(); } },{ rootMargin:"400px 0px" }); observer.observe(sentinel);
})();

async function fetchPage(){
  if(loading) return; loading=true;
  try{ const res=await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}&days=${DAYS}`,{cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json(); const fresh=dedupe((data.items||[]).map(x=>normalize(x,false)));
    if(fresh.length){ state.items.push(...fresh); page+=1; resortAndPaint(); }
  }catch(e){ console.error(e); } finally{ loading=false; }
}

function renderItems(items){
  for(const it of items){
    const node=template.content.cloneNode(true);
    node.querySelector(".image-link").href=it.link;
    const img=node.querySelector(".thumb"); img.src=it.image||pickRealistic(); img.alt=it.title;
    const aTitle=node.querySelector(".title"); aTitle.href=it.link; aTitle.textContent=it.title;
    const when=it.pubDate ? new Date(it.pubDate) : new Date();
    node.querySelector(".meta").textContent=`${it.source} • ${when.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
    node.querySelectorAll(".share-btn").forEach(btn=>btn.addEventListener("click",()=>share(it,btn.dataset.platform)));
    feedEl.appendChild(node);
  }
}
function pickRealistic(){ return REALISTIC[Math.floor(Math.random()*REALISTIC.length)]; }

function share(it, platform){
  const url=encodeURIComponent(it.link); const text=encodeURIComponent(it.title+" — via Voz do Brasil");
  const routes={ native:null, whatsapp:`https://api.whatsapp.com/send?text=${text}%20${url}`, telegram:`https://t.me/share/url?url=${url}&text=${text}`, x:`https://twitter.com/intent/tweet?url=${url}&text=${text}`, facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`, linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, reddit:`https://www.reddit.com/submit?url=${url}&title=${text}`, email:`mailto:?subject=${text}&body=${text}%20${url}`, copy:null };
  if(platform==="native" && navigator.share){ navigator.share({title:it.title,text:it.title,url:it.link}).catch(()=>{}); return; }
  if(platform==="copy"){ navigator.clipboard?.writeText(it.link).then(()=>alert("Link copiado!")).catch(()=>prompt("Copie o link:", it.link)); return; }
  const t=routes[platform]; if(t) window.open(t,"_blank","noopener");
}
