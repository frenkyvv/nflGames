// components/NFLResults.js
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const NFLResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResults = async () => {
    const options = {
      method: 'GET',
      url: 'https://api.the-odds-api.com/v4/sports/nfl/scores',
      params: {
        apiKey: 'YOUR_API_KEY',
        daysFrom: 1,
        dateFormat: 'iso'
      }
    };

    try {
      const response = await axios.request(options);
      setResults(response.data);
    } catch (err) {
      if (err.response?.status === 429) {
        // Implementar reintento con retraso en caso de error 429
        console.error("Demasiadas solicitudes. Reintentando en 3 segundos...");
        await delay(3000);
        fetchResults();
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    fetchResults();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar los datos: {error.message}</p>;

  return (
    <div className="container">
      <h2>Resultados de la NFL</h2>
      {results.map(result => (
        <div key={result.id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{result.home_team} vs {result.away_team}</h5>
            <p>Fecha y hora: {new Date(result.commence_time).toLocaleString()}</p>
            <p>Resultado: {result.home_team} {result.home_score} - {result.away_score} {result.away_team}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NFLResults;
