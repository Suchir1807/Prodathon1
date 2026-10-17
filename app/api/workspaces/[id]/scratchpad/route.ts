import { NextResponse } from "next/server";

import { findAuthorizedWorkspace } from "@/lib/authorized-workspace";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findAuthorizedWorkspace(id, true);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  return NextResponse.json({ scratchpad: access.workspace.scratchpad ?? "" });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findAuthorizedWorkspace(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { scratchpad?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.scratchpad !== "string" || body.scratchpad.length > 200_000) {
    return NextResponse.json({ error: "Scratchpad must be text under 200 KB." }, { status: 400 });
  }

  access.workspace.scratchpad = body.scratchpad;
  await access.workspace.save();
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}