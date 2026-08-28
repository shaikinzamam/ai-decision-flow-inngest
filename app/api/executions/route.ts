import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { executionStore } from "@/lib/execution-store";
import { validateWorkflow, workflowSchema } from "@/lib/workflow-validation";

const executionRequestSchema = z.object({
  workflow: workflowSchema,
  input: z.string().trim().min(1, "Enter a message before running the workflow."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid execution request", details: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = executionRequestSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    if (process.env.NODE_ENV === "development") console.error("Invalid execution request", details);
    return NextResponse.json({ error: "Invalid execution request", details }, { status: 400 });
  }

  const { workflow, input } = parsed.data;
  const errors = validateWorkflow(workflow);
  if (errors.length) {
    if (process.env.NODE_ENV === "development") console.error("Workflow validation failed", errors);
    return NextResponse.json({ error: "Workflow validation failed", details: errors }, { status: 400 });
  }

  const executionId = crypto.randomUUID();
  executionStore.create({ executionId, workflowId: workflow.id, workflowName: workflow.name, status: "queued", input, startedAt: new Date().toISOString(), steps: [] });

  try {
    await inngest.send({ name: "workflow/run.requested", data: { ...workflow, input, executionId } });
    return NextResponse.json({ executionId }, { status: 202 });
  } catch (error) {
    executionStore.update(executionId, {
      status: "failed",
      error: "Unable to start workflow execution.",
      completedAt: new Date().toISOString(),
    });
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown Inngest error";
    console.error("Unable to send workflow/run.requested to Inngest", reason);
    return NextResponse.json({ error: "Unable to start workflow execution" }, { status: 500 });
  }
}
