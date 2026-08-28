import type { Workflow } from "@/types/workflow";

export const defaultWorkflow: Workflow = {
  version: 1,
  id: "customer-request-router",
  name: "Customer Request Router",
  startNodeId: "support",
  nodes: [
    { id: "support", type: "decision", position: { x: 40, y: 210 }, data: { title: "Support Request?", prompt: "Is the user's message primarily asking for customer support or help with a problem?", isStart: true } },
    { id: "urgent", type: "decision", position: { x: 370, y: 70 }, data: { title: "Urgent Issue?", prompt: "Does the user's issue appear urgent, severe, account-blocking, payment-related, or require immediate human attention?" } },
    { id: "sales-lead", type: "decision", position: { x: 370, y: 360 }, data: { title: "Sales Lead?", prompt: "Does the user's message show interest in buying, subscribing to, pricing, demos, partnerships, or becoming a customer?" } },
    { id: "escalate", type: "end", position: { x: 730, y: 10 }, data: { title: "Escalate", prompt: "" } },
    { id: "standard-support", type: "end", position: { x: 730, y: 170 }, data: { title: "Standard Support", prompt: "" } },
    { id: "sales", type: "end", position: { x: 730, y: 330 }, data: { title: "Sales", prompt: "" } },
    { id: "general", type: "end", position: { x: 730, y: 490 }, data: { title: "General", prompt: "" } },
  ],
  edges: [
    { id: "support-yes", source: "support", target: "urgent", sourceHandle: "YES", data: { condition: "YES" } },
    { id: "support-no", source: "support", target: "sales-lead", sourceHandle: "NO", data: { condition: "NO" } },
    { id: "urgent-yes", source: "urgent", target: "escalate", sourceHandle: "YES", data: { condition: "YES" } },
    { id: "urgent-no", source: "urgent", target: "standard-support", sourceHandle: "NO", data: { condition: "NO" } },
    { id: "sales-yes", source: "sales-lead", target: "sales", sourceHandle: "YES", data: { condition: "YES" } },
    { id: "sales-no", source: "sales-lead", target: "general", sourceHandle: "NO", data: { condition: "NO" } },
  ],
};
