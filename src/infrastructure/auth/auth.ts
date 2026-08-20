import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/infrastructure/database/prisma";
import { sendTransactionalEmail } from "@/infrastructure/email/email-service";
import { localIPv4Addresses } from "@/infrastructure/auth/local-addresses";
import { resolveTrustedOrigins } from "@/shared/lib/trusted-origins";

const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const development = process.env.NODE_ENV !== "production";

export const auth = betterAuth({
  appName: "Coin Secret",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  // A deployment can answer on more than one origin — the current domain and
  // the one it was renamed from. Naming only `appUrl` here made every sign-in
  // from the other domain fail as "Invalid origin".
  trustedOrigins: resolveTrustedOrigins({
    appUrl,
    extra: process.env.TRUSTED_ORIGINS,
    development,
    lanAddresses: development ? localIPv4Addresses() : [],
  }),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset password Coin Secret",
        html: `<p>Gunakan tautan berikut untuk mengatur ulang password:</p><p><a href="${url}">Reset password</a></p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verifikasi email Coin Secret",
        html: `<p>Verifikasi akun Coin Secret melalui tautan berikut:</p><p><a href="${url}">Verifikasi email</a></p>`,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
        input: false,
      },
      plan: {
        type: "string",
        required: true,
        defaultValue: "FREE",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "coinsecret",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
