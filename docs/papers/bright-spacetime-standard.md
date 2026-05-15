8. Working relativists have set the speed of light to **c = 1** since Minkowski’s 1908 Cologne lectures introduced the four-dimensional spacetime formalism. Despite a century of use in pedagogy and research, the convention has never been **operationalised** outside textbooks: there is no agreed decimal-SI hierarchy for the resulting unit, no shared epoch, and no public reference implementation grounded in exact-integer constants. As a result, every mission profile, latency budget, and proper-time calculation re-derives the same algebra from a 1976-era patchwork of the Astronomical Unit, the Julian year, and ad-hoc megasecond/light-minute mixtures.
   
   We propose the **Bright Spacetime Standard**: a decimal-SI scalar hierarchy for the **c = 1** convention, anchored to the 2019 SI redefinition and the J2000.0 epoch (IAU). A single unit — the **BrightMeter (bm)**, exactly equal to **c · 1s = 299,792,458 m** — spans both space and time. Coordinates become latencies; **γ** (gamma) collapses to **1/√(1-β²)**; and the Minkowski line element loses its factor of **c**. We publish the standard alongside an open-source reference implementation that derives every numerical claim on this page from exact-integer constants at runtime.
   
   ### **Worked Examples**
   
   **4.1 Mars Uplink Latency** Take a representative Earth–Mars distance of **d = 0.52 AU**.
   
   **Legacy SI calculation:**
   
   - d = 0.52 AU = 0.52 × 1.496 × 10⁸ km ≈ 7.78 × 10⁷ km
   - t = d/c = (7.78 × 10⁷ km) / (2.998 × 10⁵ km/s) ≈ **259.3 s**
   
   **Bright Units calculation:**
   
   - **d = 259.3 bs**
   - **t = d = 259.3 bs**
   
   The coordinate **is** the latency. Round-trip is 2d = 518.6 bs ≈ 8.64 min. No conversion ever entered the calculation.
   
   **4.2 Twin Paradox (proper time along a worldline)** A traveller leaves Earth at **β = 0.6**, flies outward for **T = 10** coordinate-years, instantaneously turns around, and returns. With endpoints O = (0,0,0,0), turn-around A = (T, βT, 0, 0), and return B = (2T, 0, 0, 0), the proper time along each leg is:
   
   - **τ_leg = √(T² - (βT)²) = T√(1 - β²) = T/γ**
   
   For β = 0.6, γ = 1.25 and total proper time is **2T/γ = 16.0 years** against 2T = 20 years on the stay-at-home clock. The reference implementation reproduces this number by direct integration of **√(-ds²)** between the supplied SpacetimeEvents, with no factor of c appearing in user code.
   
   **4.3 Heliopause in Gigabrights** The heliopause is roughly **120 AU** from the Sun. Converting:
   
   - 120 AU ≈ 5.99 × 10⁴ bs ≈ 16.6 hours light-travel.
   - In Gigabrights, that is **1.80 × 10⁻⁴ Gbm**.
   
   The order of magnitude tells you immediately that interstellar distances begin one hierarchy level higher — Proxima Centauri sits at **~0.134 Gbm**.
   
   **Full Draft:** https://github.brightchain.org/docs/papers/bright-spacetime-standard/
   
   **Note:** The standard has "Bright" in the name because of [BrightDate](https://brightdate.org/) which itself is because [BrightChain](https://www.google.com/search?q=https://brightchain.org/) uses BrightDate as the time standard. BrightDate evolved from a "joke" that found true purpose.
