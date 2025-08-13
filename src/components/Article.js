import React, { useState, useEffect } from 'react';

const Article = ({ article }) => {
  const [analysis, setAnalysis] = useState(null);
  const [imageStatus, setImageStatus] = useState('idle');
  const [perspectiveImage, setPerspectiveImage] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const cacheKey = `analysis-${article.url}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          const { text, image } = JSON.parse(cached);
          setAnalysis(text);
          if (image) setPerspectiveImage(image);
          return;
        }

        const response = await fetch('/.netlify/functions/analyze-news', {
          method: 'POST',
          body: JSON.stringify(article)
        });

        const { analysis, imageId } = await response.json();
        setAnalysis(analysis);
        localStorage.setItem(cacheKey, JSON.stringify({ text: analysis }));
        
        if (imageId) {
          setImageStatus('processing');
          const interval = setInterval(async () => {
            const imgResponse = await fetch('/.netlify/functions/check-image', {
              method: 'POST',
              body: JSON.stringify({ imageId })
            });
            
            const { status, image } = await imgResponse.json();
            if (status === 'succeeded' && image) {
              clearInterval(interval);
              setImageStatus('completed');
              setPerspectiveImage(image);
              const cachedData = JSON.parse(localStorage.getItem(cacheKey) || '{}');
              cachedData.image = image;
              localStorage.setItem(cacheKey, JSON.stringify(cachedData));
            } else if (status === 'failed') {
              clearInterval(interval);
              setImageStatus('failed');
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Analysis error:', error);
      }
    };

    fetchAnalysis();
  }, [article]);

  return (
    <div className="article">
      <img src={article.urlToImage} alt={article.title} className="article-image" />
      <h3>{article.title}</h3>
      <p>{article.description}</p>
      <a href={article.url} target="_blank" rel="noopener noreferrer">Leia mais</a>
      
      <div className="bolsonaro-analysis">
        <h4>Perspectiva Bolsonarista:</h4>
        {analysis ? <p>{analysis}</p> : <p>Gerando análise...</p>}
        
        {imageStatus === 'processing' && <p>Gerando imagem...</p>}
        {imageStatus === 'failed' && <p>Imagem não disponível</p>}
        {perspectiveImage && (
          <img 
            src={perspectiveImage} 
            alt="Perspectiva visual" 
            style={{ maxWidth: '100%', marginTop: '10px' }}
          />
        )}
      </div>
      
      <div className="disclaimer">
        <small>Análise gerada por IA com perspectiva política específica</small>
      </div>
    </div>
  );
};

export default Article;
