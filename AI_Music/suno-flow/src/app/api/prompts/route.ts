import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(prompts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const prompt = await prisma.prompt.create({
    data: {
      name: body.name,
      genre: body.genre,
      template: body.template,
      parameters: body.parameters || "{}",
      isTemplate: false,
    },
  });
  return NextResponse.json(prompt, { status: 201 });
}
