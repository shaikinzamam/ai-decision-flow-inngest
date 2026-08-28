import type { ExecutionRun, Workflow } from "@/types/workflow";

const WORKFLOWS_KEY = "ai-decision-flow:workflows:v1";
const HISTORY_KEY = "ai-decision-flow:history:v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
}

export const workflowStorage = {
  list: () => read<Workflow[]>(WORKFLOWS_KEY, []),
  save(workflow: Workflow) {
    const items = this.list();
    const index = items.findIndex((item) => item.id === workflow.id);
    if (index >= 0) items[index] = workflow; else items.unshift(workflow);
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(items));
  },
  remove(id: string) {
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(this.list().filter((item) => item.id !== id)));
  },
};

export const historyStorage = {
  list: () => read<ExecutionRun[]>(HISTORY_KEY, []),
  add(run: ExecutionRun) {
    const items = [run, ...this.list().filter((item) => item.executionId !== run.executionId)].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  },
};
