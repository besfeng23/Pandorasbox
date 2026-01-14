/**
 * Base44 API Client
 * 
 * Synchronizes Base44 with Cursor and Kairos by implementing API calls for:
 * - Plan Alignment (active phase fetch/update)
 * - Master Plan Snapshot (phase objectives)
 * - Phase ↔ System Map (system status)
 * - Bug Impact Map & Evidence
 * - Alignment Checklist
 * 
 * Environment Variables:
 * - BASE44_API_URL: Base URL for Base44 API (default: https://kairostrack.base44.app)
 * - BASE44_API_KEY: API key for Base44 authentication
 */

export interface Base44Phase {
  phaseId: string;
  status: 'active' | 'completed' | 'pending';
  objective?: string;
  systemStatus?: Base44SystemStatus;
  bugImpact?: Base44BugImpact[];
  [key: string]: any;
}

export interface Base44SystemStatus {
  backend: 'operational' | 'degraded' | 'down';
  ui: 'operational' | 'degraded' | 'down';
  database: 'operational' | 'degraded' | 'down';
  integrations: 'operational' | 'degraded' | 'down';
  [key: string]: any;
}

export interface Base44BugImpact {
  bugId: string;
  phaseId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedSystems: string[];
  evidence?: string[];
  [key: string]: any;
}

export interface Base44AlignmentChecklist {
  planAligned: boolean;
  systemMapAligned: boolean;
  bugImpactMapped: boolean;
  objectivesSynced: boolean;
  lastSyncTime?: string;
  [key: string]: any;
}

/**
 * Configuration
 */
interface Base44Config {
  apiUrl?: string;
  apiKey?: string;
  enabled?: boolean;
}

let config: Base44Config = {
  enabled: process.env.NODE_ENV !== 'test',
};

/**
 * Initialize Base44 client configuration
 */
export function initBase44Client(cfg: Partial<Base44Config> = {}) {
  config = {
    ...config,
    apiUrl: process.env.BASE44_API_URL || cfg.apiUrl || 'https://kairostrack.base44.app',
    apiKey: process.env.BASE44_API_KEY || cfg.apiKey,
    enabled: cfg.enabled !== undefined ? cfg.enabled : config.enabled,
  };
}

/**
 * Make authenticated API request to Base44
 * Base44 uses /functions/kairosApi as a unified API gateway that routes based on path and method
 * 
 * Note: The exact request format may vary based on Base44's implementation.
 * If this doesn't work, the kairosApi function may expect a different format.
 * Adjust the requestBody structure below if needed.
 */
