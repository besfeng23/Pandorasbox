'use server';

import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { createWorkspaceInternal, getActiveWorkspaceIdForUser, setActiveWorkspaceForUser } from '@/lib/workspaces';
import { randomBytes } from 'crypto';

async function getUserIdFromToken(idToken: string): Promise<string> {
  if (!idToken) throw new Error('User not authenticated.');
  const decoded = await getAuthAdmin().verifyIdToken(idToken);
  return decoded.uid;
}

export async function ensureDefaultWorkspace(idToken: string): Promise<{ workspaceId: string }> {
  const userId = await getUserIdFromToken(idToken);
  const workspaceId = await getActiveWorkspaceIdForUser(userId);
  return { workspaceId };
}

export async function listUserWorkspaces(idToken: string): Promise<{
  activeWorkspaceId: string | null;
  workspaces: Array<{ workspaceId: string; name: string; role: 'member' | 'admin' }>;
}> {
  const userId = await getUserIdFromToken(idToken);
  const firestoreAdmin = getFirestoreAdmin();

  const [stateSnap, idxSnap] = await Promise.all([
    firestoreAdmin.collection('users').doc(userId).collection('state').doc('workspace').get(),
    firestoreAdmin.collection('users').doc(userId).collection('workspaces').get(),
  ]);

  const activeWorkspaceId = (stateSnap.data()?.activeWorkspaceId as string | undefined) || null;
  const workspaces = idxSnap.docs
    .map((d) => d.data())
    .map((d: any) => ({
      workspaceId: d.workspaceId || d.id,
      name: d.name || 'Workspace',
      role: (d.role as 'member' | 'admin') || 'member',
    }));

  return { activeWorkspaceId, workspaces };
}

export async function createWorkspace(idToken: string, name: string): Promise<{ workspaceId: string }> {
  const userId = await getUserIdFromToken(idToken);
  const safeName = (name || '').trim().slice(0, 80) || 'New Workspace';
  const { workspaceId } = await createWorkspaceInternal({ userId, name: safeName, setActive: true });
  return { workspaceId };
}

export async function setActiveWorkspace(idToken: string, workspaceId: string): Promise<{ success: boolean }> {
  const userId = await getUserIdFromToken(idToken);
  await setActiveWorkspaceForUser({ userId, workspaceId });
  return { success: true };
}

export async function inviteWorkspaceMember(
  idToken: string,
  workspaceId: string,
  email: string,
  role: 'member' | 'admin' = 'member'
): Promise<{ success: boolean; inviteId: string; invitedUserId?: string }> {
  const userId = await getUserIdFromToken(idToken);
  const firestoreAdmin = getFirestoreAdmin();
  const authAdmin = getAuthAdmin();

  const membershipSnap = await firestoreAdmin
    .collection('workspaces')
    .doc(workspaceId)
    .collection('members')
    .doc(userId)
    .get();

  if (!membershipSnap.exists || membershipSnap.data()?.role !== 'admin') {
    throw new Error('Permission denied: workspace admin required.');
  }

  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm.includes('@')) {
    throw new Error('Invalid email.');
  }

  const wsSnap = await firestoreAdmin.collection('workspaces').doc(workspaceId).get();
  const wsName = (wsSnap.data()?.name as string | undefined) || 'Workspace';

  // Attempt to auto-accept for existing users.
  let invitedUserId: string | undefined = undefined;
  try {
    const u = await authAdmin.getUserByEmail(emailNorm);
    invitedUserId = u.uid;
  } catch {
    // no-op
  }

  const inviteRef = firestoreAdmin.collection('workspace_invites').doc();
  const token = randomBytes(16).toString('hex');

  if (invitedUserId) {
    // Membership (canonical)
    await firestoreAdmin
      .collection('workspaces')
      .doc(workspaceId)
      .collection('members')
      .doc(invitedUserId)
      .set({
        userId: invitedUserId,
        role,
        createdAt: new Date(),
        invitedBy: userId,
      });

    // Membership (indexable)
    await firestoreAdmin.collection('workspace_members').doc(`${workspaceId}_${invitedUserId}`).set({
      workspaceId,
      userId: invitedUserId,
      role,
      createdAt: new Date(),
      invitedBy: userId,
    });

    // User-owned index for invited user
    await firestoreAdmin
      .collection('users')
      .doc(invitedUserId)
      .collection('workspaces')
      .doc(workspaceId)
      .set({
        workspaceId,
        name: wsName,
        role,
        createdAt: new Date(),
      });

    await inviteRef.set({
      id: inviteRef.id,
      workspaceId,
      workspaceName: wsName,
      email: emailNorm,
      role,
      token,
      status: 'accepted',
      invitedBy: userId,
      invitedUserId,
      createdAt: new Date(),
      acceptedAt: new Date(),
    });
  } else {
    await inviteRef.set({
      id: inviteRef.id,
      workspaceId,
      workspaceName: wsName,
      email: emailNorm,
      role,
      token,
      status: 'pending',
      invitedBy: userId,
      createdAt: new Date(),
    });
  }

  return { success: true, inviteId: inviteRef.id, ...(invitedUserId ? { invitedUserId } : {}) };
}


