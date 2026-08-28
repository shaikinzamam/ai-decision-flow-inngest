"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge, Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow,
  ReactFlowProvider, useEdgesState, useNodesState, type Connection, type Edge,
} from "@xyflow/react";
import { Download, GitBranch, History, Play, Plus, Save, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DecisionNode } from "./decision-node";
import { EndNode } from "./end-node";
import { ExecutionPanel } from "./execution-panel";
import { ExecutionHistory } from "./execution-history";
import { defaultWorkflow } from "@/lib/default-workflow";
import { historyStorage, workflowStorage } from "@/lib/workflow-storage";
import { parseWorkflow, validateWorkflow } from "@/lib/workflow-validation";
import type { DecisionCondition, ExecutionRun, Workflow, WorkflowEdge, WorkflowNode } from "@/types/workflow";

const nodeTypes = { decision: DecisionNode, end: EndNode };

type ExecutionApiResponse = { executionId?: string; error?: string; details?: unknown };

function executionApiError(response: ExecutionApiResponse): string {
  const { details } = response;
  if (typeof details === "string") return details;
  if (Array.isArray(details)) {
    const messages = details.filter((item): item is string => typeof item === "string");
    if (messages.length) return messages.join(" ");
  }
  if (details && typeof details === "object" && "fieldErrors" in details) {
    const fieldErrors = (details as { fieldErrors?: Record<string, unknown> }).fieldErrors;
    if (fieldErrors) {
      const messages = Object.values(fieldErrors).flatMap((value) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
      if (messages.length) return messages.join(" ");
    }
  }
  return response.error || "Unable to start workflow.";
}

export function FlowEditor() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>;
}

