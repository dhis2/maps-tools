# Coordinate fallback field: cross-version findings

Empirical results from running `index.js` → `runAnalytics.js` → `verify.js --mode=full`
against every version below, using the same generated dataset (see `README.md`).

## Results

| Version                      | Instance          | Fallback mechanism (non-OU cases)                                                                                  | `fallbackCoordinateField`/`defaultCoordinateFallback` = OU-type field | `geometrySource` in response |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------- |
| 2.40.12 (stable)             | `stable-2-40-12`  | ✅ works                                                                                                           | ❌ E7145 (SQL COALESCE geometry/text)                                 | not present                  |
| 2.40.13-SNAPSHOT (dev)       | `dev-2-40`        | ✅ works                                                                                                           | ❌ E7145                                                              | not present                  |
| 2.41.9 (stable)              | `stable-2-41-9`   | **untestable** — instance's `admin` account is in a broken permission state (unrelated to this feature), see below | —                                                                     | —                            |
| 2.42.5.1 (stable)            | `stable-2-42-5-1` | ✅ works                                                                                                           | ❌ E7145                                                              | not present                  |
| 2.42.6-SNAPSHOT (dev)        | `dev-2-42`        | ✅ works                                                                                                           | ❌ E7145                                                              | not present                  |
| 2.43.0.1 (stable)            | `stable-2-43-0-1` | ✅ works                                                                                                           | ❌ E7145                                                              | not present                  |
| 2.43.2-SNAPSHOT (dev)        | `dev-2-43`        | ✅ works                                                                                                           | ❌ E7145                                                              | not present                  |
| 2.44-SNAPSHOT (dev/mainline) | `dev`             | ✅ works                                                                                                           | ✅ fixed                                                              | ✅ present (see below)       |

Every version shows the exact same signature: **15120/18752 comparisons pass, 3632 fail**,
always the same combinations (fallback field is one of the two `ORGANISATION_UNIT`-valueType
fields). Main field, cascading order (Event > Enrollment > TrackedEntity > OrgUnit), and every
other fallback type resolve correctly and identically on every version tested.

## Key findings

1. **The fallback mechanism itself is solid and version-stable.** Main-field resolution,
   `cascading`, and fallback to org unit / enrollment / tracked entity / a custom
   `COORDINATE`-type field all work correctly on every released and dev version tested — this
   isn't a fragile, half-working feature.

2. **E7145 (`COALESCE types geometry and text cannot be matched`) is present on every
   currently-released version** (2.40.x, 2.42.x, 2.43.x, stable and dev alike). It triggers
   whenever `fallbackCoordinateField` is set to a data element/attribute of
   `valueType: ORGANISATION_UNIT` — regardless of what the main field is. **Fixed only on
   unreleased mainline (2.44-SNAPSHOT)** — no released branch has the fix yet.

3. **`geometrySource` is a 2.44-only addition.** On 2.40–2.43 (dev and stable), requesting it
   as a dimension is rejected outright (`E7224`, "not part of the program"), and it's never
   returned automatically. On 2.44-SNAPSHOT, it's returned **automatically** (no dimension
   request needed) whenever a fallback is configured (`fallbackCoordinateField` or
   `defaultCoordinateFallback=true`), and is absent when no fallback is set. It correctly
   labels which source won per row (e.g. `psigeometry`, `ougeometry`).

4. **Cascade order is not version-dependent.** Event > Enrollment > TrackedEntity > OrgUnit
   holds on every version tested — the earlier `CoordinateField.jsx` help text bug (fixed
   this session) wasn't chasing a moving target.

## Caveat: stable-2-41-9

This shared public demo's `admin` account (`Mesh Mesha`) has a `Superuser` role without the
`ALL` bypass authority, and rejects tracker writes to org units even when correctly nested
under the user's own assigned org unit (confirmed via minimal single-event `curl` tests,
and after forcing an analytics/org-structure rebuild). Very likely another user's testing
altered this account. Treat 2.41.9 as an open question, not a "broken" data point — 2.40 and
2.42 both show identical behavior, so 2.41 is presumptively the same, but unconfirmed.

## Practical implication

Until 2.44 ships, `fallbackCoordinateField` pointed at an `ORGANISATION_UNIT`-valueType field
should be treated as broken on every released DHIS2 core version. Every other
fallback/cascade combination is safe to ship against on all tested versions.
