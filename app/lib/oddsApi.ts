const THE_ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl';
const ESPN_SCOREBOARD_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const FALLBACK_API_KEY = '68bf845edcc203a1af3e7e42b05df487';
const THE_ODDS_API_KEY = process.env.ODDS_API_KEY || FALLBACK_API_KEY;

type QueryParams = Record<string, string>;

export type OddsFormat = 'decimal' | 'american';

export type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
};

export type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

export type OddsBookmaker = {
  key: string;
  title: string;
  markets: OddsMarket[];
};

export type OddsEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsBookmaker[];
  source?: string;
};

export type ScoreEntry = {
  name: string;
  score: string;
};

export type ScoreEvent = {
  id: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores?: ScoreEntry[];
  last_update?: string;
  status_text?: string;
  status_short?: string;
  source?: string;
};

export type FeaturedGame = {
  id: string;
  date: string;
  home_team: string;
  away_team: string;
  status_text?: string;
  status_short?: string;
  slate_label: string;
  source?: string;
};

type EspnTeam = {
  displayName?: string;
  name?: string;
  abbreviation?: string;
  logos?: { href: string }[];
};

type EspnCompetitor = {
  homeAway?: 'home' | 'away' | string;
  score?: string | { displayValue?: string; value?: number };
  team?: EspnTeam;
};

type EspnCompetition = {
  competitors?: EspnCompetitor[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
      detail?: string;
      shortDetail?: string;
    };
  };
  venue?: {
    fullName?: string;
    address?: { city?: string; state?: string };
  };
};

type EspnEvent = {
  id: string;
  date: string;
  competitions?: EspnCompetition[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
      detail?: string;
      shortDetail?: string;
    };
  };
  week?: { number?: number };
};

type EspnScoreboardResponse = {
  events?: EspnEvent[];
};

const APP_TIME_ZONE = 'America/Monterrey';

const getZonedDateString = (date: Date, timeZone: string = APP_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
};

const addDaysToDateString = (dateString: string, daysToAdd: number) => {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
};

const formatSlateLabel = (dateString: string, isToday: boolean) => {
  if (isToday) {
    return 'hoy';
  }

  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(`${dateString}T12:00:00Z`));
};

