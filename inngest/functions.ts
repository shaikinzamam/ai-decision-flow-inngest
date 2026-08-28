import { inngest } from "@/inngest/client";
import { evaluateDecision } from "@/lib/ai";
import { executionStore } from "@/lib/execution-store";
import { validateWorkflow } from "@/lib/workflow-validation";
import type { ExecutionStep, Workflow } from "@/types/workflow";

export const MAX_STEPS = 20;

export const executeWorkflow = inngest.createFunction(
  { id: "execute-ai-decision-workflow", retries: 0 },
  { event: "workflow/run.requested" },
  async ({ event, step }) => {
    const payload = event.data;
    const workflow: Workflow = payload;
    const steps: ExecutionStep[] = [];
    executionStore.update(payload.executionId, { status: "running" });

    const finishFailure = (message: string, finalNodeId?: string) => {
      executionStore.update(payload.executionId, {
        status: "failed", error: message, completedAt: new Date().toISOString(),
        steps, finalNodeId,
      });
      return { status: "failed" as const, error: message, steps };
    };

    const validationErrors = validateWorkflow(workflow);
    if (validationErrors.length) return finishFailure(validationErrors.join(" "));

    let currentNodeId: string | undefined = payload.startNodeId;
    for (let index = 0; index < MAX_STEPS && currentNodeId; index += 1) {
      const node = payload.nodes.find((item) => item.id === currentNodeId);
      if (!node) return finishFailure(`Node ${currentNodeId} could not be found.`, currentNodeId);
      const startedAt = new Date().toISOString();

      if (node.type === "end") {
        await step.run(`reach-${node.id}-${index}`, async () => ({ nodeId: node.id, title: node.data.title }));
        steps.push({ order: index + 1, nodeId: node.id, nodeTitle: node.data.title, nodeType: "end", status: "completed", startedAt, completedAt: new Date().toISOString() });
        executionStore.update(payload.executionId, { status: "completed", completedAt: new Date().toISOString(), steps, finalNodeId: node.id, finalNodeTitle: node.data.title });
        return { status: "completed" as const, finalNodeId: node.id, steps };
      }

      const outcome = await step.run(`evaluate-${node.id}-${index}`, async () => {
        try { return { result: await evaluateDecision(payload.input, node.data.prompt ?? "") }; }
        catch (error) { return { error: error instanceof Error ? error.message : "Decision evaluation failed." }; }
      });
      if (!("result" in outcome)) {
        const message = outcome.error || "Decision evaluation failed.";
        steps.push({ order: index + 1, nodeId: node.id, nodeTitle: node.data.title, nodeType: "decision", status: "failed", startedAt, completedAt: new Date().toISOString(), error: message });
        return finishFailure(message, node.id);
      }

      const matchingEdge = payload.edges.find((edge) => edge.source === node.id && edge.data?.condition === outcome.result);
      steps.push({ order: index + 1, nodeId: node.id, nodeTitle: node.data.title, nodeType: "decision", result: outcome.result, status: "completed", startedAt, completedAt: new Date().toISOString(), traversedEdgeId: matchingEdge?.id });
      executionStore.update(payload.executionId, { status: "running", steps });
      if (!matchingEdge) return finishFailure(`${node.data.title} returned ${outcome.result}, but no matching edge exists.`, node.id);
      currentNodeId = matchingEdge.target;
    }

    return finishFailure("Workflow stopped because the maximum execution step count was exceeded. The graph may contain a cycle.", currentNodeId);
  },
);

export const inngestFunctions = [executeWorkflow];
