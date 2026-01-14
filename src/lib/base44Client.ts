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
 * - BASE44_API_URL: Base URL for Base44 API (default: https://app.base44.com)
 * - BASE44_APP_ID: Base44 App ID (required)
 * - BASE44_API_KEY: API key for Base44 authentication (required)
 */

export interface Base44Phase {
  id?: string; // Base44 entity ID
  phaseId: string;
  status: 'active' | 'completed' | 'pending';
  objective?: string;
  systemStatus?: Base44SystemStatus;
  bugImpact?: Base44BugImpact[];
  [key: string]: any;
}

export interface Base44SystemStatus {
  id?: string; // Base44 entity ID
  phaseId?: string;
  backend: 'operational' | 'degraded' | 'down';
  ui: 'operational' | 'degraded' | 'down';
  database: 'operational' | 'degraded' | 'down';
  integrations: 'operational' | 'degraded' | 'down';
  [key: string]: any;
}

export interface Base44BugImpact {
  id?: string; // Base44 entity ID
  bugId: string;
  phaseId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedSystems: string[];
  evidence?: string[];
  [key: string]: any;
}

export interface Base44AlignmentChecklist {
  id?: string; // Base44 entity ID
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
  appId?: string;
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
    apiUrl: process.env.BASE44_API_URL || cfg.apiUrl || 'https://app.base44.com',
    appId: process.env.BASE44_APP_ID || cfg.appId,
    apiKey: process.env.BASE44_API_KEY || cfg.apiKey,
    enabled: cfg.enabled !== undefined ? cfg.enabled : config.enabled,
  };
}

/**
 * Make authenticated API request to Base44
 * Base44 uses REST API: /api/apps/{appId}/entities/{EntityName}
 */
