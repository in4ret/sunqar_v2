import 'server-only';

const MANTICORE_URL = process.env.MANTICORE_URL;
const MAX_MANTICORE_CONCURRENT_QUERIES = 3;

type ManticoreSqlResponse = {
  columns?: Array<Record<string, string>>;
  data?: unknown[];
  total?: number;
  error?: string;
  warning?: string;
  hits?: {
    total?: number;
    total_relation?: string;
    hits?: Array<{
      _id?: string | number;
      _score?: number;
      _source?: Record<string, unknown>;
    }>;
  };
};

type ManticoreQueueTask = {
  run: () => Promise<void>;
};

let activeManticoreQueries = 0;
const manticoreQueue: ManticoreQueueTask[] = [];

export async function manticoreSql<T = unknown>(
  query: string
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    manticoreQueue.push({
      run: () => {
        return executeManticoreSql<T>(query).then(resolve).catch(reject);
      },
    });
    processManticoreQueue();
  });
}

function processManticoreQueue() {
  while (
    activeManticoreQueries < MAX_MANTICORE_CONCURRENT_QUERIES &&
    manticoreQueue.length > 0
  ) {
    const task = manticoreQueue.shift();

    if (!task) {
      return;
    }

    activeManticoreQueries += 1;

    task.run().finally(() => {
      activeManticoreQueries -= 1;
      processManticoreQueue();
    });
  }
}

async function executeManticoreSql<T = unknown>(
  query: string
): Promise<T[]> {
  if (!MANTICORE_URL) {
    throw new Error('MANTICORE_URL is not set');
  }

  const res = await fetch(`${MANTICORE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Connection: 'close',
    },
    body: new URLSearchParams({ query }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Manticore HTTP error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as ManticoreSqlResponse;

  if (json.error) {
    throw new Error(`Manticore SQL error: ${json.error}`);
  }

  if (json.data) {
    return json.data as T[];
  }

  if (json.hits?.hits) {
    return json.hits.hits.map((hit) => (hit._source ?? {}) as T);
  }

  return [];
}
