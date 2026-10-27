import { AuthConfigurationError } from "./errors";

export type ActiveDirectoryConfig = {
  url: string;
  domain: string;
  baseDn: string;
  userFilter: string;
  allowedGroups: string[];
  rejectUnauthorized: boolean;
};

export function activeDirectoryConfig(): ActiveDirectoryConfig {
  const url = process.env.CENTRAL_AD_URL?.trim() || "";
  const domain = process.env.CENTRAL_AD_DOMAIN?.trim() || "";
  const baseDn = process.env.CENTRAL_AD_BASE_DN?.trim() || "";
  const userFilter = process.env.CENTRAL_AD_USER_FILTER?.trim()
    || "(&(objectCategory=person)(objectClass=user)(sAMAccountName={0}))";
  const allowedGroups = (process.env.CENTRAL_AD_ALLOWED_GROUPS || "")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);
  const allowInsecureLdap = parseBoolean(process.env.CENTRAL_AD_ALLOW_INSECURE_LDAP);
  const rejectUnauthorized = process.env.CENTRAL_AD_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false";

  if (!url || !domain || !baseDn || !userFilter.includes("{0}") || allowedGroups.length === 0) {
    throw new AuthConfigurationError("Configuração do Active Directory incompleta.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AuthConfigurationError("CENTRAL_AD_URL é inválida.");
  }
  if (!new Set(["ldap:", "ldaps:"]).has(parsedUrl.protocol)) {
    throw new AuthConfigurationError("CENTRAL_AD_URL deve usar ldap:// ou ldaps://.");
  }
  if (parsedUrl.protocol === "ldap:" && !allowInsecureLdap) {
    throw new AuthConfigurationError(
      "LDAP sem criptografia está bloqueado. Use LDAPS ou habilite-o apenas temporariamente.",
    );
  }

  return { url, domain, baseDn, userFilter, allowedGroups, rejectUnauthorized };
}

function parseBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}