async function base44Request<T>(
  entityName: string,
  options: {
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
    entityId?: string;
    body?: any;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  if (!config.enabled) {
    throw new Error('Base44 client is disabled');
  }

  if (!config.appId) {
    throw new Error('BASE44_APP_ID is required. Set it in environment variables.');
  }

  if (!config.apiKey) {
    throw new Error('BASE44_API_KEY is required. Set it in environment variables.');
  }

  const baseUrl = config.apiUrl.replace(/\/+$/, '');
  const entityPath = options.entityId 
    ? `/api/apps/${config.appId}/entities/${entityName}/${options.entityId}`
    : `/api/apps/${config.appId}/entities/${entityName}`;

  // Add query parameters if provided
  let url = `${baseUrl}${entityPath}`;
  if (options.queryParams && Object.keys(options.queryParams).length > 0) {
    const params = new URLSearchParams(options.queryParams);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'api_key': config.apiKey,
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

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
  // Fetch phases and filter for active one
  const phases = await base44Request<Base44Phase[]>('Phase', {
    queryParams: { status: 'active' },
  });
  
  if (Array.isArray(phases) && phases.length > 0) {
    return phases[0];
  }
  
  // If no active phase found, try to get the first phase
  const allPhases = await base44Request<Base44Phase[]>('Phase');
  if (Array.isArray(allPhases) && allPhases.length > 0) {
    return allPhases[0];
  }
  
  throw new Error('No active phase found in Base44');
}

/**
 * 1. Plan Alignment - Update Phase Data
 */
export async function updatePhaseData(phaseData: Partial<Base44Phase>): Promise<Base44Phase> {
  if (!phaseData.phaseId) {
    throw new Error('phaseId is required to update phase data');
  }
  
  return base44Request<Base44Phase>('Phase', {
    method: 'PUT',
    entityId: phaseData.phaseId,
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
  // Get current phase data
  const currentPhase = await base44Request<Base44Phase>('Phase', {
    entityId: phaseId,
  });
  
  // Update with new objective
  return base44Request<Base44Phase>('Phase', {
    method: 'PUT',
    entityId: phaseId,
    body: {
      ...currentPhase,
      ...objectiveData,
    },
  });
}

/**
 * 3. Phase ↔ System Map - Get System Status for Phase
 */
export async function fetchPhaseSystemStatus(phaseId: string): Promise<Base44SystemStatus> {
  // System status might be stored in Phase entity or separate SystemStatus entity
  // Try Phase first (systemStatus field)
  const phase = await base44Request<Base44Phase>('Phase', {
    entityId: phaseId,
  });
  
  if (phase.systemStatus) {
    return phase.systemStatus;
  }
  
  // Try SystemStatus entity
  const systemStatuses = await base44Request<Base44SystemStatus[]>('SystemStatus', {
    queryParams: { phaseId },
  });
  
  if (Array.isArray(systemStatuses) && systemStatuses.length > 0) {
    return systemStatuses[0];
  }
  
  // Return default if not found
  return {
    backend: 'operational',
    ui: 'operational',
    database: 'operational',
    integrations: 'operational',
  };
}

/**
 * 3. Phase ↔ System Map - Update System Map for Phase
 */
export async function updateSystemMap(
  phaseId: string,
  systemMapData: Partial<Base44SystemStatus>
): Promise<Base44SystemStatus> {
  // Try to find existing SystemStatus entity
  const existing = await base44Request<Base44SystemStatus[]>('SystemStatus', {
    queryParams: { phaseId },
  });
  
  if (Array.isArray(existing) && existing.length > 0 && existing[0].id) {
    // Update existing
    return base44Request<Base44SystemStatus>('SystemStatus', {
      method: 'PUT',
      entityId: existing[0].id,
      body: {
        ...existing[0],
        ...systemMapData,
        phaseId,
      },
    });
  } else {
    // Create new
    return base44Request<Base44SystemStatus>('SystemStatus', {
      method: 'POST',
      body: {
        ...systemMapData,
        phaseId,
      },
    });
  }
}

/**
 * 4. Bug Impact Map & Evidence - Get Active Bugs
 */
export async function fetchActiveBugs(): Promise<Base44BugImpact[]> {
  // Fetch bugs with status filter (assuming status field exists)
  const bugs = await base44Request<Base44BugImpact[]>('KairosBug', {
    queryParams: { status: 'open' }, // or 'active' depending on Base44 schema
  });
  
  return Array.isArray(bugs) ? bugs : [];
}

/**
 * 4. Bug Impact Map & Evidence - Map Bugs to Phases
 */
export async function updateBugImpactOnPhase(
  phaseId: string,
  bugImpactData: Base44BugImpact[]
): Promise<Base44BugImpact[]> {
  // Update each bug with phaseId
  const updatedBugs: Base44BugImpact[] = [];
  
  for (const bug of bugImpactData) {
    if (bug.bugId) {
      // Update existing bug
      const updated = await base44Request<Base44BugImpact>('KairosBug', {
        method: 'PUT',
        entityId: bug.bugId,
        body: {
          ...bug,
          phaseId,
        },
      });
      updatedBugs.push(updated);
    } else {
      // Create new bug
      const created = await base44Request<Base44BugImpact>('KairosBug', {
        method: 'POST',
        body: {
          ...bug,
          phaseId,
        },
      });
      updatedBugs.push(created);
    }
  }
  
  return updatedBugs;
}

/**
 * 5. Alignment Checklist - Get Alignment Status
 */
export async function fetchAlignmentChecklist(): Promise<Base44AlignmentChecklist> {
  // Try to fetch AlignmentChecklist entity
  const checklists = await base44Request<Base44AlignmentChecklist[]>('AlignmentChecklist');
  
  if (Array.isArray(checklists) && checklists.length > 0) {
    return checklists[0];
  }
  
  // Return default if not found
  return {
    planAligned: false,
    systemMapAligned: false,
    bugImpactMapped: false,
    objectivesSynced: false,
  };
}

/**
 * 5. Alignment Checklist - Update Alignment Checklist
 */
export async function updateAlignmentChecklist(
  checklistData: Partial<Base44AlignmentChecklist>
): Promise<Base44AlignmentChecklist> {
  // Try to find existing checklist
  const existing = await base44Request<Base44AlignmentChecklist[]>('AlignmentChecklist');
  
  if (Array.isArray(existing) && existing.length > 0 && (existing[0] as any).id) {
    // Update existing
    return base44Request<Base44AlignmentChecklist>('AlignmentChecklist', {
      method: 'PUT',
      entityId: (existing[0] as any).id,
      body: {
        ...existing[0],
        ...checklistData,
      },
    });
  } else {
    // Create new
    return base44Request<Base44AlignmentChecklist>('AlignmentChecklist', {
      method: 'POST',
      body: checklistData,
    });
  }
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side only
  initBase44Client();
}

