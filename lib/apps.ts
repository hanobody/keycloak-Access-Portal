import fs from "node:fs";
import path from "node:path";
import { hasAttributeValue, type UserAttributes } from "@/lib/user-attributes";

export type PortalApp = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  badge?: string;
  groupsAny?: string[];
  groupsAll?: string[];
  requiredAttributesAny?: string[];
  tags?: string[];
  external?: boolean;
};

const fallbackApps: PortalApp[] = [
  {
    id: "aws-sso",
    name: "AWS Access Portal",
    description: "进入 AWS SSO，根据你的 Keycloak 角色属性查看可访问账户与角色。",
    href: "https://auth.optlink.top/realms/devops/protocol/saml/clients/aws",
    icon: "☁️",
    badge: "AWS SSO",
    requiredAttributesAny: ["awsRole"],
    groupsAny: ["aws", "aws-access", "devops", "platform", "cloud-admin"],
    tags: ["AWS", "IAM", "SAML"],
    external: true,
  },
  {
    id: "aliyun-sso",
    name: "阿里云访问入口",
    description: "进入阿里云 SSO，根据你的 Keycloak 角色属性查看可访问账号与角色。",
    href: "https://auth.optlink.top/realms/devops/protocol/saml/clients/aliyun",
    icon: "🌀",
    badge: "Aliyun SSO",
    requiredAttributesAny: ["aliyunRole"],
    groupsAny: ["aliyun", "aliyun-access", "devops", "platform", "cloud-admin"],
    tags: ["Aliyun", "RAM", "SAML"],
    external: true,
  },
  {
    id: "cloudflare",
    name: "Cloudflare Dashboard",
    description: "进入 Cloudflare 官方控制台，通过企业 SSO 完成身份校验。",
    href: "https://dash.cloudflare.com/",
    icon: "🛡️",
    badge: "Cloudflare",
    groupsAny: ["cloudflare", "cloudflare-access", "devops", "platform", "cloud-admin"],
    tags: ["Cloudflare", "Zero Trust"],
    external: true,
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

function getConfigPath() {
  return process.env.PORTAL_APPS_CONFIG_PATH || path.join(process.cwd(), "config", "apps.runtime.json");
}

export function loadPortalApps(): PortalApp[] {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) return fallbackApps;
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as PortalApp[];
    return Array.isArray(parsed) && parsed.length ? parsed : fallbackApps;
  } catch {
    return fallbackApps;
  }
}

export function getVisibleApps(userGroups: string[], userAttributes: UserAttributes = {}) {
  const normalizedGroups = userGroups.map(normalize);

  return loadPortalApps().filter((app) => {
    const groupsAny = app.groupsAny?.map(normalize) ?? [];
    const groupsAll = app.groupsAll?.map(normalize) ?? [];
    const requiredAttributesAny = app.requiredAttributesAny ?? [];

    const anyMatched = groupsAny.length === 0 || groupsAny.some((group) => normalizedGroups.includes(group));
    const allMatched = groupsAll.length === 0 || groupsAll.every((group) => normalizedGroups.includes(group));
    const attributeMatched =
      requiredAttributesAny.length === 0 || requiredAttributesAny.some((key) => hasAttributeValue(userAttributes, key));

    return attributeMatched || (anyMatched && allMatched);
  });
}
