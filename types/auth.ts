export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
};

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string"
    && typeof user.username === "string"
    && typeof user.name === "string"
    && (user.email === null || typeof user.email === "string");
}
