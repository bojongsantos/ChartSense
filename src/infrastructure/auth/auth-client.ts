"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const AUTH_STATE_CHANGED_EVENT = "coinsecret:auth-state-changed";

export function notifyAuthStateChanged(): void {
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}
