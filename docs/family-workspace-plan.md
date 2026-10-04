# Family Workspace - Implementation Plan

## Overview

User dengan plan FAMILY dapat mengundang hingga 4 orang lain (total 5 member) untuk bergabung ke workspace bersama. Workspace family memiliki shared resources (wallets, budgets, goals) dan personal resources yang tetap private per member.

---

## Architecture Decision

### Subscription Ownership: User → Workspace

**Decision**: Subscription dipindah dari `User` ke `Workspace`.

Alasan:
- Family plan secara natural adalah satu subscription untuk banyak user
- Menghindari kompleksitas "user A punya plan Family, user B tidak"
- Lebih scalable untuk future team/enterprise plans

**Migration strategy**:
- Existing subscriptions tetap valid (user-owned)
- Saat user pertama kali create Family workspace, subscription di-migrate ke workspace
- Personal workspace tetap menggunakan user-owned subscription sebagai fallback

---

## Phase 1: Database Schema

### New Models

```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  type        String   @default("FAMILY") // "FAMILY" | future: "TEAM"
  ownerId     String   // User ID of workspace creator
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner       User             @relation("WorkspaceOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     WorkspaceMember[]
  subscription Subscription?
  wallets     Wallet[]
  budgets     Budget[]
  goals       FinancialGoal[]
  categories  Category[]
  transactions Transaction[]

  @@index([ownerId])
  @@map("workspace")
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String   @unique // User hanya bisa join 1 workspace
  role        String   @default("MEMBER") // "OWNER" | "MEMBER"
  status      String   @default("ACTIVE") // "ACTIVE" | "REMOVED"
  joinedAt    DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@map("workspace_member")
}

model WorkspaceInvitation {
  id          String    @id @default(cuid())
  workspaceId String
  email       String
  role        String    @default("MEMBER")
  status      String    @default("PENDING") // "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  token       String    @unique
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([email])
  @@index([token])
  @@map("workspace_invitation")
}
```

### Schema Changes

```prisma
// Subscription: tambah workspaceId (nullable untuk backward compat)
model Subscription {
  // ... existing fields ...
  workspaceId String?  // NEW: null = user-owned, non-null = workspace-owned

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// User: tambah relasi workspace
model User {
  // ... existing fields ...
  workspaceMemberships WorkspaceMember[]  // NEW
  ownedWorkspaces      Workspace[]        // NEW: relation "WorkspaceOwner"
}

// Wallet: tambah workspaceId
model Wallet {
  // ... existing fields ...
  workspaceId String?  // NEW: null = personal wallet

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// Transaction: tambah workspaceId
model Transaction {
  // ... existing fields ...
  workspaceId String?  // NEW

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// Budget: tambah workspaceId
model Budget {
  // ... existing fields ...
  workspaceId String?  // NEW

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// FinancialGoal: tambah workspaceId
model FinancialGoal {
  // ... existing fields ...
  workspaceId String?  // NEW

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

// Category: tambah workspaceId
model Category {
  // ... existing fields ...
  workspaceId String?  // NEW

  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}
```

### Entitlement Changes

```typescript
// lib/plans-config.ts - tambah entitlement baru
{
  key: "FAMILY",
  // ... existing entitlements ...
  "workspace.max_members": 5,        // NEW
  "workspace.shared_wallets": true,  // NEW
  "workspace.shared_budgets": true,  // NEW
  "workspace.member_roles": true,    // NEW
}
```

---

## Phase 2: Core Backend

### 2.1 Workspace Service (`lib/workspace.ts`)

