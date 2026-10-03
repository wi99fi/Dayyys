---
name: Planner privacy
description: Privacy and persistence requirements for the doctor-day organizer.
---

The user's shift, clinic, and income information must be saved per authenticated account. Cloud persistence is required; device-only storage is not a substitute.

**Why:** The user requested cloud saving for personal work and income records.

**How to apply:** Keep planner reads and writes authenticated and scope every record to the signed-in Clerk user.