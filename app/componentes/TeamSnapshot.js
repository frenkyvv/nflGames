'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import styles from '../Home.module.css';

const formatStat = (value) => {
  if (!value || Number.isNaN(value)) {
    return '--';
  }

  return value.toFixed(1);
};

const renderPlayerCard = (player, role, primaryLabel, primaryValue, secondaryLabel, secondaryValue, fallbackImage) => {
  if (!player) {
    return null;
  }

  return (
    <article key={`${role}-${player.id}`} className={styles.playerCard}>
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

  if (!team) {
    return null;
  }

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
            <span className={styles.selectedMeta}>Récord, líderes ofensivos y fotos de jugadores en la misma tarjeta.</span>
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
          </div>

          <div className={styles.playersPanel}>
            <div className={styles.playersPanelHeader}>
              <span className={styles.sectionEyebrow}>Referentes ofensivos</span>
              <p className={styles.playersPanelNote}>La selección incluye 1 QB, 2 receptores y 2 corredores para cubrir todo lo que pediste.</p>
            </div>

            <div className={styles.playersGrid}>
              {renderPlayerCard(
                snapshot.leaders.quarterback,
                'QB',
                'Pase YDS/J',
                snapshot.leaders.quarterback?.passingYardsPerGame,
                'Carrera YDS/J',
                snapshot.leaders.quarterback?.quarterbackRushingYardsPerGame,
                team.logo
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