```typescript
// Core workspace operations
export async function createWorkspace(ownerId: string, name: string): Promise<Workspace>
export async function getWorkspace(id: string): Promise<Workspace | null>
export async function getUserWorkspaces(userId: string): Promise<Workspace[]>
export async function updateWorkspace(id: string, data: { name?: string }): Promise<Workspace>
export async function deleteWorkspace(id: string): Promise<void>

// Member management
export async function inviteMember(workspaceId: string, email: string): Promise<WorkspaceInvitation>
export async function acceptInvitation(token: string, userId: string): Promise<WorkspaceMember>
export async function declineInvitation(token: string): Promise<void>
export async function removeMember(workspaceId: string, userId: string): Promise<void>
export async function leaveWorkspace(userId: string): Promise<void>
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]>

// Permission helpers
export async function getWorkspaceRole(workspaceId: string, userId: string): Promise<string | null>
export async function canManageMembers(workspaceId: string, userId: string): Promise<boolean>
```

### 2.2 Invitation Flow

```
1. Owner invites via email
   → POST /api/workspace/{id}/invitations { email, role }
   → Generate unique token (crypto.randomUUID)
   → Store in workspace_invitation (expires in 7 days)
   → Send email with invitation link

2. Invitee accepts
   → GET /api/workspace/invitations/{token} (view invitation details)
   → POST /api/workspace/invitations/{token}/accept
   → Create WorkspaceMember record
   → Mark invitation as ACCEPTED
   → If user doesn't exist, redirect to register with token
```

### 2.3 Permission System

| Permission | OWNER | MEMBER |
|---|---|---|
| Manage members | ✅ | ❌ |
| Edit workspace settings | ✅ | ❌ |
| Create/edit shared wallets | ✅ | ✅ |
| Create/edit shared budgets | ✅ | ✅ |
| Create/edit shared goals | ✅ | ✅ |
| View shared resources | ✅ | ✅ |
| Remove workspace | ✅ | ❌ |
| Leave workspace | ❌ (jika ada member) | ✅ |

### 2.4 API Routes

```
GET    /api/workspaces                          # List user's workspaces
POST   /api/workspaces                          # Create workspace
GET    /api/workspaces/[id]                     # Get workspace details
PATCH  /api/workspaces/[id]                     # Update workspace
DELETE /api/workspaces/[id]                     # Delete workspace (owner only)

GET    /api/workspaces/[id]/members             # List members
POST   /api/workspaces/[id]/invitations         # Invite member (owner only)
GET    /api/workspaces/[id]/invitations         # List invitations (owner only)
DELETE /api/workspaces/[id]/invitations/[invId] # Cancel invitation (owner only)
DELETE /api/workspaces/[id]/members/[userId]    # Remove member (owner only)
POST   /api/workspaces/[id]/leave               # Leave workspace (member)

GET    /api/workspace/invitations/[token]       # View invitation (public)
POST   /api/workspace/invitations/[token]/accept # Accept invitation
POST   /api/workspace/invitations/[token]/decline # Decline invitation
```

---

## Phase 3: Frontend

### 3.1 Pages

```
app/workspace/
├── page.tsx                    # Workspace list / selector
├── [id]/
│   ├── page.tsx                # Workspace dashboard
│   ├── members/
│   │   └── page.tsx            # Member management
│   └── settings/
│       └── page.tsx            # Workspace settings
└── invite/
    └── [token]/
        └── page.tsx            # Invitation accept/decline
```

### 3.2 Components

```
components/workspace/
├── workspace-switcher.tsx       # Dropdown to switch between workspaces
├── workspace-card.tsx          # Workspace preview card
├── create-workspace-dialog.tsx # Create new workspace
├── member-list.tsx             # List members with roles
├── invite-member-dialog.tsx    # Invite new member
├── invitation-card.tsx         # Pending invitation display
└── role-badge.tsx              # Role indicator badge
```

### 3.3 UI Flow

**Owner Flow:**
1. User dengan plan Family ke halaman Workspace
2. Klik "Buat Workspace Family"
3. Isi nama workspace
4. Diarahkan ke dashboard workspace
5. Klik "Undang Member" → masukkan email → kirim
6. Lihat daftar member dan role mereka

**Invitee Flow:**
1. Terima email invitation
2. Klik link → diarahkan ke halaman invitation
3. Jika belum login → redirect ke login/register
4. Lihat detail workspace (nama, owner)
5. Klik "Terima" atau "Tolak"
6. Jika terima → masuk ke workspace

