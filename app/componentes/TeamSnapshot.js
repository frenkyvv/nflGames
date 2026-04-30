'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import styles from '../Home.module.css';
import { formatGameTime, getTeamData, getTeamTimeZone } from './teamUtils';

const formatStat = (value) => {
  if (!value || Number.isNaN(value)) {
    return '--';
  }

  return value.toFixed(1);
};

const formatCurrentTime = (date, timeZone) =>
  new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);

const formatDate = (dateString) =>
  new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));

const renderPlayerCard = (
  player,
  role,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  fallbackImage,
  featured = false
) => {
  if (!player) {
    return null;
  }

  return (
    <article
      key={`${role}-${player.id}`}
      className={`${styles.playerCard} ${featured ? styles.playerCardFeatured : ''}`}
    >
      <div className={styles.playerCardTop}>
        <div className={styles.playerHeadshotWrap}>
          <Image
            className={styles.playerHeadshot}
            src={player.headshot || fallbackImage}
            alt={player.fullName}
            width={64}
            height={64}
            sizes="64px"
          />
        </div>
        <div className={styles.playerHeader}>
          <span className={styles.playerRole}>{role}</span>
          <strong className={styles.playerName}>{player.fullName}</strong>
          <span className={styles.playerPosition}>#{player.jersey} · {player.position}</span>
        </div>
      </div>
      <div
        className={`${styles.playerStats} ${secondaryLabel ? '' : styles.playerStatsSingle}`}
      >
        <div className={styles.playerStatBlock}>
          <span className={styles.playerStatLabel}>{primaryLabel}</span>
          <strong className={styles.playerStatValue}>{formatStat(primaryValue)}</strong>
        </div>
        {secondaryLabel ? (
          <div className={styles.playerStatBlock}>
            <span className={styles.playerStatLabel}>{secondaryLabel}</span>
            <strong className={styles.playerStatValue}>{formatStat(secondaryValue)}</strong>
          </div>
        ) : null}
      </div>
    </article>
  );
};

