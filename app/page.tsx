'use client'

import Image from 'next/image';
import React, { useState } from 'react';
import UpcomingNFLGames from './componentes/UpcomingNFLGames';
import UpcomingOdds from './componentes/UpcomingOdds';
import styles from './Home.module.css';
import nflTeams from './componentes/nflTeams.json';
import { getTeamData } from './componentes/teamUtils';

const HomePage = () => {
  const [teamName, setTeamName] = useState('');
  const [submittedTeamName, setSubmittedTeamName] = useState<string | null>(null);

  const previewTeam = getTeamData(submittedTeamName ?? teamName);
  const pageTheme = {
    '--selected-primary': previewTeam?.primaryColor ?? '#16324f',
    '--selected-secondary': previewTeam?.secondaryColor ?? '#d97706',
    '--selected-accent': previewTeam?.accentColor ?? '#f2d7a1',
  } as React.CSSProperties;

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
          <h1 className={styles.title}>Partidos NFL con cuotas decimales y una vista mucho mas clara</h1>
          <p className={styles.description}>
            Elige tu equipo y revisa los proximos juegos, moneyline en formato decimal y spreads por casa de apuestas en un tablero mas visual.
          </p>

          <div className={styles.statRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Formato</span>
              <strong className={styles.statValue}>Decimal</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Equipos</span>
              <strong className={styles.statValue}>{nflTeams.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Vista</span>
              <strong className={styles.statValue}>{submittedTeamName ? previewTeam?.shortName ?? 'Activa' : 'Selecciona uno'}</strong>
            </div>
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
              <Image
                className={styles.selectedLogo}
                src={previewTeam.logo}
                alt={previewTeam.apiName}
                width={68}
                height={68}
                sizes="68px"
              />
              <div className={styles.selectedTeamIdentity}>
                <span className={styles.selectedLabel}>Equipo activo</span>
                <strong className={styles.selectedName}>{previewTeam.apiName}</strong>
                <span className={styles.selectedMeta}>Colores, logo y tarjetas personalizadas para tu seleccion.</span>
              </div>
            </div>
          ) : (
            <div className={styles.helperCard}>
              <strong className={styles.helperTitle}>Empieza con cualquier franquicia</strong>
              <p className={styles.helperCopy}>
                Vas a ver los siguientes partidos del equipo, sus cuotas decimales y spreads en una interfaz mas limpia para revisar rapido.
              </p>
            </div>
          )}
        </section>
      </div>

      {submittedTeamName ? (
        <div className={styles.contentStack}>
          <UpcomingNFLGames team={submittedTeamName} />
          <UpcomingOdds team={submittedTeamName} />
        </div>
      ) : (
        <section className={styles.emptyState}>
          <span className={styles.sectionEyebrow}>Listo para explorar</span>
          <h2 className={styles.emptyTitle}>Selecciona un equipo para cargar su calendario y sus cuotas</h2>
          <p className={styles.emptyCopy}>
            La nueva vista convierte las cuotas americanas a decimal directamente desde la API y agrega logos por equipo para que todo sea mucho mas facil de leer.
          </p>
        </section>
      )}
    </main>
  );
};

export default HomePage;
