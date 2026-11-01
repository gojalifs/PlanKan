import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { grantSubscription, currentPlanKey } from "@/lib/subscriptions";
import {
  MAX_FAMILY_MEMBERS,
  acceptInvitation,
  createWorkspace,
  declineInvitation,
  deleteWorkspace,
  getAccessScope,
  inviteMember,
  leaveWorkspace,
} from "@/lib/workspace";

let seq = 0;

async function makeUser(prefix = "ws") {
  seq += 1;
  const email = `${prefix}-${seq}@test.dev`;
  return prisma.user.create({
    data: { name: email, email, emailVerified: true },
  });
}

async function makeFamilyWorkspace(ownerId: string, name = "Keluarga") {
  await grantSubscription(ownerId, "FAMILY", { days: 30 });
  return createWorkspace(ownerId, name);
}

describe("workspace lifecycle", () => {
  it("createWorkspace makes the owner an OWNER and moves the personal subscription in", async () => {
    const owner = await makeUser("owner");
    await grantSubscription(owner.id, "FAMILY", { days: 30 });

    const workspace = await createWorkspace(owner.id, "Keluarga");

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId: owner.id },
    });
    expect(membership?.workspaceId).toBe(workspace.id);
    expect(membership?.role).toBe("OWNER");

    const sub = await prisma.subscription.findFirst({ where: { userId: owner.id } });
    expect(sub?.workspaceId).toBe(workspace.id);
    expect(await currentPlanKey(owner.id)).toBe("FAMILY");
  });

  it("members inherit the workspace plan without owning a subscription", async () => {
    const owner = await makeUser("owner");
    const member = await makeUser("member");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, member.email);
    await acceptInvitation(invitation.token, member.id);

    expect(await currentPlanKey(member.id)).toBe("FAMILY");
    expect(await prisma.subscription.count({ where: { userId: member.id } })).toBe(0);
  });

  it("inviteMember is case-insensitive about an existing member email", async () => {
    const owner = await makeUser("owner");
    const member = await makeUser("member");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, member.email);
    await acceptInvitation(invitation.token, member.id);

    await expect(
      inviteMember(workspace.id, member.email.toUpperCase())
    ).rejects.toThrow(/sudah menjadi member/);
  });

  it("inviteMember rejects a duplicate pending invitation", async () => {
    const owner = await makeUser("owner");
    const guest = await makeUser("guest");
    const workspace = await makeFamilyWorkspace(owner.id);

    await inviteMember(workspace.id, guest.email);

    await expect(inviteMember(workspace.id, guest.email)).rejects.toThrow(
      /sudah dikirim/
    );
  });

  it("inviteMember enforces the family member limit", async () => {
    const owner = await makeUser("owner");
    const workspace = await makeFamilyWorkspace(owner.id);

    for (let i = 1; i < MAX_FAMILY_MEMBERS; i += 1) {
      const extra = await makeUser("extra");
      await prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: extra.id, role: "MEMBER" },
      });
    }

    const late = await makeUser("late");
    await expect(inviteMember(workspace.id, late.email)).rejects.toThrow(/Maksimal/);
  });

  it("acceptInvitation requires the invited email", async () => {
    const owner = await makeUser("owner");
    const invited = await makeUser("invited");
    const impostor = await makeUser("impostor");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, invited.email);

    await expect(acceptInvitation(invitation.token, impostor.id)).rejects.toThrow(
      /Email tidak cocok/
    );
  });

  it("acceptInvitation rejects a user who already belongs to another workspace", async () => {
    const ownerA = await makeUser("owner");
    const ownerB = await makeUser("owner");
    const member = await makeUser("member");
    const workspaceA = await makeFamilyWorkspace(ownerA.id, "A");
    const workspaceB = await makeFamilyWorkspace(ownerB.id, "B");

    const first = await inviteMember(workspaceA.id, member.email);
    await acceptInvitation(first.token, member.id);

    const second = await inviteMember(workspaceB.id, member.email);
    await expect(acceptInvitation(second.token, member.id)).rejects.toThrow(
      /sudah menjadi member workspace lain/
    );
  });

  it("a removed member can join a new workspace", async () => {
    const ownerA = await makeUser("owner");
    const ownerB = await makeUser("owner");
    const member = await makeUser("member");
    const workspaceA = await makeFamilyWorkspace(ownerA.id, "A");
    const workspaceB = await makeFamilyWorkspace(ownerB.id, "B");

    const first = await inviteMember(workspaceA.id, member.email);
    await acceptInvitation(first.token, member.id);
    await leaveWorkspace(member.id);

    const second = await inviteMember(workspaceB.id, member.email);
    const membership = await acceptInvitation(second.token, member.id);

    expect(membership.workspaceId).toBe(workspaceB.id);
    expect(await prisma.workspaceMember.count({ where: { userId: member.id } })).toBe(1);
    expect(await currentPlanKey(member.id)).toBe("FAMILY");
  });

  it("owner leaving alone deletes the workspace and keeps the plan as personal", async () => {
    const owner = await makeUser("owner");
    const workspace = await makeFamilyWorkspace(owner.id);

    const result = await leaveWorkspace(owner.id);

    expect(result).toEqual({ deleted: true });
    expect(await prisma.workspace.findUnique({ where: { id: workspace.id } })).toBeNull();

    const sub = await prisma.subscription.findFirst({ where: { userId: owner.id } });
    expect(sub?.workspaceId).toBeNull();
    expect(await currentPlanKey(owner.id)).toBe("FAMILY");
  });

  it("owner cannot leave while another active member exists", async () => {
    const owner = await makeUser("owner");
    const member = await makeUser("member");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, member.email);
    await acceptInvitation(invitation.token, member.id);

    await expect(leaveWorkspace(owner.id)).rejects.toThrow(/Owner tidak bisa leave/);
    expect(await prisma.workspace.findUnique({ where: { id: workspace.id } })).not.toBeNull();
  });

  it("deleteWorkspace detaches the subscription instead of cascading it away", async () => {
    const owner = await makeUser("owner");
    const workspace = await makeFamilyWorkspace(owner.id);

    await deleteWorkspace(workspace.id);

    const sub = await prisma.subscription.findFirst({ where: { userId: owner.id } });
    expect(sub?.workspaceId).toBeNull();
    expect(await prisma.subscription.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("a declined invitation can no longer be accepted", async () => {
    const owner = await makeUser("owner");
    const guest = await makeUser("guest");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, guest.email);
    const declined = await declineInvitation(invitation.token);

    expect(declined.status).toBe("DECLINED");
    await expect(acceptInvitation(invitation.token, guest.id)).rejects.toThrow(
      /sudah diproses/
    );
  });

  it("an expired invitation can no longer be accepted", async () => {
    const owner = await makeUser("owner");
    const guest = await makeUser("guest");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, guest.email);
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await expect(acceptInvitation(invitation.token, guest.id)).rejects.toThrow(/expired/);
  });

  it("getAccessScope exposes personal resources plus the member workspace", async () => {
    const owner = await makeUser("owner");
    const member = await makeUser("member");
    const outsider = await makeUser("outsider");
    const workspace = await makeFamilyWorkspace(owner.id);

    const invitation = await inviteMember(workspace.id, member.email);
    await acceptInvitation(invitation.token, member.id);

    const personal = await prisma.wallet.create({
      data: { userId: member.id, name: "Personal member" },
    });
    const shared = await prisma.wallet.create({
      data: { userId: owner.id, workspaceId: workspace.id, name: "Shared" },
    });
    await prisma.wallet.create({
      data: { userId: outsider.id, name: "Outsider" },
    });

    const scope = await getAccessScope(member.id);
    expect(scope.workspaceIds).toEqual([workspace.id]);

    const visible = await prisma.wallet.findMany({
      where: { OR: scope.or },
      select: { id: true },
    });
    const ids = visible.map((w) => w.id).sort();
    expect(ids).toEqual([personal.id, shared.id].sort());
  });
});
