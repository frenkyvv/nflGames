'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import UpcomingNFLGames from './componentes/UpcomingNFLGames';
import UpcomingOdds from './componentes/UpcomingOdds';
import TeamSnapshot from './componentes/TeamSnapshot';
import styles from './Home.module.css';
import nflTeams from './componentes/nflTeams.json';
import { getTeamData } from './componentes/teamUtils';

type GroupStandingRow = {
  position: number;
  abbreviation: string | null;
  shortDisplayName: string;
  logo: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  isSelected: boolean;
};

type OddsFormat = 'decimal' | 'american';

type TeamProfileSummary = {
  groupStanding?: {
    name: string;
    abbreviation: string | null;
    conferenceName: string | null;
    selectedPosition: number | null;
    rows: GroupStandingRow[];
  } | null;
};

const HomePage = () => {
  const [teamName, setTeamName] = useState('');
  const [submittedTeamName, setSubmittedTeamName] = useState<string | null>(null);
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal');
  const [teamProfile, setTeamProfile] = useState<TeamProfileSummary | null>(null);
  const [teamProfileLoading, setTeamProfileLoading] = useState(false);
  const [teamProfileError, setTeamProfileError] = useState<string | null>(null);

  const submittedTeam = submittedTeamName ? getTeamData(submittedTeamName) : null;
  const previewTeam = getTeamData(submittedTeamName ?? teamName);
  const pageTheme = {
    '--selected-primary': previewTeam?.primaryColor ?? '#16324f',
    '--selected-secondary': previewTeam?.secondaryColor ?? '#d97706',
    '--selected-accent': previewTeam?.accentColor ?? '#f2d7a1',
  } as React.CSSProperties;
  const oddsFormatLabel = oddsFormat === 'american' ? 'Americano' : 'Decimal';

  useEffect(() => {
    if (!submittedTeam?.abbreviation) {
      setTeamProfile(null);
      setTeamProfileError(null);
      setTeamProfileLoading(false);
      return;
    }

    let cancelled = false;

    const loadTeamProfile = async () => {
      try {
        setTeamProfileLoading(true);
        setTeamProfileError(null);
        setTeamProfile(null);

        const response = await fetch(
          `/api/team-profile/${submittedTeam.abbreviation.toLowerCase()}`
        );

        if (response.ok === false) {
          throw new Error('No pude cargar la tabla del grupo.');
        }

        const data = (await response.json()) as TeamProfileSummary;

        if (cancelled === false) {
          setTeamProfile(data);
        }
      } catch (fetchError) {
        if (cancelled === false) {
          setTeamProfile(null);
          setTeamProfileError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No pude cargar la tabla del grupo.'
          );
        }
      } finally {
        if (cancelled === false) {
          setTeamProfileLoading(false);
        }
      }
    };

    loadTeamProfile();

    return () => {
      cancelled = true;
    };
  }, [submittedTeam?.abbreviation]);

  const activeGroupStanding = teamProfile?.groupStanding ?? null;

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTeamName(e.target.value);
  };

  const handleTeamSubmit = () => {
    setSubmittedTeamName(teamName);
  };

  return (
    <main className={styles.page} style={pageTheme}>
      <div className={styles.hero}>
        <section className={styles.heroPanel}>
          <span className={styles.kicker}>NFL Odds Dashboard</span>
          <h1 className={styles.title}>Herramienta de estadisticas NFL</h1>
          <p className={styles.description}>
            Elige tu equipo y revisa los proximos juegos, moneyline en formato {oddsFormat === 'american' ? 'americano' : 'decimal'} y spreads por casa de apuestas en un tablero mas visual.
          </p>

          <div className={styles.statRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Formato</span>
              <strong className={`${styles.statValue} ${styles.statFormatValue}`}>{oddsFormatLabel}</strong>
              <div className={styles.formatToggle}>
                <button
                  type="button"
                  className={`${styles.formatToggleButton} ${
                    oddsFormat === 'decimal' ? styles.formatToggleButtonActive : ''
                  }`}
                  onClick={() => setOddsFormat('decimal')}
                >
                  Decimal
                </button>
                <button
                  type="button"
                  className={`${styles.formatToggleButton} ${
                    oddsFormat === 'american' ? styles.formatToggleButtonActive : ''
                  }`}
                  onClick={() => setOddsFormat('american')}
                >
                  Americano
                </button>
              </div>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Equipos</span>
              <strong className={styles.statValue}>{nflTeams.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Vista</span>
              <div className={styles.statViewValue}>
                {previewTeam ? (
                  <Image
                    className={styles.statTeamLogo}
                    src={previewTeam.logo}
                    alt={previewTeam.apiName}
                    width={22}
                    height={22}
                    sizes="22px"
                  />
                ) : null}
                <strong className={styles.statValue}>
                  {previewTeam?.shortName ?? 'Selecciona uno'}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.groupStandingsCard}>
            <div className={styles.groupStandingsHeader}>
              <div>
                <span className={styles.groupStandingsEyebrow}>Grupo del equipo</span>
                <strong className={styles.groupStandingsTitle}>
                  {activeGroupStanding?.name ?? 'Tabla divisional'}
                </strong>
                <p className={styles.groupStandingsCopy}>
                  {submittedTeamName
                    ? 'Posicion en la tabla del equipo elegido con JJ, ganados y perdidos de su grupo.'
                    : 'Selecciona un equipo para ver la posicion dentro de su grupo y una tabla rapida de la division.'}
                </p>
              </div>

              {activeGroupStanding?.selectedPosition ? (
                <div className={styles.groupStandingsSpotlight}>
                  <span className={styles.groupStandingsSpotlightLabel}>Posicion actual</span>
                  <strong className={styles.groupStandingsSpotlightValue}>
                    #{activeGroupStanding.selectedPosition}
                  </strong>
                  <span className={styles.groupStandingsSpotlightMeta}>
                    {activeGroupStanding.conferenceName ?? 'NFL'}
                  </span>
                </div>
              ) : null}
            </div>

            {teamProfileLoading ? (
              <div className={styles.groupStandingsState}>
                Cargando la tabla del grupo del equipo seleccionado...
              </div>
            ) : null}

            {teamProfileLoading === false && teamProfileError ? (
              <div className={styles.groupStandingsState}>{teamProfileError}</div>
            ) : null}

            {teamProfileLoading === false &&
            teamProfileError === null &&
            activeGroupStanding ? (
              <div className={styles.groupStandingsTable}>
                <div className={`${styles.groupStandingsRow} ${styles.groupStandingsHeaderRow}`}>
                  <span>Equipo</span>
                  <span>JJ</span>
                  <span>G</span>
                  <span>P</span>
                </div>

                {[...activeGroupStanding.rows]
                  .sort((left, right) => left.position - right.position)
                  .map((row) => (
                  <div
                    key={row.abbreviation ?? row.shortDisplayName}
                    className={`${styles.groupStandingsRow} ${
                      row.isSelected ? styles.groupStandingsRowSelected : ''
                    }`}
                  >
                    <div className={styles.groupStandingsTeam}>
                      {row.logo ? (
                        <Image
                          className={styles.groupStandingsTeamLogo}
                          src={row.logo}
                          alt={row.shortDisplayName}
                          width={24}
                          height={24}
                          sizes="24px"
                        />
                      ) : null}
                      <span className={styles.groupStandingsTeamName}>
                        {row.shortDisplayName}
                      </span>
                    </div>
                    <span>{row.gamesPlayed}</span>
                    <span>{row.wins}</span>
                    <span>{row.losses}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {teamProfileLoading === false &&
            teamProfileError === null &&
            submittedTeamName &&
            activeGroupStanding === null ? (
              <div className={styles.groupStandingsState}>
                Esta tabla aparecera cuando ESPN publique standings disponibles para el grupo del equipo.
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.selectorPanel}>
          <label className={styles.formLabel} htmlFor="team-select">
            Equipo
          </label>
          <div className={styles.selectRow}>
            <select
              id="team-select"
              className={styles.select}
              value={teamName}
              onChange={handleTeamNameChange}
            >
              <option value="">Selecciona un equipo</option>
              {nflTeams.map((team) => (
                <option key={team.apiName} value={team.apiName}>
                  {team.apiName}
                </option>
              ))}
            </select>
            <button
              className={styles.primaryButton}
              onClick={handleTeamSubmit}
              disabled={teamName === ''}
            >
              Ver juegos
            </button>
          </div>

          {previewTeam ? (
            <div className={styles.selectedTeamCard}>
              <TeamSnapshot team={previewTeam} />
            </div>
          ) : (
            <div className={styles.helperCard}>
              <strong className={styles.helperTitle}>Empieza con cualquier franquicia</strong>
              <p className={styles.helperCopy}>
                Vas a ver los siguientes partidos del equipo, sus cuotas en formato decimal o americano y spreads en una interfaz mas limpia para revisar rapido.
              </p>
            </div>
          )}
        </section>
      </div>

      {submittedTeamName ? (
        <div className={styles.contentStack}>
          <UpcomingNFLGames team={submittedTeamName} />
          <UpcomingOdds team={submittedTeamName} oddsFormat={oddsFormat} />
        </div>
      ) : (
        <section className={styles.emptyState}>
          <span className={styles.sectionEyebrow}>Listo para explorar</span>
          <h2 className={styles.emptyTitle}>Selecciona un equipo para cargar su calendario y sus cuotas</h2>
          <p className={styles.emptyCopy}>
            La nueva vista te deja cambiar entre cuotas decimales y americanas, ademas de agregar logos por equipo para que todo sea mucho mas facil de leer.
          </p>
        </section>
      )}
    </main>
  );
};

export default HomePage;
