const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 12;
const DAYS = 60; // janela padrão de 60 dias (~2 meses)
let page = 0;
let loading = false;
let usedFallback = false;

const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");

async function fetchPage(){
  if(loading) return;
  loading = true;
  try{
    const res = await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}&days=${DAYS}`);
    if(!res.ok) throw new Error(`Erro ${res.status}`);
    const data = await res.json();

    if((!data.items || data.items.length === 0) && page === 0 && !usedFallback){
      await useFallback();
      observer.disconnect();
      return;
    }

    renderItems(data.items || []);
    if(data.items && data.items.length > 0){
      page += 1;
    }else{
      observer.disconnect();
    }
  }catch(err){
    console.error(err);
    if(page === 0 && !usedFallback){
      await useFallback();
      observer.disconnect();
    }else{
      const msg = document.createElement("p");
      msg.textContent = "Não foi possível carregar mais notícias agora.";
      msg.style.color = "white";
      feedEl.appendChild(msg);
      observer.disconnect();
    }
  }finally{
    loading = false;
  }
}

async function useFallback(){
  try{
    const res = await fetch("/static-news.json");
    if(!res.ok) throw new Error("fallback nao encontrado");
    const data = await res.json();
    if(data.items && data.items.length){
      renderItems(data.items);
      usedFallback = true;
    }
  }catch(e){
    console.error("Falha no fallback", e);
  }
}

function renderItems(items){
  for(const it of items){
    const node = template.content.cloneNode(true);
    const aImg = node.querySelector(".image-link");
    const img = node.querySelector(".thumb");
    const aTitle = node.querySelector(".title");
    const meta = node.querySelector(".meta");

    const link = it.link || "#";
    aImg.href = link;
    aTitle.href = link;
    aTitle.textContent = it.title || "(sem título)";

    img.src = it.image || pickPatriot();
    img.alt = it.title || "Notícia";

    const when = it.pubDate ? new Date(it.pubDate) : new Date();
    meta.textContent = `${it.source || "Fonte"} • ${when.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric'})}`;

    feedEl.appendChild(node);
  }
}

function pickPatriot(){
  const options = [
    "/assets/patriot/patriot_1.svg",
    "/assets/patriot/patriot_2.svg",
    "/assets/patriot/patriot_3.svg",
  ];
  return options[Math.floor(Math.random()*options.length)];
}

const sentinel = document.getElementById("sentinel");
const observer = new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      fetchPage();
    }
  }
}, { rootMargin: "400px 0px" });
observer.observe(sentinel);

fetchPage();