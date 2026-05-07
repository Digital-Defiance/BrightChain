# Security Policy

## Supported Versions

BrightChain is currently in an active pre-release state. Security patches are prioritized for the latest minor release branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.31.x  | :white_check_mark: |
| < 0.30  | :x:                |

## Reporting a Vulnerability

**Do not open a GitHub issue for security vulnerabilities.**

As an owner-free protocol focused on absolute data sovereignty, we take security reports with the highest priority. If you believe you have found a vulnerability in the BrightChain filesystem, the Reed-Solomon sharding implementation, or the BrightDate temporal standard, please follow the process below:

### How to Report
1.  **Direct Communication:** Please send an email to **security@digitaldefiance.org**. 
2.  **Details to Include:**
    * A detailed description of the vulnerability.
    * A proof-of-concept (PoC) or clear steps to reproduce the issue.
    * The potential impact (e.g., data loss, unauthorized access, or bypass of Reed-Solomon parity protections).
3.  **PGP Encryption:** We recommend encrypting your report.

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEafzBMxYJKwYBBAHaRw8BAQdAOZp96Q8AucDW+U1nZ91oP7EFfMunxeFL391e
UIK/d0m0VERpZ2l0YWwgRGVmaWFuY2UgU2VjdXJpdHkgKERpZ2l0YWwgRGVmaWFu
Y2UgU2VjdXJpdHkpIDxzZWN1cml0eUBkaWdpdGFsZGVmaWFuY2Uub3JnPoi1BBMW
CgBdFiEE/2/dE5UJBWBFHMjJd4/L2cVL2wkFAmn8wTMbFIAAAAAABAAObWFudTIs
Mi41KzEuMTIsMCwzAhsjBQkDwmcABQsJCAcCAiICBhUKCQgLAgQWAgMBAh4HAheA
AAoJEHePy9nFS9sJtZQA/1/CRz620riAmO1U6DgmC/p3EksoZz9/adzRmtWMNbSz
AP9lUrukbkScvfEsf49PiWyLNKumGqktDHsPoDzBD9S7C7g4BGn8wWESCisGAQQB
l1UBBQEBB0DVrZ6HtevvJnC9mZuQ4m+MO8bkD+rjPC3kGTxjUaUbZgMBCAeImgQY
FgoAQhYhBP9v3ROVCQVgRRzIyXePy9nFS9sJBQJp/MFhGxSAAAAAAAQADm1hbnUy
LDIuNSsxLjEyLDAsMwIbDAUJA8JnAAAKCRB3j8vZxUvbCUAOAQCj9uLAjaavoa14
30nXWjFfgae6h9+/SGsMWkE0mn1m8AD/XXOdKd0FoRVa30arZ3TjYr9a8ASp9F2V
ylMv+cUDsgk=
=ZPVM
-----END PGP PUBLIC KEY BLOCK-----
```


### What to Expect
* **Acknowledgment:** You will receive a confirmation of your report within **48 hours**.
* **Triage & Assessment:** We will provide an initial assessment and an estimated timeline for a fix within **7 business days**.
* **Ongoing Updates:** We will provide status updates every **3 days** until the vulnerability is resolved.
* **Coordinated Disclosure:** Once a fix is released, we will provide credit to the researcher (unless anonymity is requested).

## Our Security Philosophy

BrightChain is built on a **spec-driven** architecture. Our security model is grounded in:
* **Mathematical Verification:** We ensure our hardware-accelerated Reed-Solomon implementations are constant-time and resistant to side-channel analysis.
* **Zero-Knowledge Architecture:** The protocol is designed so that node operators never have visibility into the unencrypted data they host.
* **Temporal Integrity:** By utilizing the **BrightDate (J2000.0)** standard, we eliminate race conditions and time-smearing vulnerabilities inherent in UTC-dependent distributed systems.
