const API_BASE = "/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface ServiceConnection {
  service_id: string;
  service_name: string;
  permission: "read" | "none";
  connected: boolean;
  connected_at: string | null;
  scopes: string[];
}

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  transaction_id: string | null;
  notified_via: string[];
  acknowledged: boolean;
}

export interface AuditEntry {
  timestamp: string;
  service: string;
  action: string;
  permission_used: "read" | "none";
  success: boolean;
  details: string;
}

export interface DashboardState {
  connections: ServiceConnection[];
  recent_alerts: Alert[];
  audit_log: AuditEntry[];
  agent_status: string;
}

export interface AnalysisResponse {
  summary: string;
  alerts: Alert[];
  transactions_scanned: number;
  anomalies_found: number;
}

export const api = {
  getDashboard: () => fetchAPI<DashboardState>("/dashboard"),
  getConnections: () => fetchAPI<ServiceConnection[]>("/connections"),
  connect: (id: string) =>
    fetchAPI<ServiceConnection>(`/connections/${id}/connect`, { method: "POST" }),
  disconnect: (id: string) =>
    fetchAPI<any>(`/connections/${id}/disconnect`, { method: "POST" }),
  analyze: () =>
    fetchAPI<AnalysisResponse>("/analyze", { method: "POST" }),
  demoBlockedWrite: () =>
    fetchAPI<AuditEntry>("/analyze/demo-blocked-write", { method: "POST" }),
  getAlerts: () => fetchAPI<Alert[]>("/alerts"),
  getAudit: () => fetchAPI<AuditEntry[]>("/audit"),
  reset: () => fetchAPI<any>("/reset", { method: "POST" }),
};
