---
title: "TODO List"
parent: "Roadmaps"
nav_order: 9
---

- [x] brightchain-cpp: BrightChain C++ client, in progress
- [ ] BrightDB read/write ACLs
  - we have encrypted pools that restrict participation to a select group of participants, but we don't have a way to have public read, restricted write.
  - the only way I can think of to have read-only data that users cannot write is to have either encrypted data (which users then cannot read), or to use signatures and have the app only read blocks signed by allowed users since there's no way to prevent the pool from being written to otherwise.
  - I think signatures are going to have to do it but we'll have to look into this deeper.
  - the db server could not accept creation of CBLs/writes by non approved users, thus the head registry never gets the unauthorized data. so encryption controls the head registry. this seems like a promising avenue.
  - perhaps a combination of signatures and head registry acls.
- [ ] BrightDB node-less client mode
  - Ability to fetch blocks and operate the database in read mode without a node server running locally