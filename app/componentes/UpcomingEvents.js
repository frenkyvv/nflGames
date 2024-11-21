// components/UpcomingEvents.js
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const UpcomingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    const options = {
      method: 'GET',
      url: 'https://api.b365api.com/v1/bet365/upcoming',
      params: {
        sport_id: 1, // ID del deporte, por ejemplo, 1 para fútbol
        token: '7fd7e68ba2msh0495524c398efb1p1d056ejsn5fd6715142b9' // Reemplaza con tu token
      }
    };

    try {
      const response = await axios.request(options);
      setEvents(response.data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar los datos: {error}</p>;

  return (
    <div className="container">
      <h2>Próximos Eventos</h2>
      {events.map(event => (
        <div key={event.id} className="card mb-3">
          <div className="card-body">
            <p><strong>ID:</strong> {event.id}</p>
            <p><strong>Home Team:</strong> {event.home.name}</p>
            <p><strong>Away Team:</strong> {event.away.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingEvents;
