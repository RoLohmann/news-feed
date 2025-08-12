
const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 12;
const DAYS = 60;

let page = 0;
let loading = false;
const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");
const seen = new Set();
const state = { items: [] }; // mantém tudo para reordenar

const REALISTIC = [
  "/assets/realistic/bolsonaro_respeitoso_1.jpg",
  "/assets/realistic/bolsonaro_respeitoso_2.jpg",
  "/assets/realistic/protesto_amarelo_1.jpg",
  "/assets/realistic/protesto_amarelo_2.jpg"
];

function key(it){ return (it.link || "").trim().toLowerCase(); }
function normalize(it){
  return { source: it.source || "Fonte", title: it.title || "(sem título)", link: it.link || "#",
    pubDate: it.pubDate ? Date.parse(it.pubDate) : null, image: it.image || null, summary: it.summary || "" };
}
function dedupe(arr){
  const out = [];
  for(const it of arr){ const k = key(it); if(k && !seen.has(k)){ seen.add(k); out.push(it); } }
  return out;
}
function resortAndPaint(){
  state.items.sort((a,b)=> ( (b.pubDate ?? 0) - (a.pubDate ?? 0) )); // dinâmicos (com datas mais recentes) sobem
  feedEl.innerHTML = "";
  renderItems(state.items);
}

(async function boot(){
  // 1) pinta o estático DE IMEDIATO (UX), mas mantemos no estado para depois reordenar
  try {
    const res = await fetch("/static-news.json", { cache: "force-cache" });
    if(res.ok){
      const data = await res.json();
      const items = (data.items || []).map(normalize);
      const first = dedupe(items);
      state.items.push(...first);
      renderItems(first);
    }
  } catch(e){ console.warn("fallback falhou", e); }

  // 2) busca dinâmico; quando chegar, mescla, DEDUPA e REORDENA o feed inteiro (dinâmicos sobem)
  fetchPage();

  // 3) infinite scroll
  const sentinel = document.getElementById("sentinel");
  const observer = new IntersectionObserver((entries)=>{
    for(const e of entries){ if(e.isIntersecting) fetchPage(); }
  }, { rootMargin:"400px 0px" });
  observer.observe(sentinel);
})();

async function fetchPage(){
  if(loading) return; loading = true;
  try{
    const res = await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}&days=${DAYS}`, { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fresh = dedupe((data.items || []).map(normalize));
    if(fresh.length){
      state.items.push(...fresh);
      state.items = Array.from(new Set(state.items.map(x=>JSON.stringify(x)))).map(x=>JSON.parse(x)); // dedupe por JSON
      page += 1;
      resortAndPaint();
    }
  } catch(err){ console.error("feed err", err); }
  finally { loading = false; }
}

function renderItems(items){
  for(const it of items){
    const node = template.content.cloneNode(true);
    node.querySelector(".image-link").href = it.link;
    const img = node.querySelector(".thumb");
    img.src = it.image || pickRealistic(); img.alt = it.title;
    const aTitle = node.querySelector(".title"); aTitle.href = it.link; aTitle.textContent = it.title;
    const when = it.pubDate ? new Date(it.pubDate) : new Date();
    node.querySelector(".meta").textContent = `${it.source} • ${when.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
    node.querySelectorAll(".share-btn").forEach(btn => { btn.addEventListener("click", () => share(it, btn.dataset.platform)); });
    feedEl.appendChild(node);
  }
}

function pickRealistic(){
  return REALISTIC[Math.floor(Math.random()*REALISTIC.length)];
}

// Share (Instagram: não tem deep link oficial — usamos Copy+instrução)
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

  if(platform === "native" && navigator.share){
    navigator.share({ title: it.title, text: it.title, url: it.link }).catch(()=>{});
    return;
  }
  if(platform === "copy"){
    navigator.clipboard?.writeText(it.link).then(()=>{
      alert("Link copiado! Cole no Instagram ou onde quiser.");
    }).catch(()=>{
      prompt("Copie o link:", it.link);
    });
    return;
  }
  const target = routes[platform];
  if(target){ window.open(target, "_blank", "noopener"); }
}
