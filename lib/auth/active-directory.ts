import { Client, Filter, InvalidCredentialsError, type Entry } from "ldapts";
import type { AuthUser } from "@/types/auth";
import { belongsToAllowedGroup, extractAccountName } from "./account.mjs";
import { activeDirectoryConfig } from "./config";
import {
  ActiveDirectoryUnavailableError,
  AuthConfigurationError,
  InvalidLoginError,
  UnauthorizedGroupError,
} from "./errors";

export async function authenticateWithActiveDirectory(
  rawUsername: string,
  password: string,
): Promise<AuthUser> {
  const username = rawUsername.trim();
  if (!username || !password || username.length > 256 || password.length > 1024) {
    throw new InvalidLoginError("Usuário ou senha inválidos.");
  }

  const config = activeDirectoryConfig();
  const accountName = extractAccountName(username);
  if (!accountName) throw new InvalidLoginError("Usuário ou senha inválidos.");

  const principal = username.includes("@") || username.includes("\\")
    ? username
    : `${username}@${config.domain}`;
  const client = new Client({
    url: config.url,
    connectTimeout: 5_000,
    timeout: 5_000,
    tlsOptions: config.url.startsWith("ldaps://")
      ? { rejectUnauthorized: config.rejectUnauthorized, minVersion: "TLSv1.2" }
      : undefined,
  });

  try {
    await client.bind(principal, password);
    const filter = config.userFilter.replace("{0}", Filter.escape(accountName));
    const { searchEntries } = await client.search(config.baseDn, {
      scope: "sub",
      filter,
      attributes: ["objectGUID", "sAMAccountName", "displayName", "mail", "memberOf"],
      explicitBufferAttributes: ["objectGUID"],
      sizeLimit: 2,
      timeLimit: 5,
    });

    if (searchEntries.length !== 1) {
      throw new InvalidLoginError("Usuário ou senha inválidos.");
    }

    const entry = searchEntries[0];
    if (!belongsToAllowedGroup(entryValues(entry, "memberOf"), config.allowedGroups)) {
      throw new UnauthorizedGroupError("Seu usuário não possui acesso à Central de Avisos.");
    }

    const login = entryValue(entry, "sAMAccountName") || accountName;
    const guid = entryBuffer(entry, "objectGUID");
    return {
      id: guid ? objectGuidToUuid(guid) : login.toLocaleLowerCase("pt-BR"),
      username: login,
      name: entryValue(entry, "displayName") || login,
      email: entryValue(entry, "mail") || null,
    };
  } catch (error) {
    if (
      error instanceof InvalidLoginError
      || error instanceof UnauthorizedGroupError
      || error instanceof AuthConfigurationError
    ) {
      throw error;
    }
    if (error instanceof InvalidCredentialsError) {
      throw new InvalidLoginError("Usuário ou senha inválidos.");
    }
    console.error("Falha ao consultar o Active Directory:", errorName(error));
    throw new ActiveDirectoryUnavailableError(
      "O Active Directory está indisponível no momento. Tente novamente em instantes.",
    );
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

function entryValue(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function entryValues(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function entryBuffer(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value) && value[0] instanceof Uint8Array) return value[0];
  return null;
}

function entryAttribute(entry: Entry, attribute: string) {
  const key = Object.keys(entry).find((candidate) => candidate.toLowerCase() === attribute.toLowerCase());
  return key ? entry[key] : undefined;
}

function objectGuidToUuid(bytes: Uint8Array) {
  if (bytes.length !== 16) {
    throw new ActiveDirectoryUnavailableError("O AD retornou um identificador inválido.");
  }
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex[3]}${hex[2]}${hex[1]}${hex[0]}-${hex[5]}${hex[4]}-${hex[7]}${hex[6]}-${hex[8]}${hex[9]}-${hex.slice(10).join("")}`;
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}
