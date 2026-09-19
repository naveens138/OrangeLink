/**
 * Where the signup wizard leaves the username someone picked when their
 * signup needs an email confirmation first. The claim screen reads it when
 * they come back signed in, so the name survives the trip through the inbox.
 *
 * Browser storage, so it is per device and can be missing: both sides treat
 * it as a convenience, never as the source of truth. The name is re-checked
 * and re-claimed server-side regardless.
 */
export const PENDING_USERNAME_KEY = "orangelink:pending-username";
