# Bolsonaro Feed — completo (Netlify)

Site estático com **rolagem infinita**, que agrega notícias sobre **Bolsonaro** de fontes configuradas em `sources.json`. 
Se a função não encontrar nada (ou falhar), o front usa um **fallback estático** em `public/static-news.json`.

## Deploy (recomendado: via Git)

1. Crie um repositório e copie **todo o conteúdo** desta pasta.
2. No Netlify: **Add new site → Import from Git**.
3. Configure:
   - **Build command**: *(vazio)*
   - **Publish directory**: `public`
4. Faça o deploy. A função `feed` aparecerá em **Site → Functions**.

> Também funciona com Netlify CLI: `netlify deploy --prod --dir=public --functions=netlify/functions`

## Como funciona
- **Função `/.netlify/functions/feed`** agrega RSS/Atom, filtra por posts que mencionam “Bolsonaro” e retorna itens dos **últimos 60 dias** (ajustável via `?days=`).
- **Fallback**: `public/app.js` carrega `/public/static-news.json` se a primeira chamada da função vier vazia/falhar.
- **Imagens**: quando o item não tem imagem, usamos SVGs patrióticos locais como fallback.

## Arquivos principais
- `public/index.html`, `public/styles.css`, `public/app.js`
- `public/assets/patriot/*.svg`
- `public/static-news.json` (fallback estático)
- `netlify/functions/feed.js`
- `sources.json` (lista de feeds)
- `netlify.toml` (inclui `sources.json` no bundle da função)

## Ajustes
- Edite `sources.json` para trocar/adicionar feeds.
- Ajuste a janela de tempo mudando `const DAYS` em `public/app.js` ou usando `/.netlify/functions/feed?days=90`.