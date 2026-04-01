# Keycloak Access Portal

一个部署在 EKS 上的统一入口页，作为 **Keycloak 的一个 OIDC client** 登录。用户登录后，根据 Keycloak token / userinfo 中的 `groups` 与用户属性（如 `awsRole`、`aliyunRole`）动态显示自己有权访问的系统入口。

当前内置入口：

- AWS SSO
- 阿里云 SSO
- Cloudflare Dashboard

后续可以继续扩更多企业系统。

---

## 设计目标

- **入口统一**：给企业内部用户一个类似 Okta / Microsoft Entra My Apps 的入口页
- **权限跟随 Keycloak**：显示逻辑根据 Keycloak groups 和用户属性决定
- **下游系统独立**：AWS / 阿里云 / Cloudflare 各自仍然保持自己的 SAML / OIDC 登录方式
- **部署简单**：容器化，适合直接部署到 EKS

---

## 技术栈

- Next.js 15 (App Router)
- NextAuth v5 beta
- Keycloak OIDC
- Tailwind CSS

---

## 核心思路

### 1. 把这个入口页注册成 Keycloak client

建议在 realm `devops` 中新增一个 OIDC client，例如：

- Client ID: `access-portal`
- Client Protocol: `openid-connect`
- Access Type / Client authentication: `confidential`
- Root URL: `https://portal.optlink.top`
- Valid redirect URIs:
  - `https://portal.optlink.top/api/auth/callback/keycloak`
- Valid post logout redirect URIs:
  - `https://portal.optlink.top/signin`
  - `https://portal.optlink.top/*`
- Web origins:
  - `https://portal.optlink.top`

### 2. 给 access-portal client 加 groups + 用户属性映射

你需要确保 Keycloak 在 ID token / access token / userinfo 里带上：

- `groups`
- `awsRole`
- `aliyunRole`

推荐做法：

#### groups

- 新建或复用一个 client scope，比如 `groups`
- 添加 mapper：**Group Membership**
- Token Claim Name: `groups`
- Full group path: 可按需开启/关闭
- Add to ID token: ON
- Add to access token: ON
- Add to userinfo: ON

#### 用户属性 awsRole / aliyunRole

再给这个 client 增加两个 **User Attribute** mapper：

- User Attribute: `awsRole`
- Token Claim Name: `awsRole`
- Claim JSON Type: `String`（或者按你的实际结构改成数组）
- Add to ID token: ON
- Add to access token: ON
- Add to userinfo: ON

以及：

- User Attribute: `aliyunRole`
- Token Claim Name: `aliyunRole`
- Claim JSON Type: `String`
- Add to ID token: ON
- Add to access token: ON
- Add to userinfo: ON

如果一个用户有多条值，你有两种做法：

1. **一个属性多值**（更标准）
2. **一个字符串里换行分隔 / 分号分隔**（当前程序也兼容）

这样前端可以直接根据属性判断：

- `awsRole` 有值 → 显示 AWS 入口
- `aliyunRole` 有值 → 显示阿里云入口
- Cloudflare 暂时仍可按 groups 或后续单独属性扩展

### 3. 前端只做“展示”

这个入口页只决定“显示哪些入口卡片”，**不负责真正授权**。

也就是说：

- 用户能不能看到 AWS 卡片 → 看 groups
- 用户点进去后能不能真正登录 AWS 对应账户 / 角色 → 仍由 AWS SSO + Keycloak/SAML 映射决定

这样架构比较稳，入口页不会变成新的授权中心。

---

## 权限规则位置

应用入口配置在：

- `lib/apps.ts`

示例：

```ts
{
  id: "aws-sso",
  name: "AWS Access Portal",
  href: "https://auth.optlink.top/realms/devops/protocol/saml/clients/aws",
  requiredAttributesAny: ["awsRole"],
  groupsAny: ["aws", "aws-access", "devops", "platform", "cloud-admin"]
}
```

含义是：

