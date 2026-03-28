const ESPN_SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_COMMON_BASE = 'https://site.api.espn.com/apis/common/v3/sports/football/nfl';

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

const toNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(String(value).replace(/,/g, ''));
};

const roundToSingleDecimal = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
};

const getCategoryByName = (categories = [], categoryName) =>
  categories.find((category) => category.name === categoryName);

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

export const getEspnTeamProfile = async (abbreviation) => {
  const normalizedAbbreviation = abbreviation.toLowerCase();

  const [scheduleData, rosterData] = await Promise.all([
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}/schedule`),
    fetchEspnJson(`${ESPN_SITE_BASE}/teams/${normalizedAbbreviation}/roster`),
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

  return {
    team: {
      id: teamId,
      abbreviation: scheduleData.team?.abbreviation,
      displayName: scheduleData.team?.displayName,
      recordSummary: scheduleData.team?.recordSummary ?? '--',
      standingSummary: scheduleData.team?.standingSummary ?? 'Sin standing disponible',
      seasonSummary,
    },
    leaders: {
      quarterback,
      receivers,
      rushers,
    },
  };
};
