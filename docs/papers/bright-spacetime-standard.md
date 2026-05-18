---
layout: default
title: "The Bright Spacetime Standard: A Decimal-SI Operationalisation of the c = 1 Convention"
parent: "Papers"
---

# The Bright Spacetime Standard: A Decimal-SI Operationalisation of the c = 1 Convention

   **Author:** Jessica Mulein (Digital Defiance)

   **Reference implementation:** [`@brightchain/brightdate`](https://www.npmjs.com/package/@brightchain/brightdate)

   **Interactive companion:** https://brightdate.org/spacetime

   **Version:** 0.1.0 (component, draft) — Bright Spacetime Protocol (BSP) suite member

   **Status:** Draft convention — comments and corrections welcome.

   **Date:** 2026

------

   ## Abstract

   Working relativists have set the speed of light to c = 1 since Minkowski's 1908 Cologne lectures introduced the four-dimensional spacetime formalism. Despite a century of use in pedagogy and research, the convention has never been *operationalised* outside textbooks: there is no agreed decimal-SI hierarchy for the resulting unit, no shared epoch, and no public reference implementation grounded in exact-integer constants. As a result, every mission profile, latency budget, and proper-time calculation re-derives the same algebra from a 1976-era patchwork of the Astronomical Unit, the Julian year, and ad-hoc megasecond/light-minute mixtures.

   We propose the **Bright Spacetime Standard**: a decimal-SI scalar hierarchy for the c = 1 convention, anchored to the 2019 SI redefinition and the J2000.0 epoch (IAU). A single unit — the **BrightMeter** (bm), exactly equal to c * 1 s = 299,792,458 m — spans both space and time. Coordinates become latencies; gamma collapses to 1/sqrt(1-beta^2); and the Minkowski line element loses its factor of c. We publish the standard alongside an open-source reference implementation that derives every numerical claim on this page from exact-integer constants at runtime.

   ## 1. Motivation

   ### 1.1 The convention works; the units do not

   The c = 1 convention is universal in modern theoretical physics:

   - Misner, Thorne, & Wheeler (*Gravitation*, 1973) use it from chapter 1.
   - Carroll's *Spacetime and Geometry* (2004) introduces it before the metric.
   - Every GR research paper since the 1960s drops c from the line element unless explicitly converting back for an experimentalist audience.

   What does *not* exist is a public, vendor-neutral way to **carry numbers in this convention end-to-end** — from a JSON message between two spacecraft, to a mission-planning notebook, to a published table. In practice, engineering teams convert in and out of SI at every interface, with the conversion factor (c = 299,792,458 m/s, exact since 1983) hard-coded in dozens of inconsistent places.

   ### 1.2 The legacy stack

   The currently-deployed units for "physical distances larger than a planet" are:

   | **Unit**            | **Definition**                                        | **Problem**                                                  |
   | ------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
   | Astronomical Unit   | IAU 2012: 1 AU = 149,597,870,700 m (exact, by *fiat*) | Anchored historically to Earth's orbital semi-major axis — geocentric provincialism in disguise. |
   | Light-Year          | c * (Julian year of 365.25 d)                         | Defined from a calendar artefact, not a physical constant.   |
   | Parsec              | Trigonometric definition via the AU and 1 arcsec      | Inherits AU's geocentricity; awkward outside astrometry.     |
   | Light-Second/Minute | c * (SI second/minute)                                | Already in the spirit of c = 1 — but no standard decimal prefix hierarchy. |

   The last row is the one we extend. The first three remain useful for *continuity*; the standard provides exact integer conversions to all of them.

   ### 1.3 The 2019 SI redefinition makes this safe

   Since 20 May 2019, all seven SI base units are defined from fixed numerical values of fundamental constants. The metre is *derived* from the second via:

   1 m = [1 / 299,792,458] * c * 1 s

   Inverting that definition costs nothing — it is the same physical reality described in the same SI framework, expressed in a unit better matched to the mathematics of relativity.

------

   ## 2. Definitions

   ### 2.1 The BrightMeter

   > **1 bm = c \* 1 s = 299,792,458 m**

   The definition is **exact**: c has a defined numerical value in SI, and the SI second is defined from the caesium-133 hyperfine transition. No measurement enters.

   ### 2.2 The Bright-Second

   When the unit is used to denote a *temporal* interval rather than a spatial extent, we call it a **Bright-Second** (bs). Numerically, 1 bs = 1 bm. The two names are a notational courtesy to readers who want spatial-vs-temporal framing in their heads; the underlying unit is one and the same.

   ### 2.3 Decimal-SI hierarchy

   The BrightMeter takes the standard SI prefixes without modification:

   | **Symbol** | **Name**    | **Metres (exact)** | **Useful for**                        |
   | ---------- | ----------- | ------------------ | ------------------------------------- |
   | μbm        | Microbright | 299.792458         | Lab benches, fibre-optic delays       |
   | mbm        | Millibright | 299,792.458        | LEO orbits (~Earth's radius scale)    |
   | bm         | BrightMeter | 299,792,458        | Cislunar, geostationary, LEO comms    |
   | kbm        | Kilobright  | 2.99792458 × 10¹¹  | Earth–Sun (1 AU ≈ 499 bm = 0.499 kbm) |
   | Mbm        | Megabright  | 2.99792458 × 10¹⁴  | Inner-system mission planning         |
   | Gbm        | Gigabright  | 2.99792458 × 10¹⁷  | Heliopause, near-interstellar         |

   The same hierarchy applies to Bright-Seconds (μbs, mbs, bs, kbs, Mbs, Gbs).

   **Symbol convention.** `μbm` and `μbs` are canonical. **`ubm`** and **`ubs`** are ASCII-safe fallbacks for code, terminals, and storage formats where Greek `μ` is impractical; both forms refer to the same unit.

   ### 2.4 The Light-Day family (calendar-aware extension)

   For applications that need to interoperate with Earth-bound calendars (scheduling, ephemerides, day-cycle missions), we additionally define:

   1 Ld = c * 86,400 s = 2.59020683712 × 10¹³ m

   with corresponding **Light-Milliday** (Lmd) and **Light-Microday** (Lμd) subdivisions. The Ld is *not* the base unit — it inherits the SI-day's non-power-of-ten conversion to seconds — but it remains the natural choice when "one calendar day of light-travel" is the relevant scale.

   ### 2.5 Epoch and metric signature

   - **Epoch — canonical block (identical across all BrightChain time/space specifications):**

     > The BrightDate epoch is **J2000.0**, defined as `2000-01-01T12:00:00.000 TT`. In TAI, this is `2000-01-01T11:59:27.816` (Unix TAI second `946,727,967.816`). The UTC label, as returned by standard software clocks, is `2000-01-01T11:58:55.816Z` (Unix millisecond `946,727,935,816`). All BrightDate and BrightSpacetime coordinate times are measured from this instant on a TAI substrate.

     The reference implementation handles the TT → TAI → UTC chain explicitly, including all leap seconds through the most recent IERS bulletin. See §4A for the GCRS/BCRS framing of these coordinates.

   - **Metric signature:** (-,+,+,+), matching Misner–Thorne–Wheeler. The line element is:

     ds² = -dt² + dx² + dy² + dz²

     with t, x, y, z all in BrightMetres / Bright-Seconds.

------

   ## 3. Consequences for the formalism

   ### 3.1 The Minkowski line element loses c

   In SI units the spacetime line element carries an explicit factor:

   ds² = -c² * dt² + dx² + dy² + dz²

   In Bright units it does not:

   ds² = -dt² + dx² + dy² + dz²

   Every relativistic calculation downstream of the line element — proper time, proper length, four-velocity normalisation, geodesic equations — shortens correspondingly.

   ### 3.2 Velocity is dimensionless

   A velocity v in m/s becomes the dimensionless ratio beta = v/c in (-1, 1). The Lorentz factor reduces from:

   gamma = 1 / sqrt(1 - v²/c²)  to  gamma = 1 / sqrt(1 - beta²)

   Relativistic velocity addition reduces from u' = (u + v)/(1 + uv/c²) to beta' = (beta_1 + beta_2)/(1 + beta_1 * beta_2). The relativistic Doppler factor reduces from sqrt((1+v/c)/(1-v/c)) to sqrt((1+beta)/(1-beta)). In every case, a factor of c disappears without changing the physics.

   ### 3.3 Coordinate equals latency

   If a probe's spatial coordinate is r BrightMetres from the observer, the one-way light-travel time is *literally* r Bright-Seconds. The position vector and the communication budget become the same number. This is the single most useful operational consequence of the standard.

------

   ## 4. Worked examples

   ### 4.1 Mars uplink latency

   Take a representative Earth–Mars distance of d = 0.52 AU.

   **Legacy SI calculation:**

   d = 0.52 AU = 0.52 × 1.496 × 10⁸ km ≈ 7.78 × 10⁷ km

   t = d/c = (7.78 × 10⁷ km) / (2.998 × 10⁵ km/s) ≈ 259.3 s

   **Bright-units calculation:**

   d = 259.3 bs,  t = d = 259.3 bs

   The coordinate **is** the latency. Round-trip is 2d = 518.6 bs ≈ 8.64 min. No conversion ever entered the calculation.

   ### 4.2 Twin paradox (proper time along a worldline)

   A traveller leaves Earth at beta = 0.6, flies outward for T = 10 coordinate-years, instantaneously turns around, and returns. With endpoints O = (0,0,0,0), turn-around A = (T, beta * T, 0, 0), and return B = (2T, 0, 0, 0), the proper time along each leg is:

   tau_leg = sqrt(T² - (beta * T)²) = T * sqrt(1 - beta²) = T / gamma

   For beta = 0.6, gamma = 1.25 and total proper time is 2T / gamma = 16.0 years against 2T = 20 years on the stay-at-home clock. The reference implementation reproduces this number by direct integration of sqrt(-ds²) between the supplied `SpacetimeEvent`s, with no factor of c appearing in user code.

   ### 4.3 Heliopause in Gigabrights

   The heliopause is roughly 120 AU from the Sun. Converting:

   120 AU ≈ 5.99 × 10⁴ bs ≈ 16.6 hours light-travel

   In Gigabrights, that is 1.80 × 10⁻⁴ Gbm. The order of magnitude tells you immediately that interstellar distances begin one hierarchy level higher — Proxima Centauri sits at ~0.134 Gbm.

------

   ## 4A. Coordinate Time, Proper Time, and the BrightDate Substrate

   The worked examples above mix two concepts that are equal for terrestrial engineering and *not* equal for precision interplanetary work. The standard must be explicit about which is which.

   ### 4A.1 What BrightDate Coordinates Actually Are

   BrightDate timestamps are **coordinate time** in a specific reference frame. Two frames are relevant in practice:

   - **GCRS** (Geocentric Celestial Reference System) — the natural frame for Earth-orbit, cislunar, and Earth-station work. Origin: Earth's centre of mass; axes: kinematically non-rotating relative to distant quasars. The TT timescale is the time coordinate of the GCRS.
   - **BCRS** (Barycentric Celestial Reference System) — the natural frame for interplanetary, heliophysics, and deep-space work. Origin: Solar System barycentre. The TCB timescale is the time coordinate of the BCRS; TDB is its widely used scaled relative.

   The BrightDate scalar is, by construction, a count of SI days since J2000.0 on the **TAI substrate**. TAI is realised on the rotating geoid and differs from TT only by the fixed offset `TT − TAI = 32.184 s`. For all practical purposes within Earth's gravity well, BrightDate coordinate time tracks GCRS coordinate time. It does **not** automatically yield BCRS coordinate time, and it does **not** yield the proper time of an arbitrary worldline.

   ### 4A.2 When the Distinction Doesn't Matter

   For everything inside roughly 1 AU of Earth — terrestrial networking, GNSS, lunar comms, asteroid-belt latency budgets — the difference between GCRS coordinate time, BCRS coordinate time, and the proper time of a clock at rest in the GCRS is below microsecond order. Engineering teams can treat BrightDate timestamps as proper time without measurable error.

   ### 4A.3 When It Does Matter

   For precision interplanetary work, three corrections become observable:

   1. **Gravitational time dilation.** A clock deeper in a gravitational potential ticks slower than coordinate time. The leading-order rate factor is:

      `dτ/dt = sqrt(1 − 2U/c² − v²/c²) ≈ 1 − U/c² − v²/(2c²)`

      where `U` is the Newtonian gravitational potential at the clock (positive, magnitude convention) and `v` is the clock's velocity in the chosen coordinate frame. In Bright units (`c = 1`) this simplifies to `dτ/dt ≈ 1 − U − v²/2`, with `U` and `v²` rendered as dimensionless ratios to `c²`.

   2. **TT vs TCB rate offset.** A clock at rest on Earth's geoid drifts against TCB at roughly `1.55 × 10⁻⁸` (about 0.49 s/year), because the entire Earth sits at a non-trivial depth in the Sun's potential. Mission-planning calculations that span Earth and barycentric coordinates must apply this correction explicitly; BrightDate alone does not absorb it.

   3. **Shapiro delay.** Light passing near a massive body takes longer in coordinate time than its straight-line BrightSpace distance suggests. For an Earth–Mars signal grazing the Sun at superior conjunction, the correction reaches ~250 µs. The Bright unit of light-distance remains exact; what changes is that the *coordinate-time path length* of the signal is no longer the Euclidean BrightSpace distance. Stated as an inequality:

      `Δt > sqrt(Δx² + Δy² + Δz²)`     (in curved spacetime, in Bright units)

      with equality recovered only in flat spacetime. The Euclidean chord is a **lower bound** on coordinate light-travel time — useful as a Distance-Bounding floor (§4.1, BrightSpace), insufficient as a precise propagation model when a signal traverses a deep gravitational well.

   ### 4A.4 Reference-Implementation Surface

   The reference implementation exposes proper-time machinery as a separate, opt-in layer:

   - `properTimeFactor(potential_U, velocity_beta_squared)` — returns the dimensionless `dτ/dt` rate at first post-Newtonian order, with both arguments in Bright units (dimensionless ratios to `c²`).
   - `tcbFromTt(brightDate, observerWorldline?)` — converts a GCRS-substrate BrightDate to its BCRS-coordinate-time counterpart. The current implementation uses the IAU 2006 SOFA conventions for the linear part and exposes an extension point for higher-order terms.
   - `properTimeAlongWorldline(events, metric?)` — integrates `sqrt(-ds²)` along an ordered sequence of `SpacetimeEvent`s under a supplied metric (defaults to Minkowski; gravitational metrics are pluggable).

   The directive: BrightDate gives you a clean, monotonic, high-precision coordinate-time scalar. For proper time, call the proper-time helpers. For barycentric coordinate time, call the BCRS conversion. Mixing the three silently is the failure mode the standard is built to prevent.

   ### 4A.5 Twin Paradox, Revisited

   The twin paradox in §4.2 used coordinate time `T = 10` years and recovered proper time `2T/γ = 16.0` years. That calculation is exact under the Minkowski metric the example assumes — flat spacetime, no gravity. In a real interplanetary scenario, the same algebra runs through `properTimeAlongWorldline` with a Schwarzschild or post-Newtonian metric, and the gravitational terms in §4A.3 enter automatically. The user code does not change; only the metric pluggable does.

------

   ## 5. Reference implementation

   The standard is realised in [`@brightchain/brightdate`](https://www.npmjs.com/package/@brightchain/brightdate), an MIT-licensed TypeScript library with a Rust port and a Homebrew CLI. Design constraints:

   1. **Exact-integer constants.** c, the leap-second table, day length, and all unit conversions are stored as `bigint` literals. No floating-point drift on the conversion path.
   2. **Pure functions over events.** Worldline calculations take ordered arrays of `SpacetimeEvent` records and return proper time, interval classification (timelike/lightlike/spacelike), and frame-invariant quantities — never mutating state.
   3. **No hidden geocentrism.** The library exposes J2000.0 as a constant; it does not assume Earth, an Earth-bound observer, or terrestrial gravity anywhere in the core API.
   4. **Auditability.** Every number on the [companion site](https://brightdate.org/spacetime) is computed at render-time from the exported constants. No table is pre-baked.

   The companion site provides an interactive distance converter, a live twin-paradox slider, and a worked Mars-latency example, all driven by the same library import a downstream consumer would use.

------

   ## 6. Related work

   - **Geometrized units (Misner–Thorne–Wheeler, 1973):** sets G = c = 1. Bright units fix only c = 1 — Newton's constant remains dimensional, because its measurement uncertainty (~10⁻⁵ relative) is large enough that fixing it would couple the unit system to a measurement rather than a definition.
   - **Planck units:** fixes c = G = hbar = k_B = 1. Useful in quantum gravity; absurdly small for engineering (l_P ~ 10⁻³ m).
   - **Natural (particle-physics) units:** c = hbar = 1, energies in eV. Optimised for high-energy phenomenology; spatial distances become inverse-energies, which is unhelpful for spacecraft.
   - **IAU 2012 conventions:** standardises the AU as an exact metre count but retains the historical geocentric anchor.
   - **CCSDS Time Code Formats:** standardises *encoding* of time tags for spacecraft telemetry, not the underlying unit system.

   Bright fills a specific gap: a c = 1 convention with SI prefixes, an exact SI grounding, an explicit epoch, and a public reference implementation. To the author's knowledge no prior published convention combines all four.

------

   ## 7. Discussion

   ### 7.1 What this is not

   This is not new physics. It does not modify special or general relativity, does not propose new constants, and does not contradict the SI. It is a **units convention** plus a reference implementation. Its claim to attention is operational, not theoretical.

   ### 7.2 Limitations

   - **Bright units do not subsume curved-spacetime ADM/BSSN coordinates.** In numerical relativity, problem-specific units (geometrized + mass-scaled) remain preferable.
   - **Below sub-microsecond scales** (high-precision pulsar timing, optical clock comparisons), the relevant unit is the second itself — the BrightMetre offers no advantage there.
   - **The standard is intentionally minimal.** It defines a length-time unit and a hierarchy; it does not opine on coordinate systems beyond Minkowski, on energy units, or on momentum.

   ### 7.3 Invitation

   The standard is published under a permissive licence and the reference implementation is open source. Critiques, alternative prefix proposals, and formal review from the metrology, astronomy, and spaceflight communities are explicitly invited. The author's expectation is not that *this exact proposal* becomes standard, but that publishing a complete, runnable, exact version makes the conversation tractable for the first time.

------

   ## References

   1. H. Minkowski, "Raum und Zeit" (1908). Address to the 80th Assembly of German Natural Scientists and Physicians, Cologne.
   2. C. W. Misner, K. S. Thorne, J. A. Wheeler, *Gravitation* (W. H. Freeman, 1973).
   3. S. M. Carroll, *Spacetime and Geometry: An Introduction to General Relativity* (Addison-Wesley, 2004).
   4. BIPM, *The International System of Units (SI), 9th edition* (2019).
   5. International Astronomical Union, *Resolution B2 on the re-definition of the astronomical unit of length* (XXVIII General Assembly, Beijing, 2012).
   6. IERS, *Bulletin C — leap second announcements* (ongoing).
   7. CCSDS, *Time Code Formats*, CCSDS 301.0-B-4 (2010).
   8. J. Mulein, `@brightchain/brightdate` reference implementation, https://github.com/Digital-Defiance/brightdate.