- 优先判断用户是否有 `awsRole`
- 如果有，就显示 AWS 入口
- 如果没有，也可以继续用 `groupsAny` 作为兜底逻辑

后续你接新系统时，只需要继续往这个数组里加对象即可。

---

## 本地开发

```bash
cp .env.example .env.local
npm install
npm run dev
```

访问：

- `http://localhost:3000/signin`

---

## 环境变量

参考 `.env.example`：

```env
AUTH_SECRET=replace-with-a-random-32-byte-secret
AUTH_URL=https://portal.optlink.top
KEYCLOAK_ISSUER=https://auth.optlink.top/realms/devops
KEYCLOAK_CLIENT_ID=access-portal
KEYCLOAK_CLIENT_SECRET=replace-with-client-secret
KEYCLOAK_SCOPE=openid profile email groups
PORTAL_TITLE=Optlink Access Portal
PORTAL_SUBTITLE=统一入口，按 Keycloak 用户组动态展示可访问系统
```

---

## 构建镜像

```bash
docker build -t ghcr.io/your-org/access-portal:latest .
```

---

## 部署到 EKS

Kubernetes 清单位于：

- `k8s/namespace.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/ingress.yaml`
- `k8s/secret.example.yaml`

### 建议步骤

1. 先创建 secret
2. 替换 deployment 中的镜像地址
3. 应用 kustomize

```bash
kubectl apply -f k8s/secret.example.yaml
kubectl apply -k k8s/
```

### Ingress 说明

示例中默认按 **AWS Load Balancer Controller + ALB Ingress** 来写。

如果你 EKS 用的是 NGINX Ingress，需要把 `k8s/ingress.yaml` 改成 nginx 风格注解。

---

## 你后面最可能想做的增强

### 1. 后台配置化入口

现在入口定义写在 `lib/apps.ts`。
以后可以改成：

- ConfigMap / Secret 注入 JSON
- 从数据库读取
- 从 Keycloak client metadata 动态生成

### 2. 更细颗粒度的规则

现在是按组控制卡片可见性。
后面可以扩成：

- `groupsAll`
- 按 email domain
- 按 realm role / client role
- 按环境（prod / test）

### 3. 自动从 Keycloak 拉可见应用

如果你以后 client 多了，最理想的方向其实是：

- 在 Keycloak 里给每个 client 打标签或加 attribute
- 入口页通过 Admin API 拉取“允许展示”的 client 列表
- 再结合当前用户 groups 做过滤

不过这个版本先不建议上来就做，因为：

- 需要服务账号访问 Keycloak Admin API
- 权限模型更复杂
- 首版先静态配置最稳

---

## 安全建议

- 不要把真正的授权判断放在这个入口页上
- 入口页只负责 UX，不负责最终权限兜底
- Keycloak client secret 放 Kubernetes Secret
- `AUTH_SECRET` 用强随机值
- 建议给 portal 单独域名，比如 `portal.optlink.top`
- 建议只走 HTTPS

---

## 目录结构

```text
app/                    # Next.js 页面
components/             # UI 组件
lib/auth.ts             # NextAuth + Keycloak 配置
lib/apps.ts             # 可见入口规则
k8s/                    # Kubernetes 清单
Dockerfile              # 容器构建
```

---

## 适合你的当前场景

你现在已经有：

- AWS SSO（基于 group 控制账户/角色）
- 阿里云 SSO（基于 group 控制权限）
- Cloudflare（官方入口 + 企业邮箱触发 SSO）

这个 portal 会把它们整合成一个统一入口，用户登录后直接看到自己能用的系统，不用再记各种 URL。

在你的模型里更准确地说：

- 用户有 `awsRole` 属性 → 显示 AWS 入口
- 用户有 `aliyunRole` 属性 → 显示阿里云入口
- 用户点进对应 SAML client 后，就会看到该用户对应的账户和角色

也就是说，门户不需要自己解析 AWS / 阿里云角色并生成下游登录，只需要正确判断入口是否展示。
