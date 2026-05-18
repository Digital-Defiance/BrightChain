---
layout: default
title: "BrightDate: A Decimal-SI Universal Time Standard Anchored at J2000.0"
parent: "Papers"
---

# BrightDate: A Decimal-SI Universal Time Standard Anchored at J2000.0

**Version:** 1.0.0 (component) — Bright Spacetime Protocol (BSP) suite member

**Organization:** Digital Defiance (501c3)

**Author:** Jessica Mulein

**Reference implementation:** [`@brightchain/brightdate`](https://www.npmjs.com/package/@brightchain/brightdate)

**Status:** Stable component release (1.0.0); part of the BSP suite — comments and corrections welcome.

**Date:** 2026

---

## Abstract

Modern software engineering is burdened by a fragmented time landscape: UTC timezones, Unix milliseconds, Julian Dates, GPS weeks, TAI offsets, and leap-second ambiguities proliferate across distributed systems with no shared conceptual anchor. Every timestamp library re-derives the same conversions from the same patchwork of calendar artefacts, with errors accumulating at every interface boundary.

**BrightDate** proposes a principled alternative: a single, universal scalar count of decimal SI days elapsed since the J2000.0 astronomical epoch, computed on a TAI substrate that eliminates leap-second discontinuities from core arithmetic. The system ships three companion types — `BrightDate` (Float64, ergonomic), `BrightInstant` (BigInt TAI seconds + nanoseconds, rigorous), and `ExactBrightDate` (BigInt picoseconds, lossless archival) — that together cover the full spectrum from astronomy to blockchain-grade fidelity. For timestamps predating the J2000.0 epoch, a paged extension called **Pre-BrightDate (PBD)** replaces unbounded negative scalars with positive, human-legible era labels spanning Tera-second blocks (~31,710 Julian years each), reaching cleanly to the Big Bang without floating-point degradation.

---

## 1. The Problem: A Fragmented Time Landscape

### 1.1 The Legacy Stack

Every engineering team that works seriously with time eventually collides with the same set of incompatible standards:

| Standard | Definition | Core Problem |
|----------|-----------|--------------|
| Unix time | Integer seconds since 1970-01-01T00:00:00 UTC | Ambiguous at leap seconds; Y2038 for 32-bit representations |
| UTC | Civil timescale with leap-second corrections to UT1 | Leap seconds create discontinuities; timezone management is a major source of bugs |
| Julian Date (JD) | Days since 4713 BC noon (Julian proleptic calendar) | Enormous values (~2.45 million for the current era); origin is an arbitrary historical artefact |
| GPS time | Seconds since 1980-01-06T00:00:00 UTC, no leap seconds | Useful but niche; requires a week-number rollover table |
| ISO 8601 | String encoding of calendar dates | Not a time*scale*; requires parsing before arithmetic; timezone variants proliferate |

What does *not* exist is a public, vendor-neutral scalar that is:

1. **Astronomically grounded** — anchored to a living standard used by every observatory and space agency.
2. **TAI-based** — monotonic and free of leap-second discontinuities internally.
3. **Decimal and sortable** — trivially comparable and diffable with native operators.
4. **Honest about precision** — documents Float64 limits explicitly and provides a BigInt companion when they are insufficient.
5. **Extendable to deep time** — handles pre-epoch dates without sign confusion or floating-point catastrophe.

### 1.2 Why J2000.0?

The epoch **J2000.0** — defined as `2000-01-01T12:00:00 Terrestrial Time (TT)` — is the standard reference epoch of modern astronomy, used by every major observatory, the IAU, JPL ephemerides, and the IERS. It is not an arbitrary calendar date: it is a precisely defined physical instant whose exact relationship to TAI and UTC is fully specified. Anchoring a time standard here connects software engineering to the broader scientific community without inventing new constants.

### 1.3 Why TAI?

Coordinated Universal Time (UTC) is a civil timescale that periodically inserts leap seconds to keep clocks within 0.9 seconds of the Earth's rotation. These insertions create discontinuities: the UTC second `:59` is sometimes followed by `:60` before `:00`. For timekeeping arithmetic — computing elapsed durations, sorting, diffing — discontinuities are bugs waiting to happen. International Atomic Time (TAI) ticks at the same rate as UTC but never skips or repeats. BrightDate uses TAI as its substrate, relegating leap-second awareness to the conversion layer at UTC boundaries only.

---

## 2. Definitions

### 2.0 Canonical Epoch Definition

> The BrightDate epoch is **J2000.0**, defined as `2000-01-01T12:00:00.000 TT`. In TAI, this is `2000-01-01T11:59:27.816` (Unix TAI second `946,727,967.816`). The UTC label, as returned by standard software clocks, is `2000-01-01T11:58:55.816Z` (Unix millisecond `946,727,935,816`). All BrightDate and BrightSpacetime coordinate times are measured from this instant on a TAI substrate.

This block is identical across the BrightDate, Bright Spacetime, and BrightSpace specifications. The detail that follows in §2.1–§2.4 unpacks each piece for implementers.

### 2.1 The BrightDate Scalar

> **1 BrightDate unit = 1 SI day = 86,400 SI seconds**

A BrightDate value is a signed floating-point count of SI days elapsed since J2000.0, computed on a TAI substrate:

```
bd = (taiUnixSeconds − J2000_TAI_UNIX_S) / 86400
```

where `J2000_TAI_UNIX_S = 946,727,967.816` (the TAI Unix-second representation of J2000.0).

**The UTC label of J2000.0** as seen by standard software clocks is `2000-01-01T11:58:55.816Z` — *not* UTC noon. The 64.184-second gap arises from two fixed offsets: the TT−TAI offset (32.184 seconds, defined by the IAU) and the TAI−UTC offset at J2000.0 (32 seconds). Any implementation that places `BrightDate = 0` at UTC noon is astronomically incorrect.

### 2.2 Epoch Relationships

| Timescale | Representation | Unix value |
|-----------|---------------|------------|
| TT (definition) | `2000-01-01T12:00:00.000` | `946,728,000 s` |
| TAI | `2000-01-01T11:59:27.816` | `946,727,967.816 s` |
| **UTC label** | **`2000-01-01T11:58:55.816Z`** | **`946,727,935,816 ms`** |

`BrightDate = 0` at `946,727,935,816` Unix milliseconds. This is the only astronomically correct choice for the epoch.

### 2.3 Metric Sub-Units

Because BrightDate is measured in decimal days, SI prefixes yield intuitive sub-units:

| Unit | Value (days) | SI seconds | Real-world feel |
|------|-------------|------------|-----------------|
| 1 day | 1.0 | 86,400 | 24 hours |
| 1 milliday (md) | 0.001 | 86.4 | 1 min 26.4 s |
| 1 microday (μd) | 0.000001 | 0.0864 | 86.4 ms |
| 1 nanoday (nd) | 0.000000001 | 0.0000000864 | 86.4 µs |

Elapsed durations in BrightDate express naturally: `b - a = elapsed_days`. No unit algebra enters the computation.

### 2.4 TAI Substrate

Internally, BrightDate advances in strict SI seconds with no discontinuities. Two consecutive UTC seconds straddling a leap-second boundary correspond to exactly 2 SI seconds in BrightDate, because TAI advances by 2 during that transition. This is the physically correct behavior. Leap seconds appear only at UTC conversion boundaries (`toISO`, `fromISO`, `toUnixMs`, `fromDate`), where `:60` is rendered correctly.

---

## 3. The Three Companion Types

A single precision level cannot serve every use case. BrightDate ships three types that share the same epoch and TAI semantics but differ in representation and fidelity.

### 3.1 `BrightDate` — Float64, Ergonomic

The primary type. Stores the signed day count as a 64-bit IEEE 754 double. For the current era (~BD 9,600–11,000 at time of writing), Float64 provides approximately 190-nanosecond resolution — far above NTP jitter and mechanical clock accuracy. Arithmetic uses native operators (`a - b`, `a < b`, `Math.abs`). Astronomy helpers (GMST, lunar phase, interplanetary light delay) operate in this type.

**Float64 resolution by era (worst-case ULP at the upper end of the row's magnitude):**

| BrightDate magnitude     | ULP (days)    | ULP (seconds) |
|--------------------------|---------------|---------------|
| ~1 (one day from epoch)  | 2.2×10⁻¹⁶     | ~19 ps        |
| ~9,600 (current era)     | 2.2×10⁻¹²     | ~190 ns       |
| ~100,000 (year 2273)     | 2.2×10⁻¹¹     | ~1.9 µs       |
| ~1,000,000 (year 4737)   | 2.2×10⁻¹⁰     | ~19 µs        |

Float64 covers 287,000+ years without losing sub-microsecond resolution. The resolution at the epoch itself is bounded only by IEEE 754 sub-normals and is not engineering-meaningful; treat the **1-day row as the practical floor** — any timestamp other than the epoch instant lives there or further out.

**Choose `BrightDate` when:** doing astronomy, scheduling, analytics, logging, display, or interval arithmetic, and when timestamps will be compared and diffed rather than exactly reconstructed.

### 3.2 `BrightInstant` — BigInt TAI Seconds + Integer Nanoseconds

Stores TAI seconds since J2000.0 as a `BigInt` plus an integer nanosecond remainder. Provides exact 1-nanosecond precision at any magnitude with no Float64 drift. The rigorous form for distributed systems, GPS engineering, and interplanetary mission timing.

**Choose `BrightInstant` when:** nanosecond fidelity must be maintained indefinitely far from the epoch, or when system clocks are the input source (e.g., GPS receiver, NTP-disciplined oscillator).

### 3.3 `ExactBrightDate` — BigInt Picoseconds

Stores the full timestamp as a BigInt count of picoseconds from J2000.0. Provides bit-exact round-trips for any integer Unix-millisecond input:

```typescript
const ms = 1_700_000_000_123;
ExactBrightDate.fromUnixMs(ms).toUnixMs() === ms; // true, always, unconditionally
```

**Choose `ExactBrightDate` when:** you must return user-supplied Unix milliseconds byte-identical, for blockchain consensus on exact timestamps, or for century-scale archival without drift accumulation.

### 3.4 Mixing Types

The three types are designed to interoperate at boundaries:

```typescript
// Store with full fidelity; compute with Float64 speed
const exact = ExactBrightDate.fromUnixMs(Date.now());
const bd    = BrightDate.fromValue(exact.toBrightDateValue()); // lossy to Float64 res
const inst  = BrightInstant.fromBrightDate(bd);               // lossless within Float64 res
```

---

## 4. Float64 Precision and Honest Trade-offs

### 4.1 The Round-Trip Tax

For day-aligned Unix milliseconds (exact multiples of `86,400,000 ms` from the J2000.0 anchor), `BrightDate` round-trips with bit-exactness:

```typescript
fromUnixMs(0).toUnixMs()               === 0;               // Unix epoch: exact
fromUnixMs(946_728_000_000).toUnixMs() === 946_728_000_000; // J2000.0: exact
```

For off-day inputs, an error bounded by `~2⁻⁵² × magnitude` applies — approximately 0.00012 ms (~120 ns) at current-era timestamps. Systems that can tolerate sub-microsecond error at the Unix-ms boundary should use `BrightDate`. Systems that cannot should use `ExactBrightDate`.

### 4.2 Algebraic Identity Limits

Most identities hold bit-exactly for realistic inputs:

- `lerp(a, b, 0) === a` — always.
- `lerp(a, b, 1) === b` — holds for realistic inputs; can differ by 1–2 ULP when `|b − a|` is comparable to `|a|`.
- `(v + d) − d === v` — holds for realistic inputs; the same IEEE 754 catastrophic-cancellation regime applies.

These are properties of 64-bit floating-point arithmetic, not BrightDate defects. The reference implementation's property-based tests assert the honest bounds.

---

## 5. Pre-BrightDate (PBD): Deep-Time Paging

### 5.1 The Problem with Unbounded Negatives

Because BrightDate is anchored at J2000.0, any moment before `2000-01-01T11:58:55.816Z` is naturally a negative scalar. Negatives are mathematically valid but operationally hazardous:

- Sign-flip bugs in formatters.
- Off-by-one errors when crossing zero.
- Magnitude-dependent Float64 drift that worsens as timestamps move further from the epoch.
- Counterintuitive ordering: `−4.35 × 10¹⁷` (Big Bang) versus `−1.58 × 10¹¹` (3000 BC) requires knowing the sign convention to interpret.

### 5.2 The PBD Solution: Tera-Second Pages

Pre-BrightDate (PBD) replaces the unbounded negative line with a sequence of named, positive-valued pages called **eras**. Each era spans exactly one **Tera-second** (10¹² SI seconds ≈ 31,710 Julian years). Within each page, values run from 0 to 10¹² — always forward, always positive.

**The key insight:** this is a presentation and indexing layer, not a new number system. The canonical representation remains the signed scalar; PBD is generated at format time and parsed at input time, exactly as a human-readable date string is generated from a Unix timestamp without replacing it.

### 5.3 SI-Metric Alignment: The Tera-Bright

PBD math is performed in **Bright-seconds (bs)**, where `1 bs = 1 SI second`. One **Tera-Bright** (`1 Ts`) is therefore:

- **Time:** 10¹² s ≈ 31,710 Julian years (one PBD page).
- **Distance (in BrightSpace terms):** 1 Tera-light-second ≈ 0.0317 light-years.

Because the same SI prefix lineage governs both time and space in the BrightChain ecosystem, a `PBD-N` label is not an arbitrary bucket — it is a physically meaningful volume of history, exactly 10¹² seconds long, anchored to the same J2000.0 zero point.

### 5.4 The Paging Model

Let `T = 1,000,000,000,000 s` (one Tera-Bright, ≈ 31,710 years).

| Era | Raw second range | Page value (era-local) | Approx. Gregorian window |
|-----|-----------------|------------------------|--------------------------|
| BD | `[0, +∞)` | raw scalar | J2000.0 → forever |
| PBD1 | `(−T, 0)` | `raw + T` | ~29,710 BC → J2000.0 |
| PBD2 | `(−2T, −T]` | `raw + 2T` | ~61,420 BC → ~29,710 BC |
| PBD*N* | `(−N·T, −(N−1)·T]` | `raw + N·T` | ~31,710 Julian years per page |

**There is no `PBD0`.** The current era — J2000.0 and all future time — is plain BD, unpaged. PBD*N* is reserved for N ≥ 1, labeling pre-epoch time only.

### 5.5 Era Calculation

For a raw Bright-second value `r < 0`:

```
N         = ⌊|r| / T⌋ + 1
pageValue = r + N · T
```

The pair `(N, pageValue)` uniquely identifies every pre-epoch instant. Reconstruction is trivial:

```
r = pageValue − N · T
```

### 5.6 Three Invariants

1. **One timeline, always increasing toward the future.** Within any era, a larger page value is *later*. In PBD1, page `999,999,999,999` is one second before J2000.0; page `1` is almost a full Tera-second before J2000.0. Values do *not* count backwards. (This is the opposite of BC labeling, and the reason BC dates break every library that touches them.)

2. **Boundaries are half-open with a closed upper.** `BD = [0, +∞)`, `PBD1 = (−T, 0)`, `PBD2 = (−2T, −T]`, `PBD-N = (−N·T, −(N−1)·T]`. The exact boundary `−k·T` is the last instant of `PBD(k+1)` (page `T`). Every scalar has exactly one canonical label — no "Year Zero" ambiguity.

3. **Deltas use the scalar, not the page.** `Δt = raw_a − raw_b`. Never `pageA − pageB`. Subtracting page values across an era boundary silently drops a Tera-second.

### 5.7 Comparing Across the BD/PBD Boundary

When only label tuples are available:

```typescript
function isLater(a: BrightLabel, b: BrightLabel): boolean {
  if (a.kind !== b.kind) return a.kind === 'BD';   // any BD > any PBD
  if (a.kind === 'BD')   return a.seconds > b.seconds;
  if (a.era !== b.era)   return a.era < b.era;      // smaller era = closer to J2000.0
  return a.page > b.page;                           // within an era, larger page = later
}
```

Sort ascending by time: BD first, then PBD by era *descending*, then page *ascending*.

### 5.8 Why Pages Instead of Negatives?

| Property | Single negative line | PBD-N paging |
|----------|---------------------|--------------|
| Sign confusion | Constant hazard | Eliminated — every page is positive |
| Sort order | Native (numeric) | Native (sort by N desc, then page) |
| Labeling deep time | `−4.35 × 10¹⁷ s` | `PBD435000: <page>` — scale is obvious |
| Float64 drift | Worsens with magnitude | Stays inside one Tera-second window |
| Storage | One Float64 | One small int + one Float64 (or tuple) |
| Cosmological reach | Saturates Float64 | Big Bang ≈ PBD435,000 — well inside `Number.MAX_SAFE_INTEGER` |

### 5.9 Benchmark Anchors

| Historical moment | Raw seconds | PBD label |
|-------------------|-------------|-----------|
| J2000.0 (epoch) | `0` | `BD 0.000` |
| ~3000 BC (earliest writing) | `≈ −1.578 × 10¹¹` | `PBD1: ~842,212,000,000` |
| ~12,000 BC (end of last glacial maximum) | `≈ −4.42 × 10¹¹` | `PBD1: ~557,800,000,000` |
| ~100,000 BC (deep Paleolithic) | `≈ −3.156 × 10¹²` | `PBD4: ~844,240,000,000` |
| Big Bang (~13.8 Gyr ago) | `≈ −4.35 × 10¹⁷` | `PBD~435,000: <page>` |

Most of recorded human history fits inside **PBD1**. Civilization from ~3000 BC to J2000.0 is roughly 5,000 years — less than one-sixth of a single Tera-second page.

### 5.10 Representation Formats

```jsonc
// JSON tuple form — indexable, deterministic
{ "pbd": [1, 842000000000.000] }   // PBD1, page 842000000000 → raw ≈ -158Gs

// String label form — human-readable
"PBD1: 842000000000.000"

// Scalar (legacy) — valid, automatically paged when displayed
-157788000000
```

A negative raw BrightDate scalar always round-trips through `(era, pageValue)` without loss. The paging is a presentation and indexing layer, not a different number system. Existing negative scalars remain canonical and first-class.

---

## 6. Serialization and Storage

### 6.1 Canonical Encoded Form

```typescript
encode(9622.50417);              // "BD1:9622.50417000"
encode(9622.50417, 'tai');       // "BD1:9622.50417000:tai"
decode('BD1:9622.50417000');     // { value: 9622.50417, timescale: 'utc' }
```

### 6.2 Sortable String (Database Index)

For storage in systems that rely on lexicographic ordering (most key-value stores, wide-column databases), BrightDate provides a sortable string encoding where lexicographic order exactly matches numeric order across both positive and negative values:

```typescript
toSortableString(9622.50417);  // "+0009622.50417000"
toSortableString(-10957.5);    // "!9989042.49999999"  (nine's-complement)
```

The `!` prefix and nine's-complement encoding are necessary because ASCII `+` (0x2B) sorts before `-` (0x2D), which would invert the expected ordering for mixed-sign timestamps.

### 6.3 Binary Form

```typescript
toBinary(9622.50417);          // 8-byte ArrayBuffer (big-endian IEEE 754)
fromBinary(buf);               // bit-exact round-trip
```

`ExactBrightDate` uses a 16-byte big-endian two's complement representation for its BigInt picosecond value.

---

## 7. Reference Dates

| Event | ISO 8601 (UTC) | BrightDate |
|-------|---------------|------------|
| J2000.0 (epoch anchor) | `2000-01-01T11:58:55.816Z` | **0.000000000** |
| TT noon (definition moment) | `2000-01-01T12:00:00.000Z` | ≈ 0.000742870 |
| Y2K midnight | `2000-01-01T00:00:00Z` | ≈ −0.499257130 |
| Unix epoch | `1970-01-01T00:00:00Z` | ≈ −10,957.499512 |
| GPS epoch | `1980-01-06T00:00:00Z` | ≈ −7,300.499408 |
| Apollo 11 landing | `1969-07-20T20:17:40Z` | ≈ −11,125.154 |
| Current era (~2026) | — | ≈ 9,600 |

---

## 8. Key Constants

```typescript
J2000_UTC_UNIX_MS       = 946_727_935_816   // UTC label of J2000.0 in Unix ms
J2000_TAI_UNIX_S        = 946_727_967.816   // TAI Unix seconds at J2000.0
J2000_TT_UNIX_S         = 946_728_000       // TT (definition) Unix seconds
J2000_JD                = 2_451_545.0       // Julian Date at J2000.0
J2000_MJD               = 51_544.5          // Modified Julian Date at J2000.0
TAI_UTC_OFFSET_AT_J2000 = 32               // TAI − UTC at J2000.0 (seconds)
TT_TAI_OFFSET_SECONDS   = 32.184           // TT − TAI (fixed by IAU definition)
CURRENT_TAI_UTC_OFFSET  = 37               // TAI − UTC as of 2017
GPS_EPOCH_UNIX_TAI      = 315_964_819      // GPS epoch as TAI Unix seconds
PBD_ERA_SECONDS         = 1_000_000_000_000 // One Tera-second; length of one PBD era
SECONDS_PER_DAY         = 86_400           // SI seconds per day
```

All constants are stored as exact `bigint` literals in the reference implementation. No floating-point conversion enters the definition path.

---

## 9. Leap Seconds

Leap seconds are a civil-time artefact, not a physical phenomenon. BrightDate treats them accordingly:

- **Internally:** leap seconds do not exist. BrightDate ticks in strict SI seconds on a TAI substrate.
- **At UTC boundaries:** the leap second table (`LEAP_SECOND_TABLE`) maps TAI seconds to UTC seconds. The table is valid through `LEAP_SECOND_TABLE_VALID_UNTIL_UNIX_S` and carries a `LEAP_SECOND_TABLE_REVIEWED_AT` timestamp.
- **`toISO()` during a leap second:** renders the moment as `:60`, e.g. `1998-12-31T23:59:60.000Z`.
- **Table expiry:** `getTaiUtcOffset()` throws `LeapSecondTableExpiredError` if the table has lapsed. Update the library to continue.

Two consecutive UTC seconds straddling a positive leap second boundary correspond to exactly 2 SI seconds in BrightDate. This is the physically correct elapsed time; applications that require UTC wall-clock elapsed time must handle the boundary explicitly in their UTC conversion layer.

---

## 10. Related Work

- **Unix time:** monotonic seconds since 1970-01-01T00:00:00 UTC. Ubiquitous but ambiguous at leap-second boundaries; Y2038 problem for 32-bit representations; epoch is not astronomically motivated.
- **Julian Date (JD):** count of days since the Julian proleptic calendar date 4713 BC January 1 noon. Values in the current era are enormous (~2.45 million); the origin is an arbitrary historical convention.
- **Modified Julian Date (MJD):** JD − 2,400,000.5. Slightly more ergonomic but inherits JD's arbitrary anchor and midnight-vs-noon ambiguity.
- **GPS time:** seconds since 1980-01-06T00:00:00 UTC, no leap seconds. Well-defined but niche; requires a rollover table for week numbers; epoch is not an astronomical standard.
- **CCSDS Time Code Formats (CCSDS 301.0-B-4):** standardises *encoding* of time tags for spacecraft telemetry, not an underlying unit system or scalar.
- **TAI directly:** monotonic and physically correct, but provides no agreed epoch, no decimal-day hierarchy, and no reference implementation oriented toward general engineering use.

BrightDate fills a specific gap: a TAI-substrate scalar anchored at the standard astronomical epoch, with SI decimal sub-units, a paged deep-time extension, honest Float64 precision documentation, and an open-source reference implementation in TypeScript and Rust.

---

## 11. Discussion

### 11.1 What This Is Not

BrightDate is not new physics and does not propose new fundamental constants. It is a **units and encoding convention** — a choice of epoch, substrate, scalar unit, and serialization format — alongside a reference implementation. Its claim to attention is operational: reduced conversion errors, improved sortability, and an honest account of precision limits.

### 11.2 Limitations

- BrightDate does not replace TAI or UTC at the metrology level. It is an application-layer convention that consumes those standards.
- Below sub-microsecond scales — high-precision pulsar timing, optical clock comparisons — the relevant unit is the SI second itself and BrightDate Float64 offers no advantage over `BrightInstant` or `ExactBrightDate`.
- The PBD system assigns human history to PBD1. Systems that display deep-time dates to end users must document that `PBD1` values are *earlier* than any BD value, despite having larger page numbers.
- The standard does not specify coordinate systems, energy units, or momentum. These are intentionally out of scope.

### 11.3 Invitation

The standard is published under the MIT licence and the reference implementation is open source. Critiques, alternative designs, and formal review from the metrology, astronomy, and spaceflight communities are explicitly welcomed. The author's expectation is not that this exact proposal becomes a formal standard, but that publishing a complete, runnable, exact implementation makes the conversation tractable for the first time.

---

## References

1. International Astronomical Union, *Resolution B2 on the re-definition of the astronomical unit of length* (XXVIII General Assembly, Beijing, 2012).
2. BIPM, *The International System of Units (SI), 9th edition* (2019).
3. IERS, *Bulletin C — leap second announcements* (ongoing).
4. CCSDS, *Time Code Formats*, CCSDS 301.0-B-4 (2010).
5. P. K. Seidelmann (ed.), *Explanatory Supplement to the Astronomical Almanac* (University Science Books, 1992).
6. D. D. McCarthy & G. Petit (eds.), *IERS Conventions (2003)*, IERS Technical Note 32.
7. J. Mulein, `@brightchain/brightdate` reference implementation, <https://github.com/Digital-Defiance/brightdate>.
8. J. Mulein, `brightdate` Rust crate, <https://crates.io/crates/brightdate>.
9. BrightDate interactive companion site, <https://brightdate.org>.
