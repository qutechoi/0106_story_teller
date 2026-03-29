import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(track);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const track = await prisma.track.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(track);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.track.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
