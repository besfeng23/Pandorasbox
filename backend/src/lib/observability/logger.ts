export type LogEventType = 'AI_REQUEST' | 'MEMORY_SEARCH' | 'INGESTION' | 'ERROR' | 'MEMORY_DELETE';

export function logEvent(type: LogEventType, payload: Record<string, any>) {
  const logEntry = {
    severity: type === 'ERROR' ? 'ERROR' : 'INFO',
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Google Cloud Logging automatically parses JSON from stdout
  console.log(JSON.stringify(logEntry));
}


