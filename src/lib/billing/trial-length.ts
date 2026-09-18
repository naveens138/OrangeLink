/**
 * How long every new creator gets free, from the moment they claim a
 * username.
 *
 * On its own in a module with no server-only import, because the signup
 * screen says the number out loud and that screen is a client component.
 * entitlement.ts and trial.ts re-use it rather than restating it.
 */
export const TRIAL_DAYS = 14;
