
# Bolsonaro Feed — zero-cost (static-first + GH Actions)

- Static-first: usuário vê `static-news.json` imediatamente; feed dinâmico carrega depois.
- Função `/.netlify/functions/feed` com debug (`?debug=1`) e cache (s-maxage=120).
- GitHub Actions atualiza o fallback a cada 6h (grátis).
- 8 imagens patrióticas SVG consistentes em `public/assets/patriot/`.

## Local
npm install
npx netlify-cli dev

## Deploy
Netlify → Publish: `public`, Functions: `netlify/functions`.

## Debug
http://localhost:8888/.netlify/functions/feed?days=90&debug=1
