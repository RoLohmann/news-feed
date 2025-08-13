const fetch = require('node-fetch');

exports.handler = async (event) => {
  const article = JSON.parse(event.body);
  
  try {
    // Text analysis
    const textResponse = await fetch(
      'https://api-inference.huggingface.co/models/pierreguillou/gpt2-small-portuguese',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer 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' },
        body: JSON.stringify({
          inputs: `Escreva uma análise bolsonarista de 15 palavras sobre "${article.title}". Destaque aspectos positivos ou negativos para Bolsonaro:`,
          parameters: { 
            max_new_tokens: 50,
            temperature: 0.7,
            wait_for_model: true 
          }
        })
      }
    );

    // Image generation
    const imageResponse = await fetch(
      'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Token r8_OPHaY5tqHFzKletRBPHPSa48j28UXgJ2EnYgd',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          input: {
            prompt: `Cena política brasileira realista sobre "${article.title}" mostrando impacto para Bolsonaro`,
            negative_prompt: "bandeiras comunistas, símbolos esquerdistas, violência",
            width: 512,
            height: 384
          }
        })
      }
    );

    const textData = await textResponse.json();
    const imageData = await imageResponse.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis: textData[0]?.generated_text || "Análise não disponível",
        imageId: imageData.id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
