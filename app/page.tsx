'use client'
import React, { useState } from 'react';
import UpcomingNFLGames from './componentes/UpcomingNFLGames.js';
import UpcomingOdds from './componentes/UpcomingOdds.js';
import Bet365Results from './componentes/Bet365Results.js';
import styles from './Home.module.css';
import nflTeams from './componentes/nflTeams.json';

const HomePage = () => {
  const [teamName, setTeamName] = useState("");
  const [submittedTeamName, setSubmittedTeamName] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [submittedEventId, setSubmittedEventId] = useState<string | null>(null);

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTeamName(e.target.value);
  };

  const handleTeamSubmit = () => {
    setSubmittedTeamName(teamName);
  };

  const handleEventIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventId(e.target.value);
  };

  const handleEventSubmit = () => {
    setSubmittedEventId(eventId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.titulo}>Juegos y Pronosticos</div>
      <div className={styles.inputBox}>
        <div className="input-group mb-3">
          <select
            className="form-select"
            value={teamName}
            onChange={handleTeamNameChange}
          >
            <option value="">Select Team</option>
            {nflTeams.map((team) => (
              <option key={team.apiName} value={team.apiName}>
                {team.shortName}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleTeamSubmit}>Submit</button>
        </div>
        <br />
      </div>
      {submittedTeamName && <UpcomingNFLGames team={submittedTeamName} />}
      {submittedTeamName && <UpcomingOdds team={submittedTeamName} />}
    </div>
  );
};

export default HomePage;