---

## Phase 4: Shared Resources

### 4.1 Resource Visibility

Setiap resource (wallet, budget, goal, transaction) memiliki `workspaceId`:
- `workspaceId = null` → Personal resource (hanya visible oleh owner, di luar workspace)
- `workspaceId = "xxx"` → Shared resource (visible semua member)

**Family Workspace**: Semua wallet di family workspace adalah shared. Tidak ada personal wallet di dalam family workspace. Personal wallet hanya ada di luar workspace (workspaceId = null).

### 4.2 API Changes

Semua resource API perlu update:

```typescript
// Contoh: GET /api/wallets
// Before: return wallets where userId = currentUser
// After: return wallets where (userId = currentUser AND workspaceId = null)
//        OR (workspaceId IN user's workspaces)

// Contoh: POST /api/wallets
// Before: create wallet with userId = currentUser
// After: create wallet with userId = currentUser, workspaceId = body.workspaceId (optional)
// Note: Di family workspace, semua wallet wajib shared (workspaceId = workspace.id)
```

### 4.3 Filtering Strategy

```typescript
// lib/workspace.ts
export async function getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { workspaceId: true }
  });
  return memberships.map(m => m.workspaceId);
}

// Usage in API routes
const workspaceIds = await getAccessibleWorkspaceIds(user.id);
const wallets = await prisma.wallet.findMany({
  where: {
    OR: [
      { userId: user.id, workspaceId: null },  // Personal
      { workspaceId: { in: workspaceIds } }     // Shared
    ]
  }
});
```

---

## Phase 5: Migration Strategy

### 5.1 Database Migration

```sql
-- 1. Create new tables
CREATE TABLE workspace (...);
CREATE TABLE workspace_member (...);
CREATE TABLE workspace_invitation (...);

-- 2. Add workspace_id columns (nullable)
ALTER TABLE wallet ADD COLUMN workspace_id TEXT;
ALTER TABLE transaction ADD COLUMN workspace_id TEXT;
ALTER TABLE budget ADD COLUMN workspace_id TEXT;
ALTER TABLE financial_goal ADD COLUMN workspace_id TEXT;
ALTER TABLE category ADD COLUMN workspace_id TEXT;
ALTER TABLE subscription ADD COLUMN workspace_id TEXT;

-- 3. Add indexes
CREATE INDEX idx_wallet_workspace_id ON wallet(workspace_id);
-- ... etc
```

### 5.2 Backward Compatibility

- Semua `workspaceId` nullable → existing data tetap valid
- Existing subscriptions (user-owned) tetap berfungsi
- Personal resources (workspaceId = null) tidak berubah
- Gradual migration: user bisa create workspace kapan saja

### 5.3 Subscription Migration

Ketika user pertama kali create Family workspace:

```typescript
// lib/workspace.ts
export async function createWorkspace(ownerId: string, name: string) {
  // 1. Create workspace
  const workspace = await prisma.workspace.create({
    data: { name, ownerId }
  });

  // 2. Add owner as member
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: ownerId, role: "OWNER" }
  });

  // 3. Migrate active subscription to workspace
  const activeSub = await prisma.subscription.findFirst({
    where: { userId: ownerId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } }
  });

  if (activeSub) {
    await prisma.subscription.update({
      where: { id: activeSub.id },
      data: { workspaceId: workspace.id }
    });
  }

  return workspace;
}
```

---

## Phase 6: Email Templates

### 6.1 Invitation Email

```
Subject: [Name] mengundangmu ke Workspace Family PlanKan

Hi,

[Name] mengundangmu untuk bergabung ke workspace family "[Workspace Name]" di PlanKan.

Di workspace ini, kamu bisa:
- Lihat dan kelola shared wallets
- Buat shared budgets
- Track family financial goals
- Lihat family reports

[Klik di sini untuk menerima invitation]

Link ini berlaku 7 hari.

— PlanKan Team
```

