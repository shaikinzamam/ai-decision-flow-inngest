"use client";

import { Badge } from "@/components/ui/badge";
import type { ExecutionRun } from "@/types/workflow";

export function ExecutionHistory({ history, onSelect }: { history: ExecutionRun[]; onSelect: (run: ExecutionRun) => void }) {
  if (!history.length) return <div className="py-10 text-center text-sm text-slate-500">No previous executions yet.</div>;
  return <div className="space-y-2">{history.map((run) => <button key={run.executionId} onClick={() => onSelect(run)} className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-slate-700"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-slate-200">{run.workflowName}</span><Badge className={run.status === "completed" ? "text-emerald-300" : "text-red-300"}>{run.status}</Badge></div><p className="mt-2 truncate text-xs text-slate-500">{run.input}</p><div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>{new Date(run.startedAt).toLocaleString()}</span><span>{run.steps.length} steps · {run.finalNodeTitle || "—"}</span></div></button>)}</div>;
}
