import nflTeams from './nflTeams.json';

const teamMap = new Map(nflTeams.map((team) => [team.apiName, team]));
const teamTimeZoneMap = {
  ARI: 'America/Phoenix',
  ATL: 'America/New_York',
  BAL: 'America/New_York',
  BUF: 'America/New_York',
  CAR: 'America/New_York',
  CHI: 'America/Chicago',
  CIN: 'America/New_York',
  CLE: 'America/New_York',
  DAL: 'America/Chicago',
  DEN: 'America/Denver',
  DET: 'America/New_York',
  GB: 'America/Chicago',
  HOU: 'America/Chicago',
  IND: 'America/Indiana/Indianapolis',
  JAX: 'America/New_York',
  KC: 'America/Chicago',
  LV: 'America/Los_Angeles',
  LAC: 'America/Los_Angeles',
  LAR: 'America/Los_Angeles',
  MIA: 'America/New_York',
  MIN: 'America/Chicago',
  NE: 'America/New_York',
  NO: 'America/Chicago',
  NYG: 'America/New_York',
  NYJ: 'America/New_York',
  PHI: 'America/New_York',
  PIT: 'America/New_York',
  SF: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  TB: 'America/New_York',
  TEN: 'America/Chicago',
  WSH: 'America/New_York',
};

export const getTeamData = (teamName) => {
  if (!teamName) {
    return null;
  }

  return teamMap.get(teamName) ?? null;
};

export const getTeamTimeZone = (abbreviation) =>
  teamTimeZoneMap[String(abbreviation ?? '').toUpperCase()] ?? null;

export const formatGameTime = (dateString, timeZone) =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(dateString));

export const formatDecimalOdds = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return value.toFixed(2);
};

export const formatAmericanOdds = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) {
    return '--';
  }

  const roundedValue = Math.round(value);
  return roundedValue > 0 ? `+${roundedValue}` : `${roundedValue}`;
};

export const convertOddsToDecimal = (value, oddsFormat = 'decimal') => {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) {
    return null;
  }

  if (oddsFormat === 'american') {
    return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value);
  }

  return value;
};

export const formatOddsValue = (value, oddsFormat = 'decimal') =>
  oddsFormat === 'american'
    ? formatAmericanOdds(value)
    : formatDecimalOdds(value);

export const formatSpread = (point) => {
  if (typeof point !== 'number' || Number.isNaN(point)) {
    return '--';
  }

  if (point > 0) {
    return `+${point}`;
  }

  return `${point}`;
};

export const getImpliedProbability = (value, oddsFormat = 'decimal') => {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) {
    return null;
  }

  if (oddsFormat === 'american') {
    const probability =
      value > 0
        ? (100 / (value + 100)) * 100
        : (Math.abs(value) / (Math.abs(value) + 100)) * 100;

    return probability.toFixed(1);
  }

  return ((1 / value) * 100).toFixed(1);
};

export const findMarket = (bookmaker, key) =>
  bookmaker?.markets?.find((market) => market.key === key);

export const getOutcome = (market, teamName) =>
  market?.outcomes?.find((outcome) => outcome.name === teamName);

export const getBestPrice = (bookmakers = [], marketKey, teamName, oddsFormat = 'decimal') => {
  let bestPrice = null;

  for (const bookmaker of bookmakers) {
    const market = findMarket(bookmaker, marketKey);
    const outcome = getOutcome(market, teamName);

    if (!outcome || typeof outcome.price !== 'number') {
      continue;
    }

    const decimalPrice = convertOddsToDecimal(outcome.price, oddsFormat);

    if (decimalPrice === null) {
      continue;
    }

    if (!bestPrice || decimalPrice > bestPrice.decimalPrice) {
      bestPrice = {
        bookmaker: bookmaker.title,
        price: outcome.price,
        point: typeof outcome.point === 'number' ? outcome.point : null,
        decimalPrice,
      };
    }
  }

  return bestPrice;
};
