# Security Specification for Namma-Mistri

## Data Invariants
1. A site must belong to the user who created it (ownerId).
2. A laborer record must belong to the mistri (ownerId).
3. Attendance logs must reference a valid laborer and site, and must be created by the owner.
4. Photos must reference a valid site and be uploaded by the owner.
5. User settings (rates) should only be accessible/modifiable by that specific user.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing (Site)**: Creating a site with a different `ownerId` than `request.auth.uid`.
2. **Access Breach (Site)**: Reading a site document without being the owner.
3. **Privilege Escalation (User)**: Modifying another user's profile/rates.
4. **Invalid Rate (User)**: Setting negative material rates.
5. **Orphaned Attendance**: Creating an attendance log for a site that doesn't exist.
6. **Shadow Update (Laborer)**: Adding a hidden `isVerified: true` field to a laborer record.
7. **Identity Poisoning (ID)**: Using a massive 2KB string as a `siteId`.
8. **Malicious Photos**: Uploading a photo metadata entry with a fake `ownerId`.
9. **Timestamp Spoofing**: Setting a `createdAt` in the future or past manually.
10. **Resource Exhaustion**: Creating 10,000 sites in a loop (throttled by rules/quotas where possible).
11. **Cross-User Leak**: Listing all attendance logs across all users (Query Enforcer check).
12. **Status Shortcutting**: Directly modifying immutable fields like `originalOwnerId` (if we had them, here we have `ownerId`).

## Test Runner (Logic Outline)
The standard `firestore.rules.test.ts` would verify that all 12 payloads return `PERMISSION_DENIED`. Specifically:
- `ownerId == request.auth.uid` is enforced.
- `get(/databases/$(database)/documents/sites/$(incoming().siteId))` is checked during creation of sub-resources.
- `affectedKeys().hasOnly(...)` ensures no "Ghost Fields".
- String sizes are capped.