const TeamSnapshot = ({ team }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const teamTimeZone = getTeamTimeZone(team?.abbreviation);
  const [currentTime, setCurrentTime] = useState(() =>
    formatCurrentTime(new Date(), teamTimeZone)
  );

  useEffect(() => {
    if (!team?.abbreviation) {
      return undefined;
    }

    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/team-profile/${team.abbreviation.toLowerCase()}`);
        if (response.ok === false) {
          throw new Error('No pude cargar el resumen del equipo.');
        }

        const data = await response.json();
        if (cancelled === false) {
          setSnapshot(data);
        }
      } catch (fetchError) {
        if (cancelled === false) {
          setError(fetchError.message || 'No pude cargar el resumen del equipo.');
        }
      } finally {
        if (cancelled === false) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [team?.abbreviation]);

  useEffect(() => {
    setCurrentTime(formatCurrentTime(new Date(), teamTimeZone));
  }, [teamTimeZone]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(formatCurrentTime(new Date(), teamTimeZone));
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [teamTimeZone]);

  if (!team) {
    return null;
  }

  const venueMeta = snapshot?.team?.venueName && snapshot?.team?.venueCity && snapshot?.team?.venueState
    ? `${snapshot.team.venueName}, ${snapshot.team.venueCity}, ${snapshot.team.venueState} · ${currentTime}`
    : `Hora actual ${currentTime}`;

  const nextGame = snapshot?.nextGames?.[0] ?? null;
  const completedGames = snapshot?.completedGames ?? [];
  const recentGames = completedGames.slice(0, 5);

  return (
    <div className={styles.teamSnapshot}>
      <div className={styles.selectedTeamTop}>
        <div className={styles.selectedTeamBrand}>
          <Image
            className={styles.selectedLogo}
            src={team.logo}
            alt={team.apiName}
            width={68}
            height={68}
            sizes="68px"
          />
          <div className={styles.selectedTeamIdentity}>
            <span className={styles.selectedLabel}>Equipo activo</span>
            <strong className={styles.selectedName}>{team.apiName}</strong>
            <span className={styles.selectedMeta}>{venueMeta}</span>
          </div>
        </div>

        <div className={styles.teamRecordPill}>
          <span className={styles.teamRecordLabel}>Record</span>
          <strong className={styles.teamRecordValue}>
            {snapshot?.team?.recordSummary ?? '--'}
          </strong>
        </div>
      </div>

      {loading ? (
        <div className={styles.teamSnapshotState}>
          <strong className={styles.stateTitle}>Cargando perfil del equipo...</strong>
          <p className={styles.stateCopy}>Estoy trayendo el récord del equipo y sus referentes ofensivos.</p>
        </div>
      ) : null}

      {loading === false && error ? (
        <div className={styles.teamSnapshotState}>
          <strong className={styles.stateTitle}>No pude cargar el perfil</strong>
          <p className={styles.stateCopy}>{error}</p>
        </div>
      ) : null}

      {loading === false && error === null && snapshot ? (
        <>
          <div className={styles.teamSummaryGrid}>
            <div className={styles.teamSummaryCard}>
              <span className={styles.teamSummaryLabel}>Temporada</span>
              <strong className={styles.teamSummaryValue}>{snapshot.team.seasonSummary}</strong>
            </div>
            <div className={styles.teamSummaryCard}>
              <span className={styles.teamSummaryLabel}>Posición</span>
              <strong className={styles.teamSummaryValue}>{snapshot.team.standingSummary}</strong>
            </div>
            {snapshot.team.divisionName ? (
              <div className={styles.teamSummaryCard}>
                <span className={styles.teamSummaryLabel}>División</span>
                <strong className={styles.teamSummaryValue}>
                  {snapshot.team.divisionPosition ? `#${snapshot.team.divisionPosition} ` : ''}
                  {snapshot.team.divisionName}
                </strong>
              </div>
            ) : null}
          </div>

          {nextGame ? (
            <div className={styles.nextGameCard}>
              <div className={styles.nextGameHeader}>
                <span className={styles.sectionEyebrow}>Próximo juego</span>
                <span className={styles.nextGameBadge}>
                  {nextGame.seasonStage}
                  {nextGame.week ? ` · Sem. ${nextGame.week}` : ''}
                </span>
              </div>
              <div className={styles.nextGameBody}>
                <div className={styles.nextGameTeams}>
                  <div className={styles.nextGameTeamSlot}>
                    {nextGame.opponentLogo ? (
                      <Image
                        className={styles.nextGameLogo}
                        src={nextGame.opponentLogo}
                        alt={nextGame.opponentShortName}
                        width={40}
                        height={40}
                        sizes="40px"
                      />
                    ) : null}
                    <div>
                      <span className={styles.nextGameTeamLabel}>
                        {nextGame.isHome ? 'vs' : '@'}
                      </span>
                      <strong className={styles.nextGameTeamName}>
                        {nextGame.opponentShortName}
                      </strong>
                    </div>
                  </div>
                  <div className={styles.nextGameMeta}>
                    <span className={styles.nextGameDate}>
                      {formatGameTime(nextGame.date)}
                    </span>
                    {nextGame.venueName ? (
                      <span className={styles.nextGameVenue}>
                        {nextGame.venueName}
                        {nextGame.venueCity ? `, ${nextGame.venueCity}` : ''}
                      </span>
                    ) : null}
                    <span className={styles.nextGameLocation}>
                      {nextGame.isHome ? 'Local' : 'Visitante'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {recentGames.length > 0 ? (
            <div className={styles.recentResultsPanel}>
              <div className={styles.recentResultsHeader}>
                <span className={styles.sectionEyebrow}>Últimos resultados</span>
                <span className={styles.recentResultsNote}>{recentGames.length} juegos recientes</span>
              </div>
              <div className={styles.recentResultsList}>
                {recentGames.map((game) => (
                  <div
                    key={game.id}
                    className={`${styles.recentResultRow} ${
                      game.selectedWon ? styles.recentResultRowWin : styles.recentResultRowLoss
                    }`}
                  >
                    <span className={`${styles.recentResultBadge} ${
                      game.selectedWon ? styles.recentResultBadgeWin : styles.recentResultBadgeLoss
                    }`}>
                      {game.selectedWon ? 'G' : 'P'}
                    </span>
                    <div className={styles.recentResultInfo}>
                      <span className={styles.recentResultOpponent}>
                        {game.isHome ? 'vs' : '@'} {game.opponentShortName}
                      </span>
                      <span className={styles.recentResultStage}>{game.seasonStage}</span>
                    </div>
                    <div className={styles.recentResultScore}>
                      <strong className={styles.recentResultScoreValue}>
                        {game.selectedScore}–{game.opponentScore}
                      </strong>
                      <span className={styles.recentResultDate}>{formatDate(game.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.playersPanel}>
            <div className={styles.playersPanelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Top 5 del equipo</span>
                <p className={styles.playersPanelNote}>QB, dos receptores y dos corredores con sus promedios por juego.</p>
              </div>
            </div>

            <div className={styles.playersGrid}>
              {renderPlayerCard(
                snapshot.leaders.quarterback,
                'QB',
                'Pase YDS/J',
                snapshot.leaders.quarterback?.passingYardsPerGame,
                'Carrera YDS/J',
                snapshot.leaders.quarterback?.quarterbackRushingYardsPerGame,
                team.logo,
                true
              )}
              {snapshot.leaders.receivers.map((player) =>
                renderPlayerCard(
                  player,
                  'Receptor',
                  'Recepción YDS/J',
                  player.receivingYardsPerGame,
                  null,
                  null,
                  team.logo
                )
              )}
              {snapshot.leaders.rushers.map((player) =>
                renderPlayerCard(
                  player,
                  'Corredor',
                  'Carrera YDS/J',
                  player.rushingYardsPerGame,
                  null,
                  null,
                  team.logo
                )
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default TeamSnapshot;
