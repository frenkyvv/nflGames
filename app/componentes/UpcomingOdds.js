// components/UpcomingOdds.js
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../Home.module.css';

const UpcomingOdds = ({ team }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const options = {
        method: 'GET',
        url: 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds',
        params: {
          apiKey: '68bf845edcc203a1af3e7e42b05df487',
          regions: 'us',
          markets: 'h2h,spreads',
          oddsFormat: 'american',
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
          setError("Error al cargar los datos: " + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    fetchEvents();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  const filteredEvents = events.filter(
    (event) => event.home_team === team || event.away_team === team
  );

  return (
    <div className={styles.container}>
      <div className={styles.subtitulo}>Probabilidades</div>
      {filteredEvents.map(event => (
        <div key={event.id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{event.sport_title}</h5>
            <p className="card-text">
              <strong>{event.home_team}</strong> vs <strong>{event.away_team}</strong>
            </p>
            <p>Fecha y hora: {new Date(event.commence_time).toLocaleString()}</p>
            {event.bookmakers && event.bookmakers.map(bookmaker => (
              <div key={bookmaker.key}>
                <h6>{bookmaker.title}</h6>
                {bookmaker.markets && bookmaker.markets.map(market => (
                  <ul key={market.key}>
                    {market.outcomes && market.outcomes.map(outcome => (
                      <li key={outcome.name}>
                        {outcome.name}: {outcome.price} {market.key === 'spreads' && outcome.point ? `(${outcome.point})` : ''}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingOdds;