function Editor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(defaultWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(defaultWorkflow.edges);
  const [workflowId, setWorkflowId] = useState(defaultWorkflow.id);
  const [name, setName] = useState(defaultWorkflow.name);
  const [startNodeId, setStartNodeId] = useState(defaultWorkflow.startNodeId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [history, setHistory] = useState<ExecutionRun[]>([]);
  const [saved, setSaved] = useState<Workflow[]>([]);
  const [rightTab, setRightTab] = useState<"logs" | "history">("logs");
  const [isRunning, setIsRunning] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaved(workflowStorage.list());
      setHistory(historyStorage.list());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const workflow = useMemo<Workflow>(() => ({
    version: 1,
    id: workflowId,
    name,
    startNodeId,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: {
        title: node.data.title,
        prompt: node.data.prompt ?? "",
        ...(node.data.label ? { label: node.data.label } : {}),
        isStart: node.id === startNodeId,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.data?.condition,
      data: { condition: edge.data?.condition as DecisionCondition },
    })),
  }), [workflowId, name, startNodeId, nodes, edges]);
  const selected = nodes.find((node) => node.id === selectedId);

  const onConnect = useCallback((connection: Connection) => {
    const condition = connection.sourceHandle as DecisionCondition | null;
    if (!condition || !["YES", "NO"].includes(condition)) return toast.error("Connect from a YES or NO handle.");
    if (edges.some((edge) => edge.source === connection.source && edge.data?.condition === condition)) return toast.error(`This node already has a ${condition} path.`);
    const edge: Edge = { ...connection, id: `${connection.source}-${condition}-${crypto.randomUUID()}`, data: { condition }, label: condition, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: condition === "YES" ? "#10b981" : "#f43f5e" }, labelStyle: { fill: condition === "YES" ? "#6ee7b7" : "#fda4af", fontWeight: 700 } };
    setEdges((items) => addEdge(edge, items) as WorkflowEdge[]);
  }, [edges, setEdges]);

  const addNode = (type: "decision" | "end") => {
    const id = `${type}-${crypto.randomUUID()}`;
    const next: WorkflowNode = { id, type, position: { x: 160 + (nodes.length % 3) * 250, y: 120 + (nodes.length % 4) * 120 }, data: { title: type === "decision" ? "New Decision" : "Completed", prompt: type === "decision" ? "Does the user's message meet this condition?" : "" } };
    setNodes((items) => [...items, next]); setSelectedId(id);
  };

  const updateSelected = (patch: Partial<WorkflowNode["data"]>) => setNodes((items) => items.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node));
  const markStart = () => {
    if (!selected || selected.type !== "decision") return;
    setStartNodeId(selected.id);
    setNodes((items) => items.map((node) => ({ ...node, data: { ...node.data, isStart: node.id === selected.id } })));
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((items) => items.filter((node) => node.id !== selectedId));
    setEdges((items) => items.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    if (startNodeId === selectedId) setStartNodeId("");
    setSelectedId(null);
  };

  const loadWorkflow = (value: Workflow) => {
    setWorkflowId(value.id); setName(value.name); setStartNodeId(value.startNodeId);
    setNodes(value.nodes.map((node) => ({ ...node, data: { ...node.data, isStart: node.id === value.startNodeId } })));
    setEdges(value.edges); setSelectedId(null); setRun(null);
  };
  const saveWorkflow = () => {
    const errors = validateWorkflow(workflow);
    if (errors.length) return toast.error(errors[0]);
    workflowStorage.save(workflow); setSaved(workflowStorage.list()); toast.success("Workflow saved locally.");
  };
  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "workflow"}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  const importWorkflow = async (file?: File) => {
    if (!file) return;
    try { const parsed = parseWorkflow(JSON.parse(await file.text())); const errors = validateWorkflow(parsed); if (errors.length) throw new Error(errors[0]); loadWorkflow(parsed); toast.success("Workflow imported."); }
    catch (error) { toast.error(error instanceof Error ? `Import failed: ${error.message}` : "Import failed: invalid JSON."); }
    if (importRef.current) importRef.current.value = "";
  };

  const applyRun = useCallback((current: ExecutionRun) => {
    const stepByNode = new Map(current.steps.map((item) => [item.nodeId, item]));
    const lastEdgeId = current.steps.at(-1)?.traversedEdgeId;
    const activeNodeId = current.status === "running" || current.status === "queued"
      ? (lastEdgeId ? edges.find((edge) => edge.id === lastEdgeId)?.target : startNodeId)
      : undefined;
    setNodes((items) => items.map((node) => {
      const execution = stepByNode.get(node.id);
      return { ...node, data: { ...node.data, executionStatus: execution?.status ?? (node.id === activeNodeId ? "running" : "idle"), executionResult: execution?.result } };
    }));
    const traversed = new Set(current.steps.map((item) => item.traversedEdgeId).filter(Boolean));
    setEdges((items) => items.map((edge) => ({ ...edge, animated: traversed.has(edge.id), style: { stroke: traversed.has(edge.id) ? "#fbbf24" : edge.data?.condition === "YES" ? "#10b981" : "#f43f5e", strokeWidth: traversed.has(edge.id) ? 3 : 1.5 }, label: edge.data?.condition, labelStyle: { fill: edge.data?.condition === "YES" ? "#6ee7b7" : "#fda4af", fontWeight: 700 } })));
  }, [edges, setEdges, setNodes, startNodeId]);

  const runWorkflow = async () => {
    const errors = validateWorkflow(workflow);
    if (errors.length) return toast.error(errors[0]);
    if (!input.trim()) return toast.error("Enter a message before running the workflow.");
    setIsRunning(true); setRightTab("logs");
    setNodes((items) => items.map((node) => ({ ...node, data: { ...node.data, executionStatus: node.id === startNodeId ? "running" : "idle", executionResult: undefined } })));
    try {
      const response = await fetch("/api/executions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow, input }) });
      const started = await response.json() as ExecutionApiResponse;
      if (!response.ok || !started.executionId) throw new Error(executionApiError(started));
      const queued: ExecutionRun = { executionId: started.executionId, workflowId, workflowName: name, status: "queued", input, startedAt: new Date().toISOString(), steps: [] };
      setRun(queued);
      let current = queued;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const poll = await fetch(`/api/executions/${started.executionId}`, { cache: "no-store" });
        if (poll.ok) { current = await poll.json() as ExecutionRun; setRun(current); applyRun(current); }
        if (current.status === "completed" || current.status === "failed") break;
      }
      if (current.status === "queued" || current.status === "running") current = { ...current, status: "failed", error: "Timed out waiting for execution. Confirm the Inngest dev server is running.", completedAt: new Date().toISOString() };
      setRun(current); applyRun(current); historyStorage.add(current); setHistory(historyStorage.list());
      if (current.status === "completed") toast.success(`Routed to ${current.finalNodeTitle}.`); else toast.error(current.error || "Workflow failed.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Workflow failed."); }
    finally { setIsRunning(false); }
  };

  return (
    <main className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
        <div className="mr-2 flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600"><GitBranch className="size-5" /></span><div><h1 className="text-sm font-bold">AI Decision Flow</h1><p className="text-[10px] text-slate-500">Inngest-powered routing</p></div></div>
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Workflow name" className="max-w-xs" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveWorkflow}><Save className="size-4" />Save</Button>
          <Button variant="outline" size="sm" onClick={exportWorkflow}><Download className="size-4" />Export</Button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importWorkflow(event.target.files?.[0])} />
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}><Upload className="size-4" />Import</Button>
          <Button size="sm" onClick={runWorkflow} disabled={isRunning}><Play className="size-4 fill-current" />{isRunning ? "Running…" : "Run workflow"}</Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(480px,1fr)_330px]">
        <aside className="overflow-y-auto border-r border-slate-800 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Build</p>
          <div className="grid gap-2"><Button variant="outline" onClick={() => addNode("decision")}><Plus className="size-4 text-indigo-400" />Add decision</Button><Button variant="outline" onClick={() => addNode("end")}><Square className="size-4 text-emerald-400" />Add end node</Button></div>
          <div className="my-5 border-t border-slate-800" />
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Inspector</p>
          {selected ? <Card className="space-y-3 p-3"><label className="block text-xs text-slate-400">Title<Input className="mt-1" value={selected.data.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>{selected.type === "decision" && <label className="block text-xs text-slate-400">Decision prompt<Textarea className="mt-1 min-h-28" value={selected.data.prompt ?? ""} onChange={(event) => updateSelected({ prompt: event.target.value })} /></label>}{selected.type === "decision" && <Button variant="outline" size="sm" className="w-full" onClick={markStart} disabled={selected.id === startNodeId}>Mark as start</Button>}<Button variant="danger" size="sm" className="w-full" onClick={deleteSelected}>Delete node</Button></Card> : <p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">Select a node to edit it.</p>}
          <div className="my-5 border-t border-slate-800" />
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Saved workflows</p>
          <div className="space-y-2">{saved.length ? saved.map((item) => <button key={item.id} onClick={() => loadWorkflow(item)} className="w-full rounded-lg border border-slate-800 p-3 text-left text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900">{item.name}<span className="mt-1 block text-[10px] text-slate-600">{item.nodes.length} nodes</span></button>) : <p className="text-xs text-slate-600">Saved flows appear here.</p>}</div>
        </aside>

        <section className="relative bg-slate-900/30">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} fitView minZoom={0.35} colorMode="dark" deleteKeyCode={null}>
            <Background color="#334155" gap={24} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="!border-slate-700 !bg-slate-900 [&>button]:!border-slate-700 [&>button]:!bg-slate-900 [&>button]:!fill-slate-300" />
            <MiniMap pannable zoomable className="!border !border-slate-700 !bg-slate-950" nodeColor={(node) => node.type === "end" ? "#10b981" : "#6366f1"} />
          </ReactFlow>
          <div className="absolute bottom-4 left-1/2 z-10 w-[min(620px,80%)] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur"><div className="flex gap-2"><Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-16" placeholder="Enter a customer message to route…" /><Button onClick={runWorkflow} disabled={isRunning} className="h-auto w-28"><Play className="size-4 fill-current" />{isRunning ? "Running" : "Run"}</Button></div></div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-slate-800">
          <div className="grid grid-cols-2 border-b border-slate-800 p-2"><Button variant={rightTab === "logs" ? "default" : "ghost"} size="sm" onClick={() => setRightTab("logs")}><GitBranch className="size-4" />Logs</Button><Button variant={rightTab === "history" ? "default" : "ghost"} size="sm" onClick={() => setRightTab("history")}><History className="size-4" />History</Button></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{rightTab === "logs" ? <ExecutionPanel run={run} /> : <ExecutionHistory history={history} onSelect={(item) => { setRun(item); applyRun(item); setRightTab("logs"); }} />}</div>
        </aside>
      </div>
    </main>
  );
}
