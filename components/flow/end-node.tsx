"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "@/types/workflow";

export function EndNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div className={cn("flex w-52 items-center gap-3 rounded-xl border bg-slate-950 p-4 shadow-xl", selected ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-slate-700", data.executionStatus === "completed" && "border-emerald-500 bg-emerald-950/30", data.executionStatus === "running" && "border-amber-400", data.executionStatus === "failed" && "border-red-500")}>
      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-slate-950 !bg-slate-400" />
      {data.executionStatus === "completed" ? <CheckCircle2 className="size-5 text-emerald-400" /> : <Flag className="size-5 text-indigo-400" />}
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Destination</p><p className="font-semibold text-slate-100">{data.title}</p></div>
    </div>
  );
}
