import { EventSchemas, Inngest } from "inngest";
import type { WorkflowRunPayload } from "@/types/workflow";

type Events = { "workflow/run.requested": { data: WorkflowRunPayload } };

export const inngest = new Inngest({
  id: "ai-decision-flow",
  schemas: new EventSchemas().fromRecord<Events>(),
});
