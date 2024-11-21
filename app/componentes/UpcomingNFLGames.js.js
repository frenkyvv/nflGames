// components/UpcomingNFLGames.js
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../Home.module.css';

const UpcomingNFLGames = ({ team }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    const options = {
      method: 'GET',
      url: 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events',
      params: {
        apiKey: '68bf845edcc203a1af3e7e42b05df487',
        dateFormat: 'iso'
      }
    };

    try {
      const response = await axios.request(options);
      setEvents(response.data);
    } catch (err) {
      console.error("Error al cargar los datos:", err.message);
      if (err.response?.status === 429) {
        console.error("Demasiadas solicitudes. Reintentando en 3 segundos...");
        await delay(3000);
        fetchEvents();
      } else {
        setError("");
      }
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  const filteredEvents = events.filter(
    (event) => event.home_team === team || event.away_team === team
  );

  return (
    <div className={styles.container}>
      <div className={styles.subtitulo}>Próximos Juegos</div>
      <div className={styles.box}>
      {filteredEvents.map(event => (
        <div key={event.id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">
              {event.home_team} vs {event.away_team}
            </h5>
            <p>Fecha y hora: {new Date(event.commence_time).toLocaleString()}</p>
          </div>
        </div>
        
      ))}
      </div>
    </div>
  );
};

export default UpcomingNFLGames;
