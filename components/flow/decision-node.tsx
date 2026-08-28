"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "@/types/workflow";

export function DecisionNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div className={cn("relative w-64 rounded-xl border bg-slate-950 p-4 shadow-xl transition", selected ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-slate-700", data.executionStatus === "running" && "border-amber-400 shadow-amber-500/20", data.executionStatus === "completed" && "border-emerald-500", data.executionStatus === "failed" && "border-red-500")}>
      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-slate-950 !bg-slate-400" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-100">{data.title}</p>
        <div className="flex gap-1">
          {data.isStart && <Badge className="border-indigo-500/50 bg-indigo-500/10 text-indigo-300">Start</Badge>}
          {data.executionResult && <Badge className={data.executionResult === "YES" ? "border-emerald-500/50 text-emerald-300" : "border-rose-500/50 text-rose-300"}>{data.executionResult}</Badge>}
        </div>
      </div>
      <p className="line-clamp-3 min-h-12 text-xs leading-4 text-slate-400">{data.prompt || "No prompt configured"}</p>
      <div className="mt-4 flex justify-between text-[11px] font-bold">
        <span className="text-emerald-400">YES</span><span className="text-rose-400">NO</span>
      </div>
      <Handle id="YES" type="source" position={Position.Bottom} style={{ left: 28 }} className="!size-3 !border-2 !border-slate-950 !bg-emerald-500" />
      <Handle id="NO" type="source" position={Position.Bottom} style={{ left: "auto", right: 28 }} className="!size-3 !border-2 !border-slate-950 !bg-rose-500" />
    </div>
  );
}
