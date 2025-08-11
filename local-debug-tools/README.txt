
Local debug tools

These files let you debug your feeds without deploying to Netlify.

1) From your project root, install dependencies:
   npm install

2) Run the local Netlify emulator (optional, to test the function endpoint):
   npx netlify-cli dev
   # then open http://localhost:8888/.netlify/functions/feed?days=90&debug=1

3) Or run the standalone feed debugger (no Netlify required):
   node scripts/debug-feeds.mjs --days 90 --pattern bolsonaro --limit 3

You'll see per-source: HTTP status, parsed items, matched items, and sample headlines.
