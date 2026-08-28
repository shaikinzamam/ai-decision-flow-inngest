import { z } from "zod";
import type { Workflow } from "@/types/workflow";

const positionSchema = z.object({ x: z.number(), y: z.number() });
const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["decision", "end"]),
  position: positionSchema,
  data: z.object({
    title: z.string().min(1, "Every node needs a title."),
    prompt: z.string().optional().default(""),
    label: z.string().optional(),
    isStart: z.boolean().optional(),
  }),
});
const edgeSchema = z.object({
  id: z.string().min(1), source: z.string().min(1), target: z.string().min(1),
  sourceHandle: z.enum(["YES", "NO"]),
  data: z.object({ condition: z.enum(["YES", "NO"]) }),
});

export const workflowSchema = z.object({
  version: z.literal(1), id: z.string().min(1), name: z.string().min(1),
  startNodeId: z.string().min(1), nodes: z.array(nodeSchema).min(1), edges: z.array(edgeSchema),
});

export function parseWorkflow(value: unknown): Workflow {
  return workflowSchema.parse(value) as Workflow;
}

export function validateWorkflow(workflow: Workflow): string[] {
  const errors: string[] = [];
  const ids = new Set(workflow.nodes.map((node) => node.id));
  const start = workflow.nodes.find((node) => node.id === workflow.startNodeId);
  if (!start) errors.push("Select a valid start node.");
  else if (start.type !== "decision") errors.push("The start node must be a decision node.");

  for (const node of workflow.nodes) {
    if (!node.data.title.trim()) errors.push(`Node ${node.id} is missing a title.`);
    if (node.type === "decision" && !node.data.prompt?.trim()) errors.push(`${node.data.title || node.id} is missing a decision prompt.`);
  }
  for (const edge of workflow.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`Edge ${edge.id} has a broken connection.`);
    if (!edge.data?.condition || edge.sourceHandle !== edge.data.condition) errors.push(`Edge ${edge.id} has invalid condition metadata.`);
  }
  for (const node of workflow.nodes.filter((item) => item.type === "decision")) {
    for (const condition of ["YES", "NO"] as const) {
      const matches = workflow.edges.filter((edge) => edge.source === node.id && edge.data?.condition === condition);
      if (matches.length > 1) errors.push(`${node.data.title} has duplicate ${condition} edges.`);
    }
    if (!workflow.edges.some((edge) => edge.source === node.id)) errors.push(`${node.data.title} has no outgoing path.`);
  }
  if (start) {
    const reachable = new Set<string>();
    const pending = [start.id];
    while (pending.length) {
      const nodeId = pending.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      workflow.edges.filter((edge) => edge.source === nodeId && ids.has(edge.target)).forEach((edge) => pending.push(edge.target));
    }
    const unreachable = workflow.nodes.filter((node) => !reachable.has(node.id));
    if (unreachable.length) errors.push(`Unreachable nodes: ${unreachable.map((node) => node.data.title || node.id).join(", ")}.`);
    if (!workflow.nodes.some((node) => node.type === "end" && reachable.has(node.id))) errors.push("The workflow has no reachable end-node path.");
  }
  return [...new Set(errors)];
}
