import nflTeams from './nflTeams.json';

const teamMap = new Map(nflTeams.map((team) => [team.apiName, team]));

export const getTeamData = (teamName) => {
  if (!teamName) {
    return null;
  }

  return teamMap.get(teamName) ?? null;
};

export const formatGameTime = (dateString) =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

export const formatDecimalOdds = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return value.toFixed(2);
};

export const formatSpread = (point) => {
  if (typeof point !== 'number' || Number.isNaN(point)) {
    return '--';
  }

  if (point > 0) {
    return `+${point}`;
  }

  return `${point}`;
};

export const getImpliedProbability = (value) => {
  if (typeof value !== 'number' || value <= 0) {
    return null;
  }

  return ((1 / value) * 100).toFixed(1);
};

export const findMarket = (bookmaker, key) =>
  bookmaker?.markets?.find((market) => market.key === key);

export const getOutcome = (market, teamName) =>
  market?.outcomes?.find((outcome) => outcome.name === teamName);

export const getBestPrice = (bookmakers = [], marketKey, teamName) => {
  let bestPrice = null;

  for (const bookmaker of bookmakers) {
    const market = findMarket(bookmaker, marketKey);
    const outcome = getOutcome(market, teamName);

    if (!outcome || typeof outcome.price !== 'number') {
      continue;
    }

    if (!bestPrice || outcome.price > bestPrice.price) {
      bestPrice = {
        bookmaker: bookmaker.title,
        price: outcome.price,
        point: typeof outcome.point === 'number' ? outcome.point : null,
      };
    }
  }

  return bestPrice;
};
