const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Security: Validate origin
  const allowedOrigins = [
    "https://your-netlify-domain.netlify.app",
    "http://localhost:3000"
  ];
  if (!allowedOrigins.includes(event.headers.origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const { imageId } = JSON.parse(event.body);
  
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${imageId}`,
      {
        headers: { 
          Authorization: `Token ${process.env.REPLICATE_TOKEN}` 
        }
      }
    );
    
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': event.headers.origin
      },
      body: JSON.stringify({
        status: data.status,
        image: data.output?.[0] || null
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