async function base44Request<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  if (!config.enabled) {
    throw new Error('Base44 client is disabled');
  }

  // Base44 uses /functions/kairosApi as a unified gateway
  // The endpoint path and method are sent in the request body for routing
  const apiFunctionUrl = `${config.apiUrl.replace(/\/+$/, '')}/functions/kairosApi`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (config.apiKey) {
    headers['api_key'] = config.apiKey;
  }

  // Base44 kairosApi function expects path and method in the body for routing
  // Format: { path: string, method: string, body?: any }
  const requestBody: any = {
    path: endpoint,
    method: options.method || 'GET',
  };
  
  if (options.body) {
    requestBody.body = options.body;
  }

  const fetchOptions: RequestInit = {
    method: 'POST', // Always POST to the function
    headers,
    body: JSON.stringify(requestBody),
  };

  const response = await fetch(apiFunctionUrl, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Base44 API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * 1. Plan Alignment - Fetch Active Phase
 */
export async function fetchActivePhase(): Promise<Base44Phase> {
  return base44Request<Base44Phase>('/phase/current');
}

/**
 * 1. Plan Alignment - Update Phase Data
 */
export async function updatePhaseData(phaseData: Partial<Base44Phase>): Promise<Base44Phase> {
  return base44Request<Base44Phase>('/phase', {
    method: 'PUT',
    body: phaseData,
  });
}

/**
 * 2. Master Plan Snapshot - Get Phase Objective from Kairos
 * Note: This fetches from Kairos active plan, not Base44
 */
export async function fetchPhaseObjectiveFromKairos(phaseId: string): Promise<{ objective: string; [key: string]: any }> {
  // Use Kairos endpoints to fetch active plan
  const { resolveKairosEndpoints } = await import('./kairosEndpoints');
  const endpoints = resolveKairosEndpoints(process.env);
  
  // Fetch active plan from Kairos
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth if available
  if (config.apiKey) {
    headers['api_key'] = config.apiKey;
  } else if (process.env.KAIROS_INGEST_KEY) {
    headers['Authorization'] = `Bearer ${process.env.KAIROS_INGEST_KEY}`;
  }

  const response = await fetch(endpoints.activePlanUrl, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Kairos API error (${response.status}): ${errorText}`);
  }

  const activePlan = await response.json();
  
  // Extract phase objective from active plan structure
  // The plan structure may vary, so we'll try multiple paths
  const planJson = activePlan?.plan?.plan_json || activePlan?.plan_json || activePlan;
  
  // Look for phase in the plan structure
  // This assumes phases are in a structure like: plan.phases[phaseId] or plan.nodes where node.type === 'phase'
  let phaseObjective: string | undefined;
  
  if (planJson?.phases?.[phaseId]) {
    phaseObjective = planJson.phases[phaseId].objective || planJson.phases[phaseId].description;
  } else if (planJson?.nodes) {
    // Search nodes for phase matching phaseId
    const phaseNode = Array.isArray(planJson.nodes)
      ? planJson.nodes.find((n: any) => n.id === phaseId || n.phaseId === phaseId)
      : Object.values(planJson.nodes).find((n: any) => n.id === phaseId || n.phaseId === phaseId);
    
    if (phaseNode) {
      phaseObjective = phaseNode.objective || phaseNode.description || phaseNode.title;
    }
  }

  if (!phaseObjective) {
    throw new Error(`Phase objective not found for phaseId: ${phaseId}`);
  }

  return {
    objective: phaseObjective,
    phaseId,
    source: 'kairos',
    activePlan: planJson,
  };
}

/**
 * 2. Master Plan Snapshot - Update Phase Objective in Base44
 */
export async function updatePhaseObjectiveInBase44(
  phaseId: string,
  objectiveData: { objective: string; [key: string]: any }
): Promise<Base44Phase> {
  return base44Request<Base44Phase>(`/phase/${phaseId}/objective`, {
    method: 'PUT',
    body: objectiveData,
  });
}

/**
 * 3. Phase ↔ System Map - Get System Status for Phase
 */
export async function fetchPhaseSystemStatus(phaseId: string): Promise<Base44SystemStatus> {
  return base44Request<Base44SystemStatus>(`/phase/${phaseId}/system-status`);
}

/**
 * 3. Phase ↔ System Map - Update System Map for Phase
 */
export async function updateSystemMap(
  phaseId: string,
  systemMapData: Partial<Base44SystemStatus>
): Promise<Base44SystemStatus> {
  return base44Request<Base44SystemStatus>(`/phase/${phaseId}/system-status`, {
    method: 'PUT',
    body: systemMapData,
  });
}

/**
 * 4. Bug Impact Map & Evidence - Get Active Bugs
 */
export async function fetchActiveBugs(): Promise<Base44BugImpact[]> {
  return base44Request<Base44BugImpact[]>('/bugs/active');
}

/**
 * 4. Bug Impact Map & Evidence - Map Bugs to Phases
 */
export async function updateBugImpactOnPhase(
  phaseId: string,
  bugImpactData: Base44BugImpact[]
): Promise<Base44BugImpact[]> {
  return base44Request<Base44BugImpact[]>(`/phase/${phaseId}/bug-impact`, {
    method: 'PUT',
    body: bugImpactData,
  });
}

/**
 * 5. Alignment Checklist - Get Alignment Status
 */
export async function fetchAlignmentChecklist(): Promise<Base44AlignmentChecklist> {
  return base44Request<Base44AlignmentChecklist>('/checklist/alignment');
}

/**
 * 5. Alignment Checklist - Update Alignment Checklist
 */
export async function updateAlignmentChecklist(
  checklistData: Partial<Base44AlignmentChecklist>
): Promise<Base44AlignmentChecklist> {
  return base44Request<Base44AlignmentChecklist>('/checklist/alignment', {
    method: 'PUT',
    body: checklistData,
  });
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side only
  initBase44Client();
}

