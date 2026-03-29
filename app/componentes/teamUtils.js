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
