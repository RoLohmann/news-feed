
const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 12;
const DAYS = 60;

let page = 0;
let loading = false;
const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");
const seen = new Set();
const state = { items: [] }; // para reordenar tudo

// imagens realistas (substitua por IA depois, mantendo os nomes)
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
function dedupe(arr){
  const out = [];
  for(const it of arr){ const k = key(it); if(k && !seen.has(k)){ seen.add(k); out.push(it); } }
  return out;
}
function resortAndPaint(){
  state.items.sort((a,b)=>{ if(a.isStatic && !b.isStatic) return 1; if(!a.isStatic && b.isStatic) return -1; return ((b.pubDate ?? 0) - (a.pubDate ?? 0)); });
  feedEl.innerHTML = "";
  renderItems(state.items);
}

(async function boot(){
  // estático imediato (UX)
  try {
    const res = await fetch("/static-news.json", { cache: "force-cache" });
    if(res.ok){
      const data = await res.json();
      const first = dedupe((data.items || []).map(x => normalize(x, true)));
      state.items.push(...first);
      renderItems(first);
    }
  } catch(e){ console.warn("fallback falhou", e); }
  // dinâmico
  fetchPage();
  // scroll infinito
  const sentinel = document.getElementById("sentinel");
  const observer = new IntersectionObserver((entries)=>{ for(const e of entries){ if(e.isIntersecting) fetchPage(); } }, { rootMargin:"400px 0px" });
  observer.observe(sentinel);
})();

async function fetchPage(){
  if(loading) return; loading = true;
  try{
    const res = await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}&days=${DAYS}`, { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fresh = dedupe((data.items || []).map(x => normalize(x, false)));
    if(fresh.length){ state.items.push(...fresh); page += 1; resortAndPaint(); }
  }catch(err){ console.error("feed err", err); }
  finally{ loading = false; }
}

function renderItems(items){
  for(const it of items){
    const node = template.content.cloneNode(true);
    node.querySelector(".image-link").href = it.link;
    const img = node.querySelector(".thumb");
    setNewsImage(img, it.image, it.title); // imagem robusta com proxy
    const aTitle = node.querySelector(".title"); aTitle.href = it.link; aTitle.textContent = it.title;
    const when = it.pubDate ? new Date(it.pubDate) : new Date();
    node.querySelector(".meta").textContent = `${it.source} • ${when.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
    node.querySelectorAll(".share-btn").forEach(btn => { btn.addEventListener("click", () => share(it, btn.dataset.platform)); });
    feedEl.appendChild(node);
  }
}

// loader de imagem: direto -> proxy -> fallback
function setNewsImage(img, url, title){
  img.alt = title || "";
  img.decoding = "async";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.dataset.retry = "0";
  if(!url){ img.src = pickRealistic(); return; }
  img.onerror = () => {
    const tries = parseInt(img.dataset.retry || "0", 10);
    if(tries === 0 && /^https?:/i.test(url)){
      img.dataset.retry = "1";
      img.src = "/.netlify/functions/img?u=" + encodeURIComponent(url);
      return;
    }
    img.onerror = null;
    img.src = pickRealistic();
  };
  img.src = url;
}

function pickRealistic(){ return REALISTIC[Math.floor(Math.random()*REALISTIC.length)]; }

// compartilhar
function share(it, platform){
  const url = encodeURIComponent(it.link);
  const text = encodeURIComponent(it.title + " — via Voz do Brasil");
  const routes = {
    native: null,
    whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    email: `mailto:?subject=${text}&body=${text}%20${url}`,
    copy: null
  };
  if(platform === "native" && navigator.share){ navigator.share({ title: it.title, text: it.title, url: it.link }).catch(()=>{}); return; }
  if(platform === "copy"){ navigator.clipboard?.writeText(it.link).then(()=>alert("Link copiado!")).catch(()=>prompt("Copie o link:", it.link)); return; }
  const t = routes[platform]; if(t){ window.open(t,"_blank","noopener"); }
}
