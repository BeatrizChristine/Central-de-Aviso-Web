import { NextResponse } from "next/server";
import {
  ActiveDirectoryUnavailableError,
  AUTH_COOKIE_NAME,
  AuthConfigurationError,
  authenticateWithActiveDirectory,
  createSessionToken,
  InvalidLoginError,
  sessionCookieOptions,
  UnauthorizedGroupError,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown; remember?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados de login inválidos." }, { status: 400 });
  }

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Informe o usuário e a senha." }, { status: 400 });
  }

  try {
    const user = await authenticateWithActiveDirectory(body.username, body.password);
    const session = await createSessionToken(user, body.remember === true);
    const response = NextResponse.json({ user });
    response.cookies.set(AUTH_COOKIE_NAME, session.token, sessionCookieOptions(session.maxAge));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof InvalidLoginError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof UnauthorizedGroupError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthConfigurationError || error instanceof ActiveDirectoryUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Falha inesperada no login:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Não foi possível realizar o login." }, { status: 500 });
  }
}
