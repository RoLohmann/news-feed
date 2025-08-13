import React, { useState, useEffect } from 'react';
import './App.css';
import Article from './components/Article';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `https://newsapi.org/v2/top-headlines?country=de&category=${category}&q=${searchQuery}&apiKey=${process.env.REACT_APP_API_KEY}`
        );
        
        const data = await response.json();
        if (data.status === 'ok') {
          setArticles(data.articles);
        } else {
          throw new Error(data.message || 'Erro ao carregar notícias');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category, searchQuery]);

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="App">
      <header>
        <h1>Notícias com Perspectiva Bolsonarista</h1>
        <div className="disclaimer-banner">
          <p>
            <strong>Aviso:</strong> As análises e imagens são geradas por IA e 
            representam uma perspectiva política específica. Podem conter 
            viéses e não substituem o jornalismo profissional.
          </p>
        </div>
      </header>
      
      <div className="category-buttons">
        {['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'].map((cat) => (
          <button
            key={cat}
            className={category === cat ? 'active' : ''}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Pesquisar notícias..."
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>
      
      {loading && <p>Carregando...</p>}
      {error && <p className="error">Erro: {error}</p>}
      
      <div className="news-container">
        {articles.map((article, index) => (
          <Article key={index} article={article} />
        ))}
      </div>
    </div>
  );
}

export default App;
