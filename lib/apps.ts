import fs from "node:fs";
import path from "node:path";
import { hasAttributeValue, type UserAttributes } from "@/lib/user-attributes";

export type PortalTabSection = {
  id: string;
  name: string;
  description?: string;
};

export type PortalTab = {
  id: string;
  name: string;
  description?: string;
  sections?: PortalTabSection[];
  groupsAny?: string[];
  groupsAll?: string[];
  requiredAttributesAny?: string[];
};

export type PortalApp = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  badge?: string;
  tabId?: string;
  sectionId?: string;
  groupsAny?: string[];
  groupsAll?: string[];
  requiredAttributesAny?: string[];
  tags?: string[];
  external?: boolean;
};

type PortalTabsConfig = {
  defaultTabId?: string;
  tabs: PortalTab[];
};

const fallbackTabsConfig: PortalTabsConfig = {
  defaultTabId: "cloud-infra",
  tabs: [
    {
      id: "cloud-infra",
      name: "云设施",
      description: "云平台、账号体系与基础设施入口。",
      sections: [{ id: "default", name: "默认" }],
    },
    {
      id: "intl-business",
      name: "国际盘",
      description: "国际业务相关系统入口。",
      sections: [{ id: "default", name: "默认" }],
    },
    {
      id: "ld-project",
      name: "LD项目",
      description: "LD 项目相关系统入口。",
      sections: [{ id: "default", name: "默认" }],
    },
  ],
};

const fallbackApps: PortalApp[] = [
  {
    id: "aws-sso",
    name: "AWS Access Portal",
    description: "进入 AWS SSO，根据你的 Keycloak 角色属性查看可访问账户与角色。",
    href: "https://auth.optlink.top/realms/devops/protocol/saml/clients/aws",
    icon: "☁️",
    badge: "AWS SSO",
    tabId: "cloud-infra",
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
    tabId: "cloud-infra",
    requiredAttributesAny: ["aliyunRole"],
    groupsAny: ["aliyun", "aliyun-access", "devops", "platform", "cloud-admin"],
    tags: ["Aliyun", "RAM", "SAML"],
    external: true,
  },
  {
    id: "cloudflare",
    name: "Cloudflare Dashboard",
    description: "输入企业邮箱完成登陆，需邀请",
    href: "https://dash.cloudflare.com/",
    icon: "🛡",
    badge: "Cloudflare",
    tabId: "cloud-infra",
    groupsAny: ["cloudflare"],
    tags: ["Cloudflare", "Zero Trust"],
    external: true,
  },
  {
    id: "zoho-mail",
    name: "Zoho Mail",
    description: "输入企业邮箱即可完成SSO登陆",
    href: "https://mail.zoho.eu/zm/",
    icon: "✉️",
    badge: "Mail",
    tabId: "intl-business",
    tags: ["Zoho", "Mail", "SSO"],
    external: true,
  },
  {
    id: "imperva",
    name: "Imperva",
    description: "进入 Imperva，通过企业 SSO 登录。",
    href: "https://auth.optlink.top/realms/devops/protocol/saml/clients/imperva",
    icon: "🛡",
    badge: "SAML",
    tabId: "cloud-infra",
    groupsAny: ["imperva"],
    tags: ["Imperva", "Security", "WAF"],
    external: true,
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

function getAppsConfigPath() {
  return process.env.PORTAL_APPS_CONFIG_PATH || path.join(process.cwd(), "config", "apps.runtime.json");
}

function getTabsConfigPath() {
  return process.env.PORTAL_TABS_CONFIG_PATH || path.join(process.cwd(), "config", "tabs.runtime.json");
}

export function loadPortalApps(): PortalApp[] {
  try {
    const configPath = getAppsConfigPath();
    if (!fs.existsSync(configPath)) return fallbackApps;
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as PortalApp[];
    return Array.isArray(parsed) && parsed.length ? parsed : fallbackApps;
  } catch {
    return fallbackApps;
  }
}

export function loadPortalTabs(): PortalTabsConfig {
  try {
    const configPath = getTabsConfigPath();
    if (!fs.existsSync(configPath)) return fallbackTabsConfig;
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PortalTabsConfig>;
    const tabs = Array.isArray(parsed.tabs) && parsed.tabs.length ? parsed.tabs : fallbackTabsConfig.tabs;
    const defaultTabId =
      typeof parsed.defaultTabId === "string" && parsed.defaultTabId.trim().length > 0
        ? parsed.defaultTabId
        : fallbackTabsConfig.defaultTabId;

    return { defaultTabId, tabs };
  } catch {
    return fallbackTabsConfig;
  }
}

function matchesVisibilityRules(
  normalizedGroups: string[],
  userAttributes: UserAttributes,
  item: {
    groupsAny?: string[];
    groupsAll?: string[];
    requiredAttributesAny?: string[];
  },
) {
  const groupsAny = item.groupsAny?.map(normalize) ?? [];
  const groupsAll = item.groupsAll?.map(normalize) ?? [];
  const requiredAttributesAny = item.requiredAttributesAny ?? [];

  const hasGroupRules = groupsAny.length > 0 || groupsAll.length > 0;
  const hasAttributeRules = requiredAttributesAny.length > 0;

  const anyMatched = groupsAny.length === 0 || groupsAny.some((group) => normalizedGroups.includes(group));
  const allMatched = groupsAll.length === 0 || groupsAll.every((group) => normalizedGroups.includes(group));
  const groupMatched = anyMatched && allMatched;
  const attributeMatched = requiredAttributesAny.some((key) => hasAttributeValue(userAttributes, key));

  if (hasGroupRules && hasAttributeRules) {
    return groupMatched || attributeMatched;
  }

  if (hasGroupRules) {
    return groupMatched;
  }

  if (hasAttributeRules) {
    return attributeMatched;
  }

  return true;
}

export function getVisibleTabs(userGroups: string[], userAttributes: UserAttributes = {}) {
  const normalizedGroups = userGroups.map(normalize);
  const { tabs } = loadPortalTabs();

  return tabs.filter((tab) => matchesVisibilityRules(normalizedGroups, userAttributes, tab));
}

export function getVisibleApps(userGroups: string[], userAttributes: UserAttributes = {}) {
  const normalizedGroups = userGroups.map(normalize);

  return loadPortalApps().filter((app) => matchesVisibilityRules(normalizedGroups, userAttributes, app));
}
