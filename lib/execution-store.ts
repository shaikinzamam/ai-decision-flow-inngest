import "server-only";
import type { ExecutionRun } from "@/types/workflow";

declare global {
  var __aiDecisionRuns: Map<string, ExecutionRun> | undefined;
}

const runs = globalThis.__aiDecisionRuns ?? new Map<string, ExecutionRun>();
globalThis.__aiDecisionRuns = runs;

export const executionStore = {
  create(run: ExecutionRun) { runs.set(run.executionId, structuredClone(run)); },
  get(id: string) { const run = runs.get(id); return run ? structuredClone(run) : undefined; },
  update(id: string, update: Partial<ExecutionRun>) {
    const run = runs.get(id);
    if (!run) return;
    runs.set(id, { ...run, ...structuredClone(update) });
  },
};
