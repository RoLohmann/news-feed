
export async function handler(event){
  const u = event.queryStringParameters?.u;
  if(!u || !/^https?:\/\//i.test(u)){ return { statusCode:400, body:"missing or invalid url" }; }
  try{
    const res = await fetch(u, {
      headers: {
        "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 NetlifyProxy",
        "Accept":"image/*,*/*;q=0.8",
        "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.8",
        "Referer": ""
      },
      redirect: "follow"
    });
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control":"public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin":"*"
      },
      isBase64Encoded: true,
      body: buf.toString("base64")
    };
  }catch(err){
    return { statusCode:502, body: String(err?.message||err) };
  }
}
