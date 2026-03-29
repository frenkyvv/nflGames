'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import styles from '../Home.module.css';
import {
  findMarket,
  formatOddsValue,
  formatGameTime,
  formatSpread,
  getBestPrice,
  getImpliedProbability,
  getOutcome,
  getTeamData,
} from './teamUtils';

const UpcomingOdds = ({ team, oddsFormat = 'decimal' }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatLabel = oddsFormat === 'american' ? 'americanos' : 'decimales';

  useEffect(() => {
    let cancelled = false;

    const fetchOdds = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/odds?format=${oddsFormat}`);
        if (response.ok === false) {
          throw new Error('No fue posible cargar las cuotas.');
        }

        const data = await response.json();
        if (cancelled === false) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (cancelled === false) {
          setError(err.message || 'No fue posible cargar las cuotas.');
        }
      } finally {
        if (cancelled === false) {
          setLoading(false);
        }
      }
    };

    fetchOdds();

    return () => {
      cancelled = true;
    };
  }, [oddsFormat]);

  const filteredEvents = events.filter(
    (event) => event.home_team === team || event.away_team === team
  );
  const selectedTeam = getTeamData(team);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Cuotas</span>
          <h2 className={styles.sectionTitle}>Momios {formatLabel} de {selectedTeam?.shortName ?? team}</h2>
        </div>
        <p className={styles.sectionNote}>Moneyline y spread en formato {oddsFormat === 'american' ? 'americano' : 'decimal'}.</p>
      </div>

      {loading ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>Cargando cuotas...</strong>
          <p className={styles.stateCopy}>Estoy consultando las casas de apuestas disponibles para este equipo.</p>
        </div>
      ) : null}

      {loading === false && error ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>No pude cargar las cuotas</strong>
          <p className={styles.stateCopy}>{error}</p>
        </div>
      ) : null}

      {loading === false && error === null && filteredEvents.length === 0 ? (
        <div className={styles.stateCard}>
          <strong className={styles.stateTitle}>Sin cuotas disponibles</strong>
          <p className={styles.stateCopy}>La API no devolvio probabilidades activas para este equipo.</p>
        </div>
      ) : null}

      {loading === false && error === null && filteredEvents.length > 0 ? (
        <div className={styles.oddsGrid}>
          {filteredEvents.map((event) => {
            const homeTeam = getTeamData(event.home_team);
            const awayTeam = getTeamData(event.away_team);
            const selectedBest = getBestPrice(event.bookmakers, 'h2h', team, oddsFormat);
            const opponent = event.home_team === team ? event.away_team : event.home_team;
            const opponentBest = getBestPrice(event.bookmakers, 'h2h', opponent, oddsFormat);
            const homeBest = getBestPrice(event.bookmakers, 'h2h', event.home_team, oddsFormat);
            const awayBest = getBestPrice(event.bookmakers, 'h2h', event.away_team, oddsFormat);

            return (
              <article key={event.id} className={styles.oddsEventCard}>
                <div className={styles.cardTopRow}>
                  <span className={styles.kickoffChip}>{formatGameTime(event.commence_time)}</span>
                  <span className={styles.locationChip}>{event.bookmakers?.length ?? 0} casas</span>
                </div>

                <div className={styles.matchupBanner}>
                  <div className={styles.matchupTeam}>
                    <Image className={styles.teamLogo} src={awayTeam?.logo} alt={event.away_team} width={68} height={68} sizes="68px" />
                    <strong className={styles.bannerTeamName}>{awayTeam?.shortName ?? event.away_team}</strong>
                  </div>
                  <span className={styles.versus}>@</span>
                  <div className={styles.matchupTeam}>
                    <Image className={styles.teamLogo} src={homeTeam?.logo} alt={event.home_team} width={68} height={68} sizes="68px" />
                    <strong className={styles.bannerTeamName}>{homeTeam?.shortName ?? event.home_team}</strong>
                  </div>
                </div>

                <div className={styles.oddsSummaryGrid}>
                  <div className={styles.bestOddsCard}>
                    <span className={styles.bestOddsLabel}>Mejor cuota para {selectedTeam?.shortName ?? team}</span>
                    <strong className={styles.bestOddsValue}>{formatOddsValue(selectedBest?.price, oddsFormat)}</strong>
                    <span className={styles.bestOddsMeta}>
                      {selectedBest?.bookmaker
                        ? selectedBest.bookmaker + ' · Prob. ' + getImpliedProbability(selectedBest.price, oddsFormat) + '%'
                        : 'Sin datos'}
                    </span>
                  </div>
                  <div className={styles.bestOddsCard}>
                    <span className={styles.bestOddsLabel}>Mejor cuota para el rival</span>
                    <strong className={styles.bestOddsValue}>{formatOddsValue(opponentBest?.price, oddsFormat)}</strong>
                    <span className={styles.bestOddsMeta}>
                      {opponentBest?.bookmaker
                        ? opponentBest.bookmaker + ' · Prob. ' + getImpliedProbability(opponentBest.price, oddsFormat) + '%'
                        : 'Sin datos'}
                    </span>
                  </div>
                  <div className={styles.bestOddsCard}>
                    <span className={styles.bestOddsLabel}>Resumen del juego</span>
                    <strong className={styles.bestOddsValue}>{formatOddsValue(awayBest?.price, oddsFormat)} / {formatOddsValue(homeBest?.price, oddsFormat)}</strong>
                    <span className={styles.bestOddsMeta}>{event.away_team} vs {event.home_team}</span>
                  </div>
                </div>

                <div className={styles.bookmakerGrid}>
                  {(event.bookmakers ?? []).map((bookmaker) => {
                    const h2hMarket = findMarket(bookmaker, 'h2h');
                    const spreadMarket = findMarket(bookmaker, 'spreads');

                    return (
                      <div key={bookmaker.key} className={styles.bookmakerCard}>
                        <div className={styles.bookmakerHeader}>
                          <strong className={styles.bookmakerName}>{bookmaker.title}</strong>
                        </div>

                        <div className={styles.marketStack}>
                          <div className={styles.marketCard}>
                            <span className={styles.marketTitle}>Moneyline</span>
                            <div className={styles.marketList}>
                              {[event.away_team, event.home_team].map((teamName) => {
                                const outcome = getOutcome(h2hMarket, teamName);
                                const teamInfo = getTeamData(teamName);
                                return (
                                  <div key={bookmaker.key + '-' + teamName + '-h2h'} className={styles.marketRow}>
                                    <span className={styles.marketTeam}>{teamInfo?.shortName ?? teamName}</span>
                                    <strong className={styles.marketValue}>{formatOddsValue(outcome?.price, oddsFormat)}</strong>
                                    <span className={styles.marketMeta}>
                                      {outcome?.price ? getImpliedProbability(outcome.price, oddsFormat) + '%' : '--'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className={styles.marketCard}>
                            <span className={styles.marketTitle}>Spread</span>
                            <div className={styles.marketList}>
                              {[event.away_team, event.home_team].map((teamName) => {
                                const outcome = getOutcome(spreadMarket, teamName);
                                const teamInfo = getTeamData(teamName);
                                return (
                                  <div key={bookmaker.key + '-' + teamName + '-spread'} className={styles.marketRow}>
                                    <span className={styles.marketTeam}>{teamInfo?.shortName ?? teamName}</span>
                                    <strong className={styles.marketValue}>{formatSpread(outcome?.point)}</strong>
                                    <span className={styles.marketMeta}>{formatOddsValue(outcome?.price, oddsFormat)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default UpcomingOdds;
