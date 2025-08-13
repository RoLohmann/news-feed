
export async function handler(event){
  if(event.httpMethod !== "POST"){ return { statusCode:405, body:"Method Not Allowed" }; }
  const { email } = JSON.parse(event.body || "{}");
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ return { statusCode:400, body:"Invalid email" }; }
  try{
    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if(!apiKey) return { statusCode:200, body:"ok" };
    const resp = await fetch("https://api.buttondown.email/v1/subscribers", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Token "+apiKey },
      body: JSON.stringify({ email })
    });
    if(resp.status >= 200 && resp.status < 300) return { statusCode:200, body:"ok" };
    return { statusCode:502, body: await resp.text() };
  }catch(err){ return { statusCode:500, body:String(err?.message||err) }; }
}
