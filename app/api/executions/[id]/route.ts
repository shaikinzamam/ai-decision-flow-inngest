import { NextResponse } from "next/server";
import { executionStore } from "@/lib/execution-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = executionStore.get(id);
  if (!run) return NextResponse.json({ error: "Execution not found or no longer available." }, { status: 404 });
  return NextResponse.json(run, { headers: { "Cache-Control": "no-store" } });
}
