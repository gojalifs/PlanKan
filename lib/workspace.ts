import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const MAX_FAMILY_MEMBERS = 5;
export const INVITATION_EXPIRY_DAYS = 7;

export interface WorkspaceWithMembers {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    userId: string;
    role: string;
    status: string;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  }[];
}

export interface WorkspaceInvitationWithWorkspace {
  id: string;
  workspaceId: string;
  email: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  workspace: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// ── Workspace CRUD ──────────────────────────────────────────────────────────

export async function createWorkspace(ownerId: string, name: string) {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      type: "FAMILY",
      ownerId,
    },
  });

  // Upsert: user mungkin pernah jadi member workspace lain lalu keluar
  // (row berstatus REMOVED tetap menyimpan unique userId).
  await prisma.workspaceMember.upsert({
    where: { userId: ownerId },
    update: {
      workspaceId: workspace.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    create: {
      workspaceId: workspace.id,
      userId: ownerId,
      role: "OWNER",
    },
  });

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId: ownerId,
      workspaceId: null,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
    },
  });

  if (activeSub) {
    await prisma.subscription.update({
      where: { id: activeSub.id },
      data: { workspaceId: workspace.id },
    });
  }

  return workspace;
}

export async function getWorkspace(id: string): Promise<WorkspaceWithMembers | null> {
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });
}

export async function getUserWorkspace(userId: string): Promise<WorkspaceWithMembers | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      workspace: {
        include: {
          members: {
            where: { status: "ACTIVE" },
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
  });
  return membership?.workspace ?? null;
}

export async function updateWorkspace(id: string, data: { name?: string }) {
  return prisma.workspace.update({
    where: { id },
    data,
  });
}

export async function deleteWorkspace(id: string) {
  // Jangan hapus riwayat subscription karena cascade: lepas ke personal dulu.
  await prisma.subscription.updateMany({
    where: { workspaceId: id },
    data: { workspaceId: null },
  });
  return prisma.workspace.delete({ where: { id } });
}

// ── Member Management ───────────────────────────────────────────────────────

export async function inviteMember(workspaceId: string, email: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: { where: { status: "ACTIVE" } } },
  });

  if (!workspace) throw new Error("Workspace tidak ditemukan");

  if (workspace.members.length >= MAX_FAMILY_MEMBERS) {
    throw new Error(`Maksimal ${MAX_FAMILY_MEMBERS} member di workspace family`);
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: { equals: email, mode: "insensitive" } },
      status: "ACTIVE",
    },
  });

  if (existingMember) {
    throw new Error("User sudah menjadi member workspace ini");
  }

  const existingInvitation = await prisma.workspaceInvitation.findFirst({
    where: {
      workspaceId,
      email: { equals: email, mode: "insensitive" },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error("Invitation sudah dikirim ke email ini");
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  return prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email,
      token,
      expiresAt,
    },
  });
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invitation) throw new Error("Invitation tidak ditemukan");
  if (invitation.status !== "PENDING") throw new Error("Invitation sudah diproses");
  if (invitation.expiresAt < new Date()) throw new Error("Invitation sudah expired");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User tidak ditemukan");

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Email tidak cocok dengan invitation");
  }

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
  });

  if (existingMembership?.status === "ACTIVE") {
    throw new Error("Kamu sudah menjadi member workspace lain");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: invitation.workspaceId },
    include: { members: { where: { status: "ACTIVE" } } },
  });

  if (!workspace) throw new Error("Workspace tidak ditemukan");

  if (workspace.members.length >= MAX_FAMILY_MEMBERS) {
    throw new Error(`Workspace sudah penuh (maksimal ${MAX_FAMILY_MEMBERS} member)`);
  }

  const [membership] = await prisma.$transaction([
    existingMembership
      ? prisma.workspaceMember.update({
          where: { id: existingMembership.id },
          data: {
            workspaceId: invitation.workspaceId,
            role: "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        })
      : prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: "MEMBER",
          },
        }),
    prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return membership;
}

export async function declineInvitation(token: string) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
  });

  if (!invitation) throw new Error("Invitation tidak ditemukan");
  if (invitation.status !== "PENDING") throw new Error("Invitation sudah diproses");

  return prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED" },
  });
}

export async function removeMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, status: "ACTIVE" },
  });

  if (!membership) throw new Error("Member tidak ditemukan");

  return prisma.workspaceMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED" },
  });
}

export async function leaveWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { workspace: { include: { members: { where: { status: "ACTIVE" } } } } },
  });

  if (!membership) throw new Error("Kamu tidak berada di workspace mana pun");

  if (membership.role === "OWNER") {
    const otherMembers = membership.workspace.members.filter(
      (m) => m.userId !== userId && m.status === "ACTIVE"
    );
    if (otherMembers.length > 0) {
      throw new Error("Owner tidak bisa leave jika masih ada member lain. Hapus semua member terlebih dahulu.");
    }

    // Owner sendirian: keluar berarti workspace dihapus (subscription dilepas
    // ke personal agar tidak ikut terhapus oleh cascade).
    await prisma.subscription.updateMany({
      where: { workspaceId: membership.workspaceId },
      data: { workspaceId: null },
    });
    await prisma.workspace.delete({ where: { id: membership.workspaceId } });
    return { deleted: true };
  }

  return prisma.workspaceMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED" },
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId, status: "ACTIVE" },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

// ── Permission Helpers ──────────────────────────────────────────────────────

export async function getWorkspaceRole(
  workspaceId: string,
  userId: string
): Promise<string | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, status: "ACTIVE" },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function canManageMembers(workspaceId: string, userId: string): Promise<boolean> {
  const role = await getWorkspaceRole(workspaceId, userId);
  return role === "OWNER";
}

// ── Resource Access Helpers ─────────────────────────────────────────────────

export async function getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { workspaceId: true },
  });
  return memberships.map((m) => m.workspaceId);
}

/**
 * Scope filter for resources visible to a user: their own personal resources
 * (workspaceId = null) plus every workspace they belong to. Use on models that
 * carry `userId` + `workspaceId` (wallet, transaction, budget, category, goal).
 */
export type AccessCondition =
  | { userId: string; workspaceId: null }
  | { workspaceId: { in: string[] } };

export async function getAccessScope(userId: string) {
  const workspaceIds = await getAccessibleWorkspaceIds(userId);
  const or: AccessCondition[] = [{ userId, workspaceId: null }];
  if (workspaceIds.length > 0) {
    or.push({ workspaceId: { in: workspaceIds } });
  }
  return { workspaceIds, or };
}

export async function getInvitationByToken(
  token: string
): Promise<WorkspaceInvitationWithWorkspace | null> {
  return prisma.workspaceInvitation.findUnique({
    where: { token },
    include: {
      workspace: {
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });
}

export async function getPendingInvitations(workspaceId: string) {
  return prisma.workspaceInvitation.findMany({
    where: {
      workspaceId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelInvitation(invitationId: string) {
  return prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: { status: "EXPIRED" },
  });
}
