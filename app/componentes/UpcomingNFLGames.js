'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import styles from '../Home.module.css';
import { formatGameTime, getTeamData } from './teamUtils';

const UpcomingNFLGames = ({ team }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/events');
        if (response.ok === false) {
          throw new Error('No fue posible cargar el calendario.');
        }

        const data = await response.json();
        if (cancelled === false) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (cancelled === false) {
          setError(err.message || 'No fue posible cargar el calendario.');
        }
      } finally {
        if (cancelled === false) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = events.filter(
    (event) => event.home_team === team || event.away_team === team
  );
  const teamInfo = getTeamData(team);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Calendario</span>
          <h2 className={styles.sectionTitle}>Proximos juegos de {teamInfo?.shortName ?? team}</h2>
        </div>
        <p className={styles.sectionNote}>Horario mostrado en tu zona local.</p>
      </div>

      {loading ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>Cargando calendario...</strong>
          <p className={styles.stateCopy}>Estoy trayendo los siguientes encuentros del equipo seleccionado.</p>
        </div>
      ) : null}

      {loading === false && error ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>No pude cargar los juegos</strong>
          <p className={styles.stateCopy}>{error}</p>
        </div>
      ) : null}

      {loading === false && error === null && filteredEvents.length === 0 ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>Sin juegos disponibles</strong>
          <p className={styles.stateCopy}>La API no devolvio proximos partidos para este equipo por ahora.</p>
        </div>
      ) : null}

      {loading === false && error === null && filteredEvents.length > 0 ? (
        <div className={styles.gamesGrid}>
          {filteredEvents.map((event) => {
            const homeTeam = getTeamData(event.home_team);
            const awayTeam = getTeamData(event.away_team);
            const selectedIsHome = event.home_team === team;
            const awayClassName = [styles.teamPanel, event.away_team === team ? styles.teamPanelSelected : '']
              .filter(Boolean)
              .join(' ');
            const homeClassName = [styles.teamPanel, event.home_team === team ? styles.teamPanelSelected : '']
              .filter(Boolean)
              .join(' ');

            return (
              <article key={event.id} className={styles.gameCard}>
                <div className={styles.cardTopRow}>
                  <span className={styles.kickoffChip}>{formatGameTime(event.commence_time)}</span>
                  <span className={styles.locationChip}>{selectedIsHome ? 'Local' : 'Visitante'}</span>
                </div>

                <div className={styles.matchupGrid}>
                  <div className={awayClassName} style={{ borderColor: awayTeam?.primaryColor ?? '#cbd5e1' }}>
                    <Image className={styles.teamLogo} src={awayTeam?.logo} alt={event.away_team} width={68} height={68} sizes="68px" />
                    <div className={styles.teamMeta}>
                      <strong className={styles.teamName}>{event.away_team}</strong>
                      <span className={styles.teamNickname}>{awayTeam?.shortName ?? 'Away'}</span>
                    </div>
                  </div>

                  <span className={styles.versus}>@</span>

                  <div className={homeClassName} style={{ borderColor: homeTeam?.primaryColor ?? '#cbd5e1' }}>
                    <Image className={styles.teamLogo} src={homeTeam?.logo} alt={event.home_team} width={68} height={68} sizes="68px" />
                    <div className={styles.teamMeta}>
                      <strong className={styles.teamName}>{event.home_team}</strong>
                      <span className={styles.teamNickname}>{homeTeam?.shortName ?? 'Home'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.gameFooter}>
                  <div>
                    <span className={styles.footerLabel}>Juego</span>
                    <strong className={styles.footerValue}>{event.away_team} @ {event.home_team}</strong>
                  </div>
                  <div>
                    <span className={styles.footerLabel}>Sede</span>
                    <strong className={styles.footerValue}>{selectedIsHome ? 'Juega en casa' : 'Juega fuera'}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default UpcomingNFLGames;
