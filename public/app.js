const FEED_ENDPOINT = "/.netlify/functions/feed";
const PAGE_SIZE = 10;
let page = 0;
let loading = false;
const feedEl = document.getElementById("feed");
const template = document.getElementById("card-template");

async function fetchPage(){
  if(loading) return;
  loading = true;
  try{
    const res = await fetch(`${FEED_ENDPOINT}?page=${page}&pageSize=${PAGE_SIZE}`);
    if(!res.ok) throw new Error(`Erro ${res.status}`);
    const data = await res.json();
    renderItems(data.items);
    if(data.items && data.items.length > 0){
      page += 1;
    }else{
      observer.disconnect();
    }
  }catch(err){
    console.error(err);
    const msg = document.createElement("p");
    msg.textContent = "Não foi possível carregar mais notícias agora.";
    msg.style.color = "white";
    feedEl.appendChild(msg);
    observer.disconnect();
  }finally{
    loading = false;
  }
}

function renderItems(items){
  for(const it of items){
    const node = template.content.cloneNode(true);
    const aImg = node.querySelector(".image-link");
    const img = node.querySelector(".thumb");
    const aTitle = node.querySelector(".title");
    const meta = node.querySelector(".meta");

    aImg.href = it.link;
    aTitle.href = it.link;
    aTitle.textContent = it.title;

    img.src = it.image || pickPatriot();
    img.alt = it.title;

    const when = new Date(it.pubDate || Date.now());
    meta.textContent = `${it.source} • ${when.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric'})}`;

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

// IntersectionObserver for infinite scroll
const sentinel = document.getElementById("sentinel");
const observer = new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      fetchPage();
    }
  }
}, { rootMargin: "400px 0px" });
observer.observe(sentinel);

// kick off
fetchPage();