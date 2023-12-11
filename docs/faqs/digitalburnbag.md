---
layout: default
title: "Digital Burnbag FAQ"
parent: FAQs
---

# Digital Burnbag: Frequently Asked Questions (FAQ)

## 1. What exactly is a "Digital Burnbag"?

In the physical world, a burnbag is used to collect sensitive documents for high-temperature destruction. The **Digital Burnbag** is a decentralized, "Owner-Free" vault where data is programmed to become permanently unrecoverable based on triggers you define—such as a timer, a "dead man's switch" (heartbeat), or a manual "Nuke" command.

## 2. How do you "delete" something on a decentralized blockchain?

We don't try to "scrub" every shard of data off 1,000 nodes—that is mathematically impossible in a distributed system. Instead, we use **Cryptographic Erasure**.

- **The Ingredients:** Your data is broken into encrypted, anonymous blocks scattered across the network.
- **The Recipe:** The "Recipe" is the metadata that contains both the **Map** (the specific order required to reconstruct the blocks) and the **Keys** (required to decrypt the resulting stream).
- **The Action:** To "burn" the bag, the system destroys the **Recipe**. Without that map and those keys, the ingredients are just statistical noise. Even with a supercomputer, those bits can never be reassembled.

## 3. Can't someone just "scrape" the blocks and crack them later?

This is the "Analog Hole" concern, and we solve it with two layers of defense:

1. **Spatial Entropy:** An attacker might copy the blocks, but they don't know which blocks belong to you or what order they go in. Without the **Recipe**, they are holding a billion puzzle pieces with no picture on the box.
2. **Mutation-on-Read:** We utilize a state machine where any attempt to access the Recipe triggers a permanent, immutable mutation on the **BrightChain Ledger**.
3. **The Proof:** If you check your vault and see the "Expected Value" has changed, you have mathematical proof that the seal was broken.

## 4. What if Digital Defiance (the developers) gets a subpoena?

We architected the system so that we **cannot** comply.

- Because the system is decentralized and the keys are held in a "Governance-Controlled" state, there is no "Master Key."
- We do not have the Recipe. If a Burnbag trigger is met, the data is gone for us just as much as it is for anyone else. Mathematics does not accept a search warrant.

## 5. What is the "Dead Man's Switch"?

The Burnbag can be set to monitor a "Heartbeat"—a periodic signal from you. If the signal stops for a predetermined amount of time (indicating you are incapacitated or unable to access the system), the Ledger automatically triggers the destruction of the Recipe. Your secrets die with you, or are released to a pre-authorized "Succession Quorum" of your choosing.

## 6. What happens if I lose my own access?

The "Owner-Free" nature of the system means there is no "Forgot Password" link. If you lose your primary credentials and haven't set up a **Governance-Recovery** quorum (trusted contacts), the Recipe is lost. The data remains encrypted and disordered forever.