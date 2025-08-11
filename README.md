# Bolsonaro Feed — Netlify

Este projeto é um site estático com **rolagem infinita** que exibe um feed de notícias relacionadas a **Bolsonaro**.  
Ele busca conteúdos apenas dos **feeds RSS/Atom** que você configurar e filtra os itens que mencionam *Bolsonaro* no título ou no resumo.

> ⚠️ Você controla as fontes. Para cumprir o requisito de "apenas fontes apoiadoras", preencha `sources.json` apenas com feeds de veículos que você considera apoiadores.

## Como publicar no Netlify

1. Faça o download do zip deste projeto e extraia.
2. Edite `sources.json` com suas fontes (RSS/Atom) preferidas.
3. Faça login no Netlify e clique em **Add new site → Import an existing project**.
4. Aponte para o repositório/zip e mantenha:
   - **Base directory**: (vazio)
   - **Build command**: *(vazio)*
   - **Publish directory**: `public`
5. O Netlify detectará a pasta `netlify/functions` e criará a função `feed` automaticamente.

## Estrutura

```
public/                # HTML/CSS/JS do site
  index.html
  styles.css
  app.js
  assets/patriot/      # imagens de fallback (patrióticas) para quando o item não tem imagem

netlify/functions/
  feed.js              # função serverless que agrega os RSS/Atom e pagina

sources.json           # lista de feeds (edite!)
netlify.toml
package.json
```

## Configuração de fontes

Edite `sources.json` e coloque apenas fontes que você considera apoiadoras, por exemplo:

```json
[
  { "name": "Nome da Fonte", "feedUrl": "https://site.exemplo.com/rss" }
]
```

## Personalização

- **Cores de fundo**: Já usa um gradiente com as cores da bandeira do Brasil.
- **Título**: Edite o `<h1>` no `index.html`.
- **Página**: O feed carrega mais itens automaticamente ao chegar perto do final da página.

## Observações

- A função tenta extrair imagens comuns de RSS (enclosure/media:content/thumbnail) e, se não houver, usa **imagens patrióticas locais**.
- O filtro por “Bolsonaro” é case-insensitive no título e no resumo.
- Este projeto não depende de serviços de terceiros fora dos RSS que você indicar.
- Node 18 é recomendado no Netlify.