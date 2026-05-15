---
layout: default
title: "The Bright Spacetime Standard: A Decimal-SI Operationalisation of the c = 1 Convention"
parent: "Papers"
---

# The Bright Spacetime Standard: A Decimal-SI Operationalisation of the c = 1 Convention

**Author:** Jessica Mulein (Digital Defiance)
**Reference implementation:** [`@brightchain/brightdate`](https://www.npmjs.com/package/@brightchain/brightdate)
**Interactive companion:** <https://brightdate.org/spacetime>
**Status:** Draft convention, v0.1 — comments and corrections welcome.
**Date:** 2026

---

## Abstract

Working relativists have set the speed of light to $c = 1$ since Minkowski's
1908 Cologne lectures introduced the four-dimensional spacetime formalism.
Despite a century of use in pedagogy and research, the convention has never
been *operationalised* outside textbooks: there is no agreed decimal-SI
hierarchy for the resulting unit, no shared epoch, and no public reference
implementation grounded in exact-integer constants. As a result, every mission
profile, latency budget, and proper-time calculation re-derives the same
algebra from a 1976-era patchwork of the Astronomical Unit, the Julian year,
and ad-hoc megasecond/light-minute mixtures.

We propose the **Bright Spacetime Standard**: a decimal-SI scalar hierarchy
for the $c = 1$ convention, anchored to the 2019 SI redefinition and the
J2000.0 epoch (IAU). A single unit — the **BrightMeter** (bm), exactly equal
to $c \cdot 1\,\mathrm{s} = 299{,}792{,}458\,\mathrm{m}$ — spans both space
and time. Coordinates become latencies; $\gamma$ collapses to
$1/\sqrt{1-\beta^{2}}$; and the Minkowski line element loses its factor of
$c$. We publish the standard alongside an open-source reference
implementation that derives every numerical claim on this page from
exact-integer constants at runtime.

## 1. Motivation

### 1.1 The convention works; the units do not

The $c = 1$ convention is universal in modern theoretical physics:

- Misner, Thorne, & Wheeler (*Gravitation*, 1973) use it from chapter 1.
- Carroll's *Spacetime and Geometry* (2004) introduces it before the metric.
- Every GR research paper since the 1960s drops $c$ from the line element
  unless explicitly converting back for an experimentalist audience.

What does *not* exist is a public, vendor-neutral way to **carry numbers in
this convention end-to-end** — from a JSON message between two spacecraft, to
a mission-planning notebook, to a published table. In practice, engineering
teams convert in and out of SI at every interface, with the conversion factor
($c = 299{,}792{,}458\,\mathrm{m/s}$, exact since 1983) hard-coded in dozens
of inconsistent places.

### 1.2 The legacy stack

The currently-deployed units for "physical distances larger than a planet"
are:

| Unit                | Definition                                         | Problem                                                                                      |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Astronomical Unit   | IAU 2012: $1\,\mathrm{AU} = 149{,}597{,}870{,}700\,\mathrm{m}$ (exact, by *fiat*) | Anchored historically to Earth's orbital semi-major axis — geocentric provincialism in disguise. |
| Light-Year          | $c \cdot$ (Julian year of 365.25 d)                | Defined from a calendar artefact, not a physical constant.                                   |
| Parsec              | Trigonometric definition via the AU and 1 arcsec   | Inherits AU's geocentricity; awkward outside astrometry.                                     |
| Light-Second/Minute | $c \cdot$ (SI second/minute)                       | Already in the spirit of $c = 1$ — but no standard decimal prefix hierarchy.                 |

The last row is the one we extend. The first three remain useful for
*continuity*; the standard provides exact integer conversions to all of them.

### 1.3 The 2019 SI redefinition makes this safe

Since 20 May 2019, all seven SI base units are defined from fixed numerical
values of fundamental constants. The metre is *derived* from the second via

$$
1\,\mathrm{m} \;\equiv\; \frac{1}{299{,}792{,}458}\;c \cdot 1\,\mathrm{s}.
$$

Inverting that definition costs nothing — it is the same physical reality
described in the same SI framework, expressed in a unit better matched to the
mathematics of relativity.

## 2. Definitions

### 2.1 The BrightMeter

$$
\boxed{\;1\,\mathrm{bm} \;\stackrel{\text{def}}{=}\; c \cdot 1\,\mathrm{s} \;=\; 299{,}792{,}458\,\mathrm{m}\;}
$$

The definition is **exact**: $c$ has a defined numerical value in SI, and the
SI second is defined from the caesium-133 hyperfine transition. No measurement
enters.

### 2.2 The Bright-Second

When the unit is used to denote a *temporal* interval rather than a spatial
extent, we call it a **Bright-Second** (bs). Numerically,
$1\,\mathrm{bs} = 1\,\mathrm{bm}$. The two names are a notational courtesy
to readers who want spatial-vs-temporal framing in their heads; the
underlying unit is one and the same.

### 2.3 Decimal-SI hierarchy

The BrightMeter takes the standard SI prefixes without modification:

| Symbol | Name             | Metres (exact)            | Useful for                          |
| ------ | ---------------- | ------------------------- | ----------------------------------- |
| μbm    | Microbright      | 299.792458                | Lab benches, fibre-optic delays     |
| mbm    | Millibright      | 299,792.458               | LEO orbits (~Earth's radius scale)  |
| bm     | BrightMeter      | 299,792,458               | Cislunar, geostationary, LEO comms  |
| kbm    | Kilobright       | 2.99792458 × 10¹¹         | Earth–Sun (1 AU ≈ 499 bm = 0.499 kbm) |
| Mbm    | Megabright       | 2.99792458 × 10¹⁴         | Inner-system mission planning       |
| Gbm    | Gigabright       | 2.99792458 × 10¹⁷         | Heliopause, near-interstellar       |

The same hierarchy applies to Bright-Seconds (μbs, mbs, bs, kbs, Mbs, Gbs).

### 2.4 The Light-Day family (calendar-aware extension)

For applications that need to interoperate with Earth-bound calendars
(scheduling, ephemerides, day-cycle missions), we additionally define:

$$
1\,\mathrm{Ld} \;\stackrel{\text{def}}{=}\; c \cdot 86{,}400\,\mathrm{s} \;=\; 2.59020683712 \times 10^{13}\,\mathrm{m}
$$

with corresponding **Light-Milliday** (Lmd) and **Light-Microday** (Lμd)
subdivisions. The Ld is *not* the base unit — it inherits the SI-day's
non-power-of-ten conversion to seconds — but it remains the natural choice
when "one calendar day of light-travel" is the relevant scale.

### 2.5 Epoch and metric signature

- **Epoch:** J2000.0 = 2000-01-01T12:00:00 TT (IAU, *Astronomical Almanac*).
  Coordinate times in the standard are measured from this instant. The
  reference implementation handles the TT → TAI → UTC chain explicitly,
  including all leap seconds through the most recent IERS bulletin.
- **Metric signature:** $(-,+,+,+)$, matching Misner–Thorne–Wheeler. The
  line element is
  $$
  ds^{2} \;=\; -dt^{2} + dx^{2} + dy^{2} + dz^{2}
  $$
  with $t,x,y,z$ all in BrightMetres / Bright-Seconds.

## 3. Consequences for the formalism

### 3.1 The Minkowski line element loses $c$

In SI units the spacetime line element carries an explicit factor:

$$
ds^{2} \;=\; -c^{2}\, dt^{2} + dx^{2} + dy^{2} + dz^{2}.
$$

In Bright units it does not:

$$
ds^{2} \;=\; -dt^{2} + dx^{2} + dy^{2} + dz^{2}.
$$

Every relativistic calculation downstream of the line element — proper time,
proper length, four-velocity normalisation, geodesic equations — shortens
correspondingly.

### 3.2 Velocity is dimensionless

A velocity $v$ in m/s becomes the dimensionless ratio $\beta = v/c$ in
$(-1, 1)$. The Lorentz factor reduces from

$$
\gamma \;=\; \frac{1}{\sqrt{1 - v^{2}/c^{2}}}
\qquad\text{to}\qquad
\gamma \;=\; \frac{1}{\sqrt{1 - \beta^{2}}}.
$$

Relativistic velocity addition reduces from $u' = (u + v)/(1 + uv/c^{2})$ to
$\beta' = (\beta_{1} + \beta_{2})/(1 + \beta_{1}\beta_{2})$. The relativistic
Doppler factor reduces from $\sqrt{(1+v/c)/(1-v/c)}$ to
$\sqrt{(1+\beta)/(1-\beta)}$. In every case, a factor of $c$ disappears
without changing the physics.

### 3.3 Coordinate equals latency

If a probe's spatial coordinate is $r$ BrightMetres from the observer, the
one-way light-travel time is *literally* $r$ Bright-Seconds. The position
vector and the communication budget become the same number. This is the
single most useful operational consequence of the standard.

## 4. Worked examples

### 4.1 Mars uplink latency

Take a representative Earth–Mars distance of $d = 0.52\,\mathrm{AU}$.

**Legacy SI calculation:**

$$
\begin{aligned}
d &= 0.52\,\mathrm{AU} \;=\; 0.52 \times 1.496 \times 10^{8}\,\mathrm{km} \;\approx\; 7.78 \times 10^{7}\,\mathrm{km} \\\\
t &= d/c \;=\; \frac{7.78 \times 10^{7}\,\mathrm{km}}{2.998 \times 10^{5}\,\mathrm{km/s}} \;\approx\; 259.3\,\mathrm{s}.
\end{aligned}
$$

**Bright-units calculation:**

$$
d \;=\; 259.3\,\mathrm{bs}, \qquad t \;=\; d \;=\; 259.3\,\mathrm{bs}.
$$

The coordinate **is** the latency. Round-trip is $2d = 518.6\,\mathrm{bs}
\approx 8.64\,\mathrm{min}$. No conversion ever entered the calculation.

### 4.2 Twin paradox (proper time along a worldline)

A traveller leaves Earth at $\beta = 0.6$, flies outward for $T = 10$
coordinate-years, instantaneously turns around, and returns. With endpoints
$O = (0,0,0,0)$, turn-around $A = (T, \beta T, 0, 0)$, and return
$B = (2T, 0, 0, 0)$, the proper time along each leg is

$$
\tau_{\text{leg}} \;=\; \sqrt{T^{2} - (\beta T)^{2}} \;=\; T\sqrt{1 - \beta^{2}} \;=\; T/\gamma.
$$

For $\beta = 0.6$, $\gamma = 1.25$ and total proper time is $2T/\gamma =
16.0$ years against $2T = 20$ years on the stay-at-home clock. The reference
implementation reproduces this number by direct integration of
$\sqrt{-ds^{2}}$ between the supplied `SpacetimeEvent`s, with no factor of
$c$ appearing in user code.

### 4.3 Heliopause in Gigabrights

The heliopause is roughly $120\,\mathrm{AU}$ from the Sun. Converting:

$$
120\,\mathrm{AU} \;\approx\; 5.99 \times 10^{4}\,\mathrm{bs} \;\approx\; 16.6\,\mathrm{hours light-travel}.
$$

In Gigabrights, that is $1.80 \times 10^{-4}\,\mathrm{Gbm}$. The order of
magnitude tells you immediately that interstellar distances begin one
hierarchy level higher — Proxima Centauri sits at $\sim 0.134\,\mathrm{Gbm}$.

## 5. Reference implementation

The standard is realised in [`@brightchain/brightdate`](https://www.npmjs.com/package/@brightchain/brightdate),
an MIT-licensed TypeScript library with a Rust port and a Homebrew CLI.
Design constraints:

1. **Exact-integer constants.** $c$, the leap-second table, day length, and
   all unit conversions are stored as `bigint` literals. No
   floating-point drift on the conversion path.
2. **Pure functions over events.** Worldline calculations take ordered
   arrays of `SpacetimeEvent` records and return proper time, interval
   classification (timelike/lightlike/spacelike), and frame-invariant
   quantities — never mutating state.
3. **No hidden geocentrism.** The library exposes J2000.0 as a constant;
   it does not assume Earth, an Earth-bound observer, or terrestrial gravity
   anywhere in the core API.
4. **Auditability.** Every number on the [companion site](https://brightdate.org/spacetime)
   is computed at render-time from the exported constants. No table is
   pre-baked.

The companion site provides an interactive distance converter, a live
twin-paradox slider, and a worked Mars-latency example, all driven by the
same library import a downstream consumer would use.

## 6. Related work

- **Geometrized units (Misner–Thorne–Wheeler, 1973):** sets $G = c = 1$.
  Bright units fix only $c = 1$ — Newton's constant remains dimensional,
  because its measurement uncertainty (~$10^{-5}$ relative) is large enough
  that fixing it would couple the unit system to a measurement rather than
  a definition.
- **Planck units:** fixes $c = G = \hbar = k_{B} = 1$. Useful in quantum
  gravity; absurdly small for engineering ($\ell_{P} \sim 10^{-35}\,\mathrm{m}$).
- **Natural (particle-physics) units:** $c = \hbar = 1$, energies in eV.
  Optimised for high-energy phenomenology; spatial distances become
  inverse-energies, which is unhelpful for spacecraft.
- **IAU 2012 conventions:** standardises the AU as an exact metre count but
  retains the historical geocentric anchor.
- **CCSDS Time Code Formats:** standardises *encoding* of time tags for
  spacecraft telemetry, not the underlying unit system.

Bright fills a specific gap: a $c = 1$ convention with SI prefixes, an exact
SI grounding, an explicit epoch, and a public reference implementation. To
the author's knowledge no prior published convention combines all four.

## 7. Discussion

### 7.1 What this is not

This is not new physics. It does not modify special or general relativity,
does not propose new constants, and does not contradict the SI. It is a
**units convention** plus a reference implementation. Its claim to attention
is operational, not theoretical.

### 7.2 Limitations

- **Bright units do not subsume curved-spacetime ADM/BSSN coordinates.** In
  numerical relativity, problem-specific units (geometrized + mass-scaled)
  remain preferable.
- **Below sub-microsecond scales** (high-precision pulsar timing, optical
  clock comparisons), the relevant unit is the second itself — the BrightMetre
  offers no advantage there.
- **The standard is intentionally minimal.** It defines a length-time unit
  and a hierarchy; it does not opine on coordinate systems beyond Minkowski,
  on energy units, or on momentum.

### 7.3 Invitation

The standard is published under a permissive licence and the reference
implementation is open source. Critiques, alternative prefix proposals, and
formal review from the metrology, astronomy, and spaceflight communities are
explicitly invited. The author's expectation is not that *this exact
proposal* becomes standard, but that publishing a complete, runnable, exact
version makes the conversation tractable for the first time.

## References

1. H. Minkowski, "Raum und Zeit" (1908). Address to the 80th Assembly of German
   Natural Scientists and Physicians, Cologne.
2. C. W. Misner, K. S. Thorne, J. A. Wheeler, *Gravitation* (W. H. Freeman,
   1973).
3. S. M. Carroll, *Spacetime and Geometry: An Introduction to General
   Relativity* (Addison-Wesley, 2004).
4. BIPM, *The International System of Units (SI), 9th edition* (2019).
5. International Astronomical Union, *Resolution B2 on the re-definition of
   the astronomical unit of length* (XXVIII General Assembly, Beijing, 2012).
6. IERS, *Bulletin C — leap second announcements* (ongoing).
7. CCSDS, *Time Code Formats*, CCSDS 301.0-B-4 (2010).
8. J. Mulein, `@brightchain/brightdate` reference implementation,
   <https://github.com/Digital-Defiance/brightdate>.
