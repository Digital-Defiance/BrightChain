---
title: The Bright Spacetime Standard: A Decimal-SI Operationalisation of the c = 1 Convention
date: 2026-05-17
author: Jessica Mulein
excerpt: The Bright Spacetime Standard proposes a simple but long-overdue fix for space mission engineering: treat distance and time as the same thing. By defining a single unit — the BrightMeter, exactly equal to one light-second — the standard makes coordinates and latencies interchangeable. Earth–Mars at 259 light-seconds away? That's also your one-way signal delay, no conversion needed. Built on the 2019 SI redefinition and grounded in exact-integer constants, the standard is already implemented in a reference library (@brightchain/brightdate) and interactive at brightdate.org/spacetime. It's a draft convention, but one that makes you wonder why nobody formalized this sooner.
---

**Reference implementation:** [@brightchain/brightdate](https://www.npmjs.com/package/@brightchain/brightdate)

**Interactive companion:** [brightdate.org/spacetime](https://brightdate.org/spacetime)

**Status:** Draft convention, v0.1

------

### **Abstract**

Working relativists have set the speed of light to **c = 1** for over a century. Despite its use in research, this has never been **operationalised** for engineering. There is no agreed decimal-SI hierarchy, no shared epoch, and no public reference implementation grounded in exact-integer constants. Currently, mission profiles and latency budgets rely on a patchwork of the Astronomical Unit (AU) and Julian years—units anchored to Earth's specific orbit.

We propose the **Bright Spacetime Standard**: a decimal-SI scalar hierarchy for the **c = 1** convention. A single unit—the **BrightMeter (bm)**, exactly equal to **c · 1s**—spans both space and time. Coordinates become latencies, and the Minkowski line element loses its factor of c.

------

### **1. The Core Logic**

The 2019 SI redefinition allows us to derive the metre from the second:

> **1m ≡ (1 / 299,792,458) · c · 1s**

Inverting this, we define the **BrightMeter (bm)**:

> **1 bm = 299,792,458 metres (Exact)**

When used for time, we call it a **Bright-Second (bs)**. Numerically, **1 bs = 1 bm**.

------

### **2. The Scalar Hierarchy**

The standard uses SI prefixes to eliminate "geocentric provincialism":

- **mbm (Millibright):** ~300 km (LEO scale)
- **bm (BrightMeter):** ~300,000 km (Cislunar scale)
- **kbm (Kilobright):** ~300 million km (Solar scale. 1 AU ≈ 0.5 kbm)
- **Mbm (Megabright):** Inner-system mission planning
- **Gbm (Gigabright):** ~31.7 Light-Years (Interstellar scale)

------

### **3. Worked Examples**

#### **3.1 Mars Uplink Latency**

Current Earth–Mars distance: **d = 0.52 AU**

**Legacy Calculation:**

1. Convert AU to km: 0.52 × 149.6M km ≈ 77.8M km
2. Divide by c (299,792 km/s) ≈ **259.3s**

**Bright Units Calculation:**

1. **d = 259.3 bs**
2. **Latency (t) = 259.3 bs**

The coordinate **is** the latency. Round-trip is 2d = 518.6 bs. No conversion required.

#### **3.2 Velocity and Relativity**

Velocity becomes the dimensionless ratio **β**. The Lorentz factor (γ) reduces:

> **γ = 1 / sqrt(1 - β²)**

If you travel at **β = 0.6**, then **γ = 1.25**. In a 20-year (coordinate time) trip, proper time is simply **20 / 1.25 = 16 years**.

------

### **4. Reference Implementation**

This isn't just theory. The standard is implemented in `@brightchain/brightdate`.

- **Exact-integer constants:** No floating-point drift.
- **Epoch:** J2000.0 (IAU standard).
- **Auditability:** Every calculation on the companion site is computed at runtime from the source constants.

**Full Paper/Draft:** [github.brightchain.org/docs/papers/bright-spacetime-standard/](https://github.brightchain.org/docs/papers/bright-spacetime-standard/)

*Note: The name "Bright" comes from the BrightChain project, where this evolved from a decimal-time "joke" into a high-precision engineering necessity.*