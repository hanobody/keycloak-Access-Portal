export type UserAttributes = Record<string, string | string[]>;

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

export function extractUserAttributes(profile: Record<string, unknown>): UserAttributes {
  const directAttributes = profile.attributes;
  const normalized: UserAttributes = {};

  if (directAttributes && typeof directAttributes === "object" && !Array.isArray(directAttributes)) {
    for (const [key, value] of Object.entries(directAttributes)) {
      if (Array.isArray(value)) {
        normalized[normalizeKey(key)] = value.filter((item): item is string => typeof item === "string");
      } else if (typeof value === "string") {
        normalized[normalizeKey(key)] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(profile)) {
    const normalizedKey = normalizeKey(key);
    if (["sub", "name", "email", "preferred_username", "given_name", "family_name", "groups", "attributes"].includes(normalizedKey)) {
      continue;
    }

    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      normalized[normalizedKey] = value;
    } else if (typeof value === "string") {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

export function getAttributeValues(attributes: UserAttributes, key: string) {
  const value = attributes[normalizeKey(key)];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function hasAttributeValue(attributes: UserAttributes, key: string) {
  return getAttributeValues(attributes, key).some((item) => item.trim().length > 0);
}

export function parseRoleAttributeValues(attributes: UserAttributes, key: string) {
  return getAttributeValues(attributes, key)
    .flatMap((item) => item.split(/\r?\n|;/))
    .map((item) => item.trim())
    .filter(Boolean);
}
