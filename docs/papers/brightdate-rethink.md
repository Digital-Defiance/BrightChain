---
layout: default
title: "BrightDate v2: Engine vs Dashboard"
parent: "Papers"
---

# BrightDate v2: Engine vs Dashboard

**Status:** Adopted into the reference implementation and [BrightDate specification](brightdate-specification.md) §2.6–§3.

## Summary

BrightDate follows the Unix pattern: an ugly, exact integer under the hood; a beautiful decimal face on the glass.

| Layer | Type | Unit | Role |
| ----- | ---- | ---- | ---- |
| **Engine** | `ExactBrightAtto` | attoseconds since J2000.0 (TAI) | Databases, APIs, consensus, spacetime `t` axis |
| **Optional engine** | `ExactBrightDate` | picoseconds since J2000.0 | Same, when you prefer ps ticks (`EBD1:`) |
| **Dashboard** | `BrightDate` | decimal SI days (Float64) | Widgets, logs, astronomy helpers — v1 ergonomics |

The Float64 day scalar is **not** canonical storage. It is derived from the integer by Euclidean **divmod** (no float division on the tick count). Reverse conversion (`BrightDate` → `ExactBrightAtto`) is supported and **explicitly lossy** when the float carries sub-tick detail.

## Why attoseconds

- **Precision stability:** one microsecond is always exactly 10¹² attoseconds, regardless of era magnitude.
- **Spacetime unification:** with `c = 1`, one attosecond of time equals one light-attosecond of distance; a 4D vector can be four `i128` ticks with exact Minkowski interval math (Bright Spacetime Standard §2.6).
- **Interop:** 16-byte big-endian two's-complement matches Rust `i128` and TypeScript `BigInt` on the wire.

Picoseconds remain available via `ExactBrightDate` for existing deployments; multiply by 10⁶ to reach attoseconds exactly when sub-picosecond limbs are zero.

## Implementation map

| Concern | TypeScript (`@brightchain/brightdate`) | Rust (`brightdate`) |
| ------- | ---------------------------------------- | ------------------- |
| Canonical attoseconds | `ExactBrightAtto` (`bigint`) | `ExactBrightAtto` (`i128`) |
| Divmod lens | `brightDateLens.ts` | `lens.rs` |
| v1 dashboard | `BrightDate` class (unchanged float math) | `BrightDate` struct |
| Bridges | `fromExactBrightAtto` / `toExactBrightAtto` | `from_exact_bright_atto` / `to_exact_bright_atto` |

## Resolved decisions (2026)

1. **Migration:** None required — no production consumers of v1 wire formats yet; green-field defaults apply.
2. **Default engine:** `ExactBrightAtto` (`EBA1:` + 16-byte i128) for new storage and APIs; `ExactBrightDate` (`EBD1:`) remains supported as an optional picosecond divisor.
3. **Wire coexistence:** Both encodings may coexist in documentation and libraries; new work should prefer attoseconds.
4. **“Bright” naming:** **Prose only** (papers, comments). Code and symbols stay `bm`, `BrightMeter`, `BrightDate`, etc., to avoid a breaking rename.
5. **md vs kbs:** Intentional parallel hierarchies (day-scale dashboard vs second-scale spacetime); see BrightDate specification §2.3 and Bright Spacetime §2.3.

**Still open:** ECEF vs GCRS framing for interval math on spatial vectors (orthogonal to the integer engine).

---

## Revision history (design notes)

### Classical split (Unix analogy)

Under the hood: a monotonic integer of attoseconds since J2000.0. On the glass: divide by `86_400 × 10¹⁸`, format four or five fractional digits — the same StarDate-like `BD` labels as v1, driven by an engine that does not drift with Float64 magnitude.

### 128-bit width

Attoseconds in **signed i128** (Rust) / **BigInt** (TypeScript) cover ±~5.4×10¹² years. **256-bit is unnecessary** at this quantum. Wire format: 16-byte big-endian two's-complement (shared by `ExactBrightAtto` and `ExactBrightDate`; only the tick divisor changes).

### Presentation rule (refined)

Use integer **divmod** for the dashboard, not `t_as / 8.64e22` in float. **Consensus and signatures use the integer.** Decimal strings and `BrightDate` floats are interchangeable for UI and legacy v1 math, with documented loss on round-trip when sub-tick digits are present.
