import type { Edge, Node } from "@xyflow/react";

export type DecisionCondition = "YES" | "NO";
export type WorkflowNodeType = "decision" | "end";
export type NodeExecutionStatus = "idle" | "running" | "completed" | "failed";
export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

export type WorkflowNodeData = {
  title: string;
  prompt?: string;
  label?: string;
  isStart?: boolean;
  executionStatus?: NodeExecutionStatus;
  executionResult?: DecisionCondition;
};

export type WorkflowEdgeData = {
  condition: DecisionCondition;
};

export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;
export type WorkflowEdge = Edge<WorkflowEdgeData>;

export type Workflow = {
  version: 1;
  id: string;
  name: string;
  startNodeId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ExecutionStep = {
  order: number;
  nodeId: string;
  nodeTitle: string;
  nodeType: WorkflowNodeType;
  result?: DecisionCondition;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  error?: string;
  traversedEdgeId?: string;
};

export type ExecutionRun = {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  input: string;
  startedAt: string;
  completedAt?: string;
  steps: ExecutionStep[];
  finalNodeId?: string;
  finalNodeTitle?: string;
  error?: string;
};

export type WorkflowRunPayload = Workflow & { input: string; executionId: string };
