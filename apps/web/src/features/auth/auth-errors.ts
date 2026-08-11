"use client";

import { AuthError } from "@supabase/supabase-js";

export function friendlyAuthError(error: AuthError | null): string {
  if (!error) return "";
  switch (error.code) {
    case "email_exists":
      return "An account with this email already exists. Try signing in instead.";
    case "weak_password":
      return "That password is too weak. Use at least 6 characters.";
    case "invalid_credentials":
      return "Invalid email or password. Check your details and try again.";
    case "validation_failed":
      return "That email address looks invalid. Check it and try again.";
    case "over_email_send_rate_limit":
      return "Too many emails sent recently. Wait a minute and try again.";
    case "email_not_confirmed":
      return "Confirm your email address before signing in. Check your inbox.";
    default:
      break;
  }

  const message = error.message ?? "";
  if (message.includes("registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password. Check your details and try again.";
  }
  if (message.includes("at least 6 characters")) {
    return "That password is too weak. Use at least 6 characters.";
  }
  if (message.includes("email address")) {
    return "That email address looks invalid. Check it and try again.";
  }
  if (message.includes("rate limit")) {
    return "Too many requests recently. Wait a minute and try again.";
  }
  if (message.includes("Failed to fetch") || message.includes("Network")) {
    return "Network error. Check your connection and try again.";
  }
  if (
    message.includes("Supabase") ||
    message.includes("configuration") ||
    message.includes("initialize")
  ) {
    return "Authentication is not configured yet. Try again later.";
  }
  return "Something went wrong. Please try again.";
}
