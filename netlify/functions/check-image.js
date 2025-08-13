const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { imageId } = JSON.parse(event.body);
  
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${imageId}`,
      {
        headers: { 
          Authorization: 'Token r8_OPHaY5tqHFzKletRBPHPSa48j28UXgJ2EnYgd' 
        }
      }
    );
    
    const data = await response.json();
    return {
      statusCode: 200,
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
