import { DefaultSession } from "next-auth";

export type UserAttributes = Record<string, string | string[]>;

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user: DefaultSession["user"] & {
      id: string;
      groups: string[];
      username?: string;
      attributes: UserAttributes;
      canAccessAws?: boolean;
      canAccessAliyun?: boolean;
      canAccessCloudflare?: boolean;
    };
  }

  interface User {
    groups?: string[];
    username?: string;
    attributes?: UserAttributes;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    groups?: string[];
    preferred_username?: string;
    accessToken?: string;
    idToken?: string;
    attributes?: UserAttributes;
  }
}
