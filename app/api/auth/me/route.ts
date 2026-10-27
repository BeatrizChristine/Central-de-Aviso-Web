import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await readSession(request);
    if (!user) {
      return NextResponse.json(
        { error: "Sessão expirada ou inexistente." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "A autenticação não está configurada." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
