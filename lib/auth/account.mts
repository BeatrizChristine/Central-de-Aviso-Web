export function belongsToAllowedGroup(userGroups: string[], allowedGroups: string[]) {
  return userGroups.some((userGroup) => allowedGroups.some((allowedGroup) => {
    if (allowedGroup.toLocaleLowerCase("pt-BR").startsWith("cn=")) {
      return userGroup.localeCompare(allowedGroup, undefined, { sensitivity: "accent" }) === 0;
    }
    return userGroup.toLocaleLowerCase("pt-BR").startsWith(
      `cn=${allowedGroup},`.toLocaleLowerCase("pt-BR"),
    );
  }));
}

export function roleForGroups(userGroups: string[], ntiGroups: string[], gecomGroups: string[]) {
  if (belongsToAllowedGroup(userGroups, ntiGroups)) return "nti";
  if (belongsToAllowedGroup(userGroups, gecomGroups)) return "gecom";
  return null;
}

export function extractAccountName(username: string) {
  const withoutDomain = username.includes("\\")
    ? username.slice(username.lastIndexOf("\\") + 1)
    : username;
  return (withoutDomain.includes("@")
    ? withoutDomain.slice(0, withoutDomain.indexOf("@"))
    : withoutDomain).trim();
}
