"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Alert,
  type AuditEntry,
  type DashboardState,
  type AnalysisResponse,
  type ServiceConnection,
} from "@/lib/api";

/* ── Icon helpers (inline SVG to avoid dep issues) ─────────────────────── */

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      setDashboard(data);
      setError(null);
    } catch (e: any) {
      setError("Backend not running. Start with: uvicorn app.main:app --reload");
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleConnect = async (serviceId: string) => {
    setLoading(true);
    await api.connect(serviceId);
    await refresh();
    setLoading(false);
  };

  const handleDisconnect = async (serviceId: string) => {
    setLoading(true);
    await api.disconnect(serviceId);
    await refresh();
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await api.analyze();
      setAnalysis(result);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setAnalyzing(false);
  };

  const handleDemoBlocked = async () => {
    await api.demoBlockedWrite();
    await refresh();
  };

  const handleReset = async () => {
    await api.reset();
    setAnalysis(null);
    await refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShieldIcon className="w-10 h-10 text-emerald-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Fin-Guard</h1>
            <p className="text-gray-400 text-sm">
              Read-only AI financial guardian — powered by Auth0 Token Vault
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-900/50 text-emerald-400 border border-emerald-800">
            ZERO-TRUST MODE
          </span>
          <button
            onClick={handleReset}
            className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition"
          >
            Reset Demo
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connections + Controls */}
        <div className="space-y-6">
          {/* Service Connections */}
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Connected Services
            </h2>
            <div className="space-y-3">
              {(dashboard?.connections ?? []).map((conn) => (
                <ConnectionCard
                  key={conn.service_id}
                  conn={conn}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  loading={loading}
                />
              ))}
            </div>
          </section>

          {/* Agent Controls */}
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Agent Controls</h2>
            <div className="space-y-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full py-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 transition"
              >
                {analyzing ? "Analyzing..." : "Run Financial Analysis"}
              </button>
              <button
                onClick={handleDemoBlocked}
                className="w-full py-2 rounded-lg text-sm border border-red-800 text-red-400 hover:bg-red-950/50 transition"
              >
                Demo: Try Write (Blocked)
              </button>
            </div>
            {analysis && (
              <div className="mt-4 p-3 rounded-lg bg-gray-800 text-sm">
                <p className="text-emerald-400 font-semibold mb-1">Analysis Complete</p>
                <p className="text-gray-300">{analysis.summary}</p>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>{analysis.transactions_scanned} txns scanned</span>
                  <span>{analysis.anomalies_found} anomalies</span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Middle Column: Alerts */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertIcon className="w-5 h-5 text-amber-400" />
            Alerts
            {(dashboard?.recent_alerts?.length ?? 0) > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-amber-900/50 text-amber-400">
                {dashboard!.recent_alerts.length}
              </span>
            )}
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {(dashboard?.recent_alerts ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">
                No alerts yet. Run an analysis to detect anomalies.
              </p>
            ) : (
              dashboard!.recent_alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </section>

        {/* Right Column: Audit Trail */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Audit Trail
            <span className="ml-auto text-xs text-gray-500 font-normal">
              Every agent action logged
            </span>
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {(dashboard?.audit_log ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">
                No actions yet. The audit trail logs every API call.
              </p>
            ) : (
              dashboard!.audit_log.map((entry, i) => (
                <AuditCard key={i} entry={entry} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Security Banner */}
      <footer className="mt-8 p-4 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-sm text-gray-400">
          <span className="text-emerald-400 font-semibold">Security Model:</span>{" "}
          Fin-Guard operates in permanent read-only mode. Financial data can be
          observed but never modified. All access is audited. Connections can be
          revoked per-service at any time.
        </p>
      </footer>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function ConnectionCard({
  conn,
  onConnect,
  onDisconnect,
  loading,
}: {
  conn: ServiceConnection;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
      <div>
        <p className="font-medium text-sm">{conn.service_name}</p>
        <div className="flex items-center gap-2 mt-1">
          {conn.connected ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckIcon className="w-3 h-3" /> READ-ONLY
            </span>
          ) : (
            <span className="text-xs text-gray-500">Not connected</span>
          )}
        </div>
      </div>
      {conn.connected ? (
        <button
          onClick={() => onDisconnect(conn.service_id)}
          disabled={loading}
          className="px-3 py-1 rounded text-xs border border-red-800 text-red-400 hover:bg-red-950/50 transition"
        >
          Revoke
        </button>
      ) : (
        <button
          onClick={() => onConnect(conn.service_id)}
          disabled={loading}
          className="px-3 py-1 rounded text-xs bg-emerald-700 hover:bg-emerald-600 text-white transition"
        >
          Connect
        </button>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const severityColor = {
    low: "border-gray-700 bg-gray-800",
    medium: "border-amber-800 bg-amber-950/30",
    high: "border-red-800 bg-red-950/30",
  }[alert.severity];

  const severityBadge = {
    low: "bg-gray-700 text-gray-300",
    medium: "bg-amber-900/50 text-amber-400",
    high: "bg-red-900/50 text-red-400",
  }[alert.severity];

  return (
    <div className={`p-3 rounded-lg border ${severityColor}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{alert.title}</p>
        <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${severityBadge}`}>
          {alert.severity}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{alert.description}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
        {alert.notified_via.map((v) => (
          <span key={v} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function AuditCard({ entry }: { entry: AuditEntry }) {
  const isBlocked = !entry.success;
  return (
    <div
      className={`p-2 rounded-lg text-xs ${
        isBlocked
          ? "bg-red-950/30 border border-red-900"
          : "bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <XIcon className="w-3 h-3 text-red-400 shrink-0" />
        ) : (
          <CheckIcon className="w-3 h-3 text-emerald-400 shrink-0" />
        )}
        <span className="font-mono text-gray-300">
          {entry.service}.{entry.action}
        </span>
        <span
          className={`ml-auto px-1.5 py-0.5 rounded ${
            entry.permission_used === "read"
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {entry.permission_used}
        </span>
      </div>
      <p className="text-gray-500 mt-1 pl-5">{entry.details}</p>
    </div>
  );
}
