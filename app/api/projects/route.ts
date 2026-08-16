import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function parseProjectName(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string" &&
    (body as { name: string }).name.trim().length > 0
  ) {
    return (body as { name: string }).name.trim()
  }

  return "Untitled Project"
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const name = parseProjectName(body)

  const project = await prisma.project.create({
    data: { ownerId: userId, name },
  })

  return NextResponse.json({ project }, { status: 201 })
}
