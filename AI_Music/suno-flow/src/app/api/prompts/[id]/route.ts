import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = await prisma.prompt.findUnique({ where: { id } });
  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(prompt);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
