// components/Bet365Results.js
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../Home.module.css';

const Bet365Results = ({ eventId }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!eventId) return;

      const options = {
        method: 'GET',
        url: 'https://betsapi2.p.rapidapi.com/v1/bet365/result',
        headers: {
          'x-rapidapi-key': '7fd7e68ba2msh0495524c398efb1p1d056ejsn5fd6715142b9',
          'x-rapidapi-host': 'betsapi2.p.rapidapi.com',
        },
        params: {
          event_id: eventId,
        },
      };

      try {
        const response = await axios.request(options);
        setResults(response.data.results || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [eventId]);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar los datos: {error.message}</p>;
  if (!results.length) return <p>No se encontraron resultados.</p>;

  return (
    <div className={styles.container}>
      {results.map((result) => (
        <div key={result.id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{result.league?.name}</h5>
            <p className="card-text">
              <strong>{result.home?.name}</strong> vs <strong>{result.away?.name}</strong>
            </p>
            <p>Marcador: {result.ss}</p>
            <h6>Goles</h6>
            <ul>
              <li>Primer Tiempo: {result.scores?.[1]?.home} - {result.scores?.[1]?.away}</li>
              <li>Segundo Tiempo: {result.scores?.[2]?.home} - {result.scores?.[2]?.away}</li>
            </ul>
            <h6>Estadísticas</h6>
            <ul>
              <li>Posesión: {result.stats?.possession_rt?.[0]}% - {result.stats?.possession_rt?.[1]}%</li>
              <li>Disparos a puerta: {result.stats?.on_target?.[0]} - {result.stats?.on_target?.[1]}</li>
              <li>Disparos fuera: {result.stats?.off_target?.[0]} - {result.stats?.off_target?.[1]}</li>
              <li>Corners: {result.stats?.corners?.[0]} - {result.stats?.corners?.[1]}</li>
              <li>Tarjetas amarillas: {result.stats?.yellowcards?.[0]} - {result.stats?.yellowcards?.[1]}</li>
              <li>Tarjetas rojas: {result.stats?.redcards?.[0]} - {result.stats?.redcards?.[1]}</li>
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Bet365Results;