---

## Phase 7: Testing

### 7.1 Unit Tests

```typescript
// lib/__tests__/workspace.test.ts
describe("Workspace Service", () => {
  it("should create workspace with owner as OWNER member");
  it("should invite member via email");
  it("should accept invitation and create membership");
  it("should enforce max 5 members");
  it("should prevent duplicate invitations");
  it("should expire invitations after 7 days");
  it("should allow owner to remove members");
  it("should prevent members from removing other members");
  it("should allow member to leave workspace");
  it("should prevent owner leaving with active members");
  it("should prevent user joining multiple workspaces");
});
```

### 7.2 Integration Tests

```typescript
// tests/api/workspace.test.ts
describe("Workspace API", () => {
  it("POST /api/workspaces - create workspace");
  it("GET /api/workspaces - list user workspaces");
  it("POST /api/workspaces/[id]/invitations - invite member");
  it("POST /api/workspace/invitations/[token]/accept - accept invitation");
});
```

---

## Implementation Order

| Step | Task | Dependencies |
|------|------|--------------|
| 1 | Update Prisma schema | None |
| 2 | Run migration | Step 1 |
| 3 | Create workspace service (`lib/workspace.ts`) | Step 2 |
| 4 | Create API routes | Step 3 |
| 5 | Create workspace pages | Step 4 |
| 6 | Create workspace components | Step 5 |
| 7 | Update existing APIs for shared resources | Step 3 |
| 8 | Email invitation | Step 4 |
| 9 | Tests | All |
| 10 | Polish & edge cases | All |

---

## Design Decisions

1. **User hanya bisa join 1 workspace**
   - Setiap user hanya bisa menjadi member di satu workspace saja
   - User yang sudah join workspace tidak bisa join workspace lain
   - User harus leave workspace terlebih dahulu sebelum bisa join workspace lain

2. **Member bisa leave workspace**
   - Member (non-owner) bisa leave workspace kapan saja
   - Owner tidak bisa leave jika masih ada member lain
   - Owner harus transfer ownership atau hapus semua member sebelum leave
   - Saat leave, personal resources tetap milik user

3. **Shared resources tidak bisa di-transfer ke personal**
   - Shared wallet/budget/goal tetap shared
   - Tidak ada mekanisme convert ke personal
   - Jika butuh personal, buat resource baru dengan workspaceId = null

4. **Handling saat subscription expired**
   - Workspace tetap ada, tidak dihapus
   - Fitur shared dinonaktifkan (read-only)
   - Data tidak dihapus
   - User masih bisa lihat data tapi tidak bisa edit
   - Saat subscription aktif kembali, fitur normal kembali

5. **Audit log**
   - Nice-to-have, tidak diimplementasikan di MVP
   - Bisa ditambahkan di future iteration

6. **Family workspace = semua wallet shared**
   - Family plan ditujukan untuk couple/keluarga kecil
   - Semua wallet di family workspace adalah shared wallet
   - Tidak ada personal wallet di dalam family workspace
   - Personal wallet hanya ada di luar workspace (workspaceId = null)

---

## Estimated Effort

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Schema | 2-3 hours |
| Phase 2: Backend | 6-8 hours |
| Phase 3: Frontend | 8-10 hours |
| Phase 4: Shared Resources | 4-6 hours |
| Phase 5: Migration | 2-3 hours |
| Phase 6: Email | 2-3 hours |
| Phase 7: Testing | 4-6 hours |
| **Total** | **28-39 hours** |

---

## Future Enhancements (Post-MVP)

1. **Activity log** - Siapa mengubah apa di shared workspace
2. **Granular permissions** - Per-resource permission (e.g., view-only untuk certain members)
3. **Workspace templates** - Pre-configured workspace untuk keluarga, couple, dll
4. **Shared categories** - Category tree yang shared di workspace
5. **Workspace-level reports** - Aggregated reports across all members
6. **Real-time sync** - WebSocket untuk real-time updates di shared workspace
