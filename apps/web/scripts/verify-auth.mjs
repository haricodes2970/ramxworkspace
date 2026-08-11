/*
 * Authentication connectivity probe (no credentials hardcoded).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> \
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key> \
 *   node scripts/verify-auth.mjs [optional-test-email]
 *
 * Verifies: project reachability, invalid-login rejection, signup
 * confirmation state, unconfirmed-login lockout, and the reset-email
 * endpoint. When TEST_AUTH_EMAIL is provided, a signup probe is
 * performed against that address.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const testEmail = process.argv[2];

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(url, key);

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`ok: ${message}`);
}

const bad = await supabase.auth.signInWithPassword({
  email: "nobody@ramspace.test",
  password: "wrong-password",
});
assert(
  bad.error !== null &&
    (bad.error.code === "invalid_credentials" ||
      bad.error.message.includes("Invalid login credentials")),
  "invalid login rejected with invalid_credentials",
);

const reset = await supabase.auth.resetPasswordForEmail(
  `no-such-${Date.now()}@ramspace.test`,
  { redirectTo: "http://localhost:3000/update-password" },
);
if (reset.error && reset.error.code === "over_email_send_rate_limit") {
  console.log(
    "warn: reset email rate-limited (free-tier quota) — endpoint reached",
  );
} else {
  assert(reset.error === null, "reset email accepted without user enumeration");
}

if (testEmail) {
  const signup = await supabase.auth.signUp({
    email: testEmail,
    password: "test-password-123",
  });
  if (signup.error && signup.error.code === "email_exists") {
    console.log(`ok: signup rejects already-registered email ${testEmail}`);
  } else if (
    signup.error &&
    signup.error.code === "over_email_send_rate_limit"
  ) {
    console.log(
      "warn: signup email rate-limited (free-tier quota) — flow unreachable right now",
    );
  } else {
    assert(signup.error === null, `signup accepted for ${testEmail}`);
    assert(signup.data.session === null, "no session until email confirmation");

    const lockout = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: "test-password-123",
    });
    assert(
      lockout.error !== null &&
        (lockout.error.code === "email_not_confirmed" ||
          lockout.error.code === "invalid_credentials"),
      "unconfirmed user locked out of login",
    );
  }
}

console.log("auth verification passed");
