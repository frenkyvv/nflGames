const ESPN_SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_COMMON_BASE = 'https://site.api.espn.com/apis/common/v3/sports/football/nfl';
const ESPN_WEB_BASE = 'https://site.web.api.espn.com/apis/v2/sports/football/nfl';

const RELEVANT_POSITIONS = ['QB', 'RB', 'FB', 'WR', 'TE'];
const RECEIVER_POSITIONS = ['WR', 'TE'];
const RUSHER_POSITIONS = ['RB', 'FB'];

const fetchEspnJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    next: {
      revalidate: 21600,
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo consultar ESPN (${response.status}).`);
  }

  return response.json();
};

const getEventStatusType = (event) =>
  event?.competitions?.[0]?.status?.type ?? event?.status?.type ?? null;

const isCompletedEvent = (event) => {
  const statusType = getEventStatusType(event);
  return statusType?.completed === true || statusType?.state === 'post';
};

const getCompetitorScore = (competitor) =>
  toNumber(
    competitor?.score?.value ??
      competitor?.score?.displayValue ??
      competitor?.score ??
      0
  );

const toNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(String(value).replace(/,/g, ''));
};

const getCategoryByName = (categories = [], categoryName) =>
  categories.find((category) => category.name === categoryName);

const getStatByName = (stats = [], statName) =>
  stats.find((stat) => stat.name === statName || stat.type === statName) ?? null;

const getLatestTeamStatRecord = (category, teamId) => {
  if (!category?.statistics) {
    return null;
  }

  return category.statistics
    .filter((entry) => entry.teamId === teamId)
    .sort((left, right) => right.season.year - left.season.year)[0] ?? null;
};

const mapCategoryStats = (category, record) => {
  if (!category || !record?.stats) {
    return {};
  }

  return category.names.reduce((accumulator, statName, index) => {
    accumulator[statName] = toNumber(record.stats[index]);
    return accumulator;
  }, {});
};

const mapRosterPlayer = (player) => ({
  id: player.id,
  fullName: player.displayName,
  jersey: player.jersey ?? '--',
  position: player.position?.abbreviation ?? 'ATH',
  headshot: player.headshot?.href ?? null,
});

const loadPlayerSnapshot = async (player, teamId) => {
  const data = await fetchEspnJson(
    `${ESPN_COMMON_BASE}/athletes/${player.id}/stats`
  );

  const passingCategory = getCategoryByName(data.categories, 'passing');
  const rushingCategory = getCategoryByName(data.categories, 'rushing');
  const receivingCategory = getCategoryByName(data.categories, 'receiving');

  const passingRecord = getLatestTeamStatRecord(passingCategory, teamId);
  const rushingRecord = getLatestTeamStatRecord(rushingCategory, teamId);
  const receivingRecord = getLatestTeamStatRecord(receivingCategory, teamId);

  const passingStats = mapCategoryStats(passingCategory, passingRecord);
  const rushingStats = mapCategoryStats(rushingCategory, rushingRecord);
  const receivingStats = mapCategoryStats(receivingCategory, receivingRecord);

  const passingGames = passingStats.gamesPlayed || 0;
  const rushingGames = rushingStats.gamesPlayed || 0;
  const receivingGames = receivingStats.gamesPlayed || 0;

  return {
    ...player,
    season: Math.max(
      passingRecord?.season?.year ?? 0,
      rushingRecord?.season?.year ?? 0,
      receivingRecord?.season?.year ?? 0
    ),
    passingYardsPerGame:
      passingGames > 0
        ? roundToSingleDecimal(passingStats.passingYards / passingGames)
        : 0,
    passingYards: passingStats.passingYards || 0,
    quarterbackRushingYardsPerGame:
      rushingGames > 0
        ? roundToSingleDecimal(rushingStats.rushingYards / rushingGames)
        : 0,
    rushingYardsPerGame:
      rushingGames > 0
        ? roundToSingleDecimal(rushingStats.rushingYards / rushingGames)
        : 0,
    rushingYards: rushingStats.rushingYards || 0,
    receivingYardsPerGame:
      receivingGames > 0
        ? roundToSingleDecimal(receivingStats.receivingYards / receivingGames)
        : 0,
    receivingYards: receivingStats.receivingYards || 0,
  };
};

const roundToSingleDecimal = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
};

const pickQuarterback = (players) =>
  players
    .filter((player) => player.position === 'QB' && player.passingYardsPerGame > 0)
    .sort((left, right) => right.passingYardsPerGame - left.passingYardsPerGame)[0] ?? null;

const pickReceivers = (players) =>
  players
    .filter(
      (player) =>
        RECEIVER_POSITIONS.includes(player.position) &&
        player.receivingYardsPerGame > 0
    )
    .sort(
      (left, right) =>
        right.receivingYardsPerGame - left.receivingYardsPerGame
    )
    .slice(0, 2);

const pickRushers = (players) => {
  const naturalRushers = players
    .filter(
      (player) =>
        RUSHER_POSITIONS.includes(player.position) &&
        player.rushingYardsPerGame > 0
    )
    .sort((left, right) => right.rushingYardsPerGame - left.rushingYardsPerGame)
    .slice(0, 2);

  if (naturalRushers.length === 2) {
    return naturalRushers;
  }

  const fallbackRushers = players
    .filter(
      (player) =>
        player.position !== 'QB' &&
        player.rushingYardsPerGame > 0 &&
        !naturalRushers.some((selectedPlayer) => selectedPlayer.id === player.id)
    )
    .sort((left, right) => right.rushingYardsPerGame - left.rushingYardsPerGame)
    .slice(0, 2 - naturalRushers.length);

  return naturalRushers.concat(fallbackRushers);
};

const mapGroupStandingRow = (entry, index, selectedAbbreviation) => {
  const wins = toNumber(getStatByName(entry.stats, 'wins')?.value);
  const losses = toNumber(getStatByName(entry.stats, 'losses')?.value);
  const ties = toNumber(getStatByName(entry.stats, 'ties')?.value);
  const winPct = toNumber(getStatByName(entry.stats, 'winPercent')?.value ?? getStatByName(entry.stats, 'pct')?.value);

  return {
    position: index + 1,
    teamId: entry.team?.id ?? null,
    abbreviation: entry.team?.abbreviation ?? null,
    displayName: entry.team?.displayName ?? 'Equipo',
    shortDisplayName: entry.team?.shortDisplayName ?? entry.team?.name ?? 'Equipo',
    logo: entry.team?.logos?.[0]?.href ?? null,
    gamesPlayed: wins + losses + ties,
    wins,
    losses,
    ties,
    winPct: wins + losses + ties > 0
      ? `${((wins / (wins + losses + (ties * 0.5))) * 100).toFixed(1)}%`
      : '--',
    isSelected:
      entry.team?.abbreviation?.toLowerCase() === selectedAbbreviation.toLowerCase(),
  };
};

const mapConferenceStandingRow = (entry, index, selectedAbbreviation) => {
  const wins = toNumber(getStatByName(entry.stats, 'wins')?.value);
  const losses = toNumber(getStatByName(entry.stats, 'losses')?.value);
  const ties = toNumber(getStatByName(entry.stats, 'ties')?.value);
  const overallWins = toNumber(getStatByName(entry.stats, 'totalWins')?.value ?? getStatByName(entry.stats, 'wins')?.value);
  const overallLosses = toNumber(getStatByName(entry.stats, 'totalLosses')?.value ?? getStatByName(entry.stats, 'losses')?.value);
  const overallTies = toNumber(getStatByName(entry.stats, 'totalTies')?.value ?? getStatByName(entry.stats, 'ties')?.value);

  return {
    position: index + 1,
    teamId: entry.team?.id ?? null,
    abbreviation: entry.team?.abbreviation ?? null,
    displayName: entry.team?.displayName ?? 'Equipo',
    shortDisplayName: entry.team?.shortDisplayName ?? entry.team?.name ?? 'Equipo',
    logo: entry.team?.logos?.[0]?.href ?? null,
    gamesPlayed: overallWins + overallLosses + overallTies,
    wins: overallWins,
    losses: overallLosses,
    ties: overallTies,
    winPct: overallWins + overallLosses + overallTies > 0
      ? `${((overallWins / (overallWins + overallLosses + (overallTies * 0.5))) * 100).toFixed(1)}%`
      : '--',
    isSelected:
      entry.team?.abbreviation?.toLowerCase() === selectedAbbreviation.toLowerCase(),
  };
};

const loadGroupStanding = async (groupId, selectedAbbreviation) => {
  if (!groupId) {
    return null;
  }

  const data = await fetchEspnJson(`${ESPN_WEB_BASE}/standings?group=${groupId}`);
  const rows = (data.standings?.entries ?? []).map((entry, index) =>
    mapGroupStandingRow(entry, index, selectedAbbreviation)
  );

  if (rows.length === 0) {
    return null;
  }

  const selectedRow = rows.find((row) => row.isSelected);

  return {
    name: data.name ?? 'Grupo',
    abbreviation: data.abbreviation ?? null,
    conferenceName: data.parent?.abbreviation ?? null,
    selectedPosition: selectedRow?.position ?? null,
    rows,
  };
};

const loadConferenceStanding = async (conferenceGroupId, selectedAbbreviation) => {
  if (!conferenceGroupId) {
    return null;
  }

  const data = await fetchEspnJson(`${ESPN_WEB_BASE}/standings?group=${conferenceGroupId}`);

  const rows = (data.children ?? []).flatMap((division) =>
    (division.standings?.entries ?? []).map((entry, index) =>
      mapConferenceStandingRow(entry, index, selectedAbbreviation)
    )
  );

  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const repositioned = sorted.map((row, index) => ({ ...row, position: index + 1 }));
  const selectedRow = repositioned.find((row) => row.isSelected);

  return {
    name: data.name ?? 'Conferencia',
    abbreviation: data.abbreviation ?? null,
    selectedPosition: selectedRow?.position ?? null,
    rows: repositioned,
  };
};

const getSeasonStageLabel = (event) => {
  const haystack = [
    event.season?.slug,
    event.season?.displayName,
    event.seasonType?.name,
    event.seasonType?.displayName,
    event.type?.name,
    event.type?.abbreviation,
    event.name,
    event.shortName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('pre') || haystack.includes('preseason')) {
    return 'Pretemporada';
  }

  if (
    haystack.includes('playoff') ||
    haystack.includes('playoffs') ||
    haystack.includes('postseason') ||
    haystack.includes('wild card') ||
    haystack.includes('divisional') ||
    haystack.includes('championship') ||
    haystack.includes('super bowl')
  ) {
    return 'Playoffs';
  }

  return 'Temporada regular';
};

const mapUpcomingGame = (event, selectedAbbreviation) => {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];

  if (!competition || competitors.length < 2) {
    return null;
  }

  const homeTeam = competitors.find((competitor) => competitor.homeAway === 'home');
  const awayTeam = competitors.find((competitor) => competitor.homeAway === 'away');

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const isHome =
    homeTeam.team?.abbreviation?.toLowerCase() === selectedAbbreviation.toLowerCase();
  const opponent = isHome ? awayTeam.team : homeTeam.team;

  return {
    id: event.id,
    date: event.date,
    isHome,
    venueName: competition.venue?.fullName ?? null,
    venueCity: competition.venue?.address?.city ?? null,
    venueState: competition.venue?.address?.state ?? null,
    statusDetail: event.status?.type?.shortDetail ?? null,
    opponentDisplayName: opponent?.displayName ?? 'Rival',
    opponentShortName: opponent?.shortDisplayName ?? opponent?.name ?? 'Rival',
    opponentAbbreviation: opponent?.abbreviation ?? null,
    opponentLogo: opponent?.logos?.[0]?.href ?? null,
    homeTeam: homeTeam.team?.displayName ?? null,
    awayTeam: awayTeam.team?.displayName ?? null,
    seasonStage: getSeasonStageLabel(event),
    week: event.week?.number ?? null,
  };
};

const mapCompletedGame = (event, selectedAbbreviation) => {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];

  if (!competition || competitors.length < 2) {
    return null;
  }

  const homeTeam = competitors.find((competitor) => competitor.homeAway === 'home');
  const awayTeam = competitors.find((competitor) => competitor.homeAway === 'away');

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const isHome =
    homeTeam.team?.abbreviation?.toLowerCase() === selectedAbbreviation.toLowerCase();
  const selectedCompetitor = isHome ? homeTeam : awayTeam;
  const opponentCompetitor = isHome ? awayTeam : homeTeam;
  const selectedScore = getCompetitorScore(selectedCompetitor);
  const opponentScore = getCompetitorScore(opponentCompetitor);

  return {
    id: event.id,
    date: event.date,
    isHome,
    opponentDisplayName: opponentCompetitor.team?.displayName ?? 'Rival',
    opponentShortName:
      opponentCompetitor.team?.shortDisplayName ??
      opponentCompetitor.team?.name ??
      'Rival',
    opponentAbbreviation: opponentCompetitor.team?.abbreviation ?? null,
    opponentLogo: opponentCompetitor.team?.logos?.[0]?.href ?? null,
    selectedScore,
    opponentScore,
    selectedWon: selectedScore > opponentScore,
    pointDiff: selectedScore - opponentScore,
    venueName: competition.venue?.fullName ?? null,
    statusDetail:
      competition.status?.type?.shortDetail ??
      event.status?.type?.shortDetail ??
      null,
    seasonStage: getSeasonStageLabel(event),
    homeTeam: homeTeam.team?.displayName ?? null,
    awayTeam: awayTeam.team?.displayName ?? null,
    week: event.week?.number ?? null,
  };
};

export const getEspnTeamProfile = async (abbreviation) => {
  const normalizedAbbreviation = abbreviation.toLowerCase();

  const [scheduleData, postseasonScheduleData, rosterData, teamData] = await Promise.all([
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}/schedule`),
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}/schedule?seasontype=3`).catch(
      () => ({ events: [] })
    ),
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}/roster`),
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}`),
  ]);

  const teamId = scheduleData.team?.id;
  const seasonSummary = scheduleData.team?.seasonSummary ?? String(scheduleData.season?.year ?? '');
  const offenseGroup = rosterData.athletes?.find(
    (group) => group.position === 'offense'
  );
  const skillPlayers = (offenseGroup?.items ?? [])
    .filter((player) => RELEVANT_POSITIONS.includes(player.position?.abbreviation))
    .map(mapRosterPlayer);

  const playerSnapshots = (
    await Promise.allSettled(
      skillPlayers.map((player) => loadPlayerSnapshot(player, teamId))
    )
  )
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  const quarterback = pickQuarterback(playerSnapshots);
  const receivers = pickReceivers(playerSnapshots);
  const rushers = pickRushers(playerSnapshots);

  const conferenceGroupId = teamData.team?.groups?.parent?.id;
  const divisionGroupId = teamData.team?.groups?.id;

  const [groupStanding, conferenceStanding] = await Promise.all([
    loadGroupStanding(divisionGroupId, normalizedAbbreviation).catch(() => null),
    loadConferenceStanding(conferenceGroupId, normalizedAbbreviation).catch(() => null),
  ]);

  const allEvents = [
    ...(scheduleData.events ?? []),
    ...(postseasonScheduleData.events ?? []),
  ].filter(
    (event, index, events) =>
      events.findIndex((candidate) => candidate.id === event.id) === index
  );

  const nextGames = allEvents
    .filter((event) => !isCompletedEvent(event) && new Date(event.date).getTime() >= Date.now())
    .map((event) => mapUpcomingGame(event, normalizedAbbreviation))
    .filter(Boolean)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const completedGames = allEvents
    .filter((event) => isCompletedEvent(event))
    .map((event) => mapCompletedGame(event, normalizedAbbreviation))
    .filter(Boolean)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 10);

  const selectedConferenceRow = conferenceStanding?.rows?.find((row) => row.isSelected) ?? null;
  const selectedDivisionRow = groupStanding?.rows?.find((row) => row.isSelected) ?? null;

  return {
    team: {
      id: teamId,
      abbreviation: scheduleData.team?.abbreviation,
      displayName: scheduleData.team?.displayName,
      shortDisplayName: scheduleData.team?.shortDisplayName ?? scheduleData.team?.name,
      recordSummary: scheduleData.team?.recordSummary ?? '--',
      standingSummary: scheduleData.team?.standingSummary ?? 'Sin standing disponible',
      seasonSummary,
      venueName: teamData.team?.franchise?.venue?.fullName ?? null,
      venueCity: teamData.team?.franchise?.venue?.address?.city ?? null,
      venueState: teamData.team?.franchise?.venue?.address?.state ?? null,
      conferenceName: conferenceStanding?.name ?? teamData.team?.groups?.parent?.name ?? null,
      divisionName: groupStanding?.name ?? teamData.team?.groups?.name ?? null,
      divisionPosition: selectedDivisionRow?.position ?? null,
      conferencePosition: selectedConferenceRow?.position ?? null,
    },
    groupStanding,
    conferenceStanding,
    leaders: {
      quarterback,
      receivers,
      rushers,
    },
    nextGames,
    completedGames,
  };
};
