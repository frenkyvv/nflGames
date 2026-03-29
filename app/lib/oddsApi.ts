const API_BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl';
const FALLBACK_API_KEY = '68bf845edcc203a1af3e7e42b05df487';
const API_KEY = process.env.ODDS_API_KEY || FALLBACK_API_KEY;

type QueryParams = Record<string, string>;

async function requestOddsApi(path: string, params: QueryParams) {
  const url = new URL(`${API_BASE}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status} al consultar The Odds API.`);
  }

  return response.json();
}

export function getUpcomingEvents() {
  return requestOddsApi('events', {
    apiKey: API_KEY,
    dateFormat: 'iso',
  });
}

export function getUpcomingOdds(oddsFormat: 'decimal' | 'american' = 'decimal') {
  return requestOddsApi('odds', {
    apiKey: API_KEY,
    regions: 'us',
    markets: 'h2h,spreads',
    oddsFormat,
    dateFormat: 'iso',
  });
}
