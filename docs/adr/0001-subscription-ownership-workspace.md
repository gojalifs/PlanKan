# ADR 0001: Subscription Ownership Moves to Workspace

## Status
Accepted

## Context
Family plan adalah satu subscription untuk banyak user. Model user-owned subscription menyulitkan sharing.

## Decision
Subscription dipindahkan dari `User` ke `Workspace`. `workspaceId` nullable untuk backward compatibility dengan subscription user-owned.

## Consequences
- Existing subscription tetap valid.
- Saat user membuat Family workspace, subscription dapat dimigrasi.
- Personal workspace memakai user-owned subscription sebagai fallback.
EOF