async function requestOddsApi(path: string, params: QueryParams) {
  const url = new URL(`${THE_ODDS_API_BASE}/${path}`);

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

async function requestEspnScoreboard(date?: string): Promise<EspnScoreboardResponse> {
  const url = new URL(ESPN_SCOREBOARD_BASE);

  if (date) {
    url.searchParams.set('dates', date.replace(/-/g, ''));
  }

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar ESPN.`);
  }

  return response.json();
}

const getCompetitorScore = (competitor: EspnCompetitor): string => {
  const score = competitor?.score;

  if (typeof score === 'object' && score !== null) {
    return score.displayValue ?? String(score.value ?? '0');
  }

  return String(score ?? '0');
};

async function getEspnOddsFallback(
  oddsFormat: OddsFormat = 'decimal',
  dates: string[] = []
) {
  const uniqueDates =
    dates.length > 0
      ? [...new Set(dates)]
      : [new Date().toISOString().slice(0, 10)];
  const responses = await Promise.all(uniqueDates.map((date) => requestEspnScoreboard(date)));

  return responses
    .flatMap((response) => response.events ?? [])
    .map((event): OddsEvent | null => {
      const competition = event.competitions?.[0];
      const homeCompetitor = competition?.competitors?.find(
        (competitor) => competitor.homeAway === 'home'
      );
      const awayCompetitor = competition?.competitors?.find(
        (competitor) => competitor.homeAway === 'away'
      );

      if (!homeCompetitor || !awayCompetitor) {
        return null;
      }

      return {
        id: event.id,
        commence_time: event.date,
        home_team: homeCompetitor.team?.displayName ?? homeCompetitor.team?.name ?? 'Home',
        away_team: awayCompetitor.team?.displayName ?? awayCompetitor.team?.name ?? 'Away',
        bookmakers: [],
        source: 'ESPN',
      };
    })
    .filter(Boolean) as OddsEvent[];
}

export async function getEspnScoresFallback(): Promise<ScoreEvent[]> {
  const response = await requestEspnScoreboard();

  return (response.events ?? []).map((event) => {
    const competition = event.competitions?.[0];
    const statusState = competition?.status?.type?.state ?? event.status?.type?.state ?? 'pre';
    const isCompleted = Boolean(
      competition?.status?.type?.completed ?? event.status?.type?.completed
    );
    const competitors = competition?.competitors ?? [];
    const scores =
      statusState === 'pre'
        ? []
        : competitors.map((competitor) => ({
            name: competitor.team?.displayName ?? competitor.team?.name ?? 'Equipo',
            score: getCompetitorScore(competitor),
          }));

    return {
      id: event.id,
      commence_time: event.date,
      completed: isCompleted,
      home_team:
        competitors.find((competitor) => competitor.homeAway === 'home')?.team
          ?.displayName ?? 'Home Team',
      away_team:
        competitors.find((competitor) => competitor.homeAway === 'away')?.team
          ?.displayName ?? 'Away Team',
      scores,
      last_update: undefined,
      status_text:
        competition?.status?.type?.detail ?? event.status?.type?.detail ?? undefined,
      status_short:
        competition?.status?.type?.shortDetail ?? event.status?.type?.shortDetail ?? undefined,
      source: 'ESPN',
    } satisfies ScoreEvent;
  });
}

export async function getCurrentScores(): Promise<ScoreEvent[]> {
  try {
    return await getEspnScoresFallback();
  } catch {
    try {
      const response = (await requestOddsApi('scores', {
        apiKey: THE_ODDS_API_KEY,
        daysFrom: '1',
        dateFormat: 'iso',
      })) as ScoreEvent[];

      return Array.isArray(response)
        ? response.map((event) => ({
            ...event,
            status_text: event.completed ? 'Final' : 'En vivo',
            status_short: event.completed ? 'Final' : 'Live',
            source: 'The Odds API',
          }))
        : [];
    } catch {
      return [];
    }
  }
}

export async function getFeaturedGames(): Promise<FeaturedGame[]> {
  const today = getZonedDateString(new Date());
  const searchDates = Array.from({ length: 7 }, (_, index) => addDaysToDateString(today, index));

  for (const [index, date] of searchDates.entries()) {
    const response = await requestEspnScoreboard(date);
    const events = response.events ?? [];

    if (events.length === 0) {
      continue;
    }

    const openGames = events.filter((event) => {
      const competition = event.competitions?.[0];
      const state = competition?.status?.type?.state ?? event.status?.type?.state ?? 'pre';
      const completed = Boolean(
        competition?.status?.type?.completed ?? event.status?.type?.completed
      );

      return completed === false && state !== 'post';
    });

    const gamesToShow = (openGames.length > 0 ? openGames : events)
      .slice()
      .sort((leftGame, rightGame) => leftGame.date.localeCompare(rightGame.date))
      .slice(0, 6);

    if (gamesToShow.length === 0) {
      continue;
    }

    const slateLabel = formatSlateLabel(date, index === 0);

    return gamesToShow.map((event) => {
      const competition = event.competitions?.[0];
      const homeCompetitor = competition?.competitors?.find(
        (competitor) => competitor.homeAway === 'home'
      );
      const awayCompetitor = competition?.competitors?.find(
        (competitor) => competitor.homeAway === 'away'
      );

      return {
        id: event.id,
        date: event.date,
        home_team:
          homeCompetitor?.team?.displayName ?? homeCompetitor?.team?.name ?? 'Home Team',
        away_team:
          awayCompetitor?.team?.displayName ?? awayCompetitor?.team?.name ?? 'Away Team',
        status_text:
          competition?.status?.type?.detail ?? event.status?.type?.detail ?? undefined,
        status_short:
          competition?.status?.type?.shortDetail ??
          event.status?.type?.shortDetail ??
          undefined,
        slate_label: slateLabel,
        source: 'ESPN',
      } satisfies FeaturedGame;
    });
  }

  return [];
}

export function getUpcomingEvents() {
  return getFeaturedGames();
}

export async function getUpcomingOdds(oddsFormat: 'decimal' | 'american' = 'decimal') {
  try {
    const response = (await requestOddsApi('odds', {
      apiKey: THE_ODDS_API_KEY,
      regions: 'us',
      markets: 'h2h,spreads',
      oddsFormat,
      dateFormat: 'iso',
    })) as OddsEvent[];

    return Array.isArray(response)
      ? response.map((event) => ({
          ...event,
          source: 'The Odds API',
        }))
      : [];
  } catch {
    return getEspnOddsFallback(oddsFormat);
  }
}
