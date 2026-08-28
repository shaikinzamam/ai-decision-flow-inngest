"use client";

import { AlertCircle, CheckCircle2, CircleDot, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExecutionRun } from "@/types/workflow";

export function ExecutionPanel({ run }: { run: ExecutionRun | null }) {
  if (!run) return <div className="py-10 text-center text-sm text-slate-500">Run the workflow to see decisions and routing.</div>;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between"><span className="font-medium text-slate-200">Execution</span><Badge className={run.status === "completed" ? "border-emerald-500/50 text-emerald-300" : run.status === "failed" ? "border-red-500/50 text-red-300" : "border-amber-500/50 text-amber-300"}>{run.status}</Badge></div>
      <div className="rounded-lg bg-slate-900 p-3 text-xs text-slate-400"><span className="text-slate-500">Input</span><p className="mt-1 text-slate-300">{run.input}</p></div>
      <div className="space-y-1 border-l border-slate-700 pl-4">
        <LogLine icon={<Clock3 />} text="Workflow started" />
        {run.steps.map((item) => <LogLine key={`${item.order}-${item.nodeId}`} icon={item.status === "failed" ? <AlertCircle /> : <CircleDot />} text={`${item.order}. ${item.nodeTitle}`} detail={item.nodeType === "end" ? "End node reached" : item.error || `Result: ${item.result}`} error={item.status === "failed"} />)}
        {run.status === "completed" && <LogLine icon={<CheckCircle2 />} text={`Completed at ${run.finalNodeTitle}`} />}
        {run.error && <LogLine icon={<AlertCircle />} text="Workflow failed" detail={run.error} error />}
      </div>
    </div>
  );
}

function LogLine({ icon, text, detail, error }: { icon: React.ReactNode; text: string; detail?: string; error?: boolean }) {
  return <div className="relative py-2"><span className={cnLocal(error)}>{icon}</span><p className={error ? "font-medium text-red-300" : "font-medium text-slate-300"}>{text}</p>{detail && <p className={error ? "mt-0.5 text-xs text-red-400" : "mt-0.5 text-xs text-slate-500"}>{detail}</p>}</div>;
}
function cnLocal(error?: boolean) { return `absolute -left-[25px] top-2.5 [&>svg]:size-4 ${error ? "text-red-400" : "text-slate-500"}`; }
