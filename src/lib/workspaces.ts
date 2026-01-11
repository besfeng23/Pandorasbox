'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type WorkspaceRole = 'member' | 'admin';

export type WorkspaceIndex = {
  workspaceId: string;
  name: string;
  role: WorkspaceRole;
  createdAt?: unknown;
};

export async function getActiveWorkspaceIdForUser(userId: string): Promise<string> {
  const firestoreAdmin = getFirestoreAdmin();

  const stateRef = firestoreAdmin
    .collection('users')
    .doc(userId)
    .collection('state')
    .doc('workspace');

  const stateSnap = await stateRef.get();
  const activeWorkspaceId = stateSnap.data()?.activeWorkspaceId as string | undefined;
  if (activeWorkspaceId) return activeWorkspaceId;

  // If the user already has workspace index docs, pick the first and set it active.
  const wsIndexSnap = await firestoreAdmin
    .collection('users')
    .doc(userId)
    .collection('workspaces')
    .limit(1)
    .get();

  if (!wsIndexSnap.empty) {
    const workspaceId = wsIndexSnap.docs[0].id;
    await stateRef.set(
      { activeWorkspaceId: workspaceId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return workspaceId;
  }

  // Otherwise, create a default personal workspace.
  const { workspaceId } = await createWorkspaceInternal({
    userId,
    name: 'Personal Workspace',
    setActive: true,
  });
  return workspaceId;
}

export async function createWorkspaceInternal(opts: {
  userId: string;
  name: string;
  setActive?: boolean;
}): Promise<{ workspaceId: string }> {
  const firestoreAdmin = getFirestoreAdmin();
  const workspaceRef = firestoreAdmin.collection('workspaces').doc();
  const workspaceId = workspaceRef.id;

  await workspaceRef.set({
    id: workspaceId,
    name: opts.name,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: opts.userId,
    plan: 'free',
  });

  // Membership (canonical)
  await firestoreAdmin
    .collection('workspaces')
    .doc(workspaceId)
    .collection('members')
    .doc(opts.userId)
    .set({
      userId: opts.userId,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
    });

  // Membership (indexable)
  await firestoreAdmin.collection('workspace_members').doc(`${workspaceId}_${opts.userId}`).set({
    workspaceId,
    userId: opts.userId,
    role: 'admin',
    createdAt: FieldValue.serverTimestamp(),
  });

  // User-owned index for client UI (allowed by existing rules)
  await firestoreAdmin
    .collection('users')
    .doc(opts.userId)
    .collection('workspaces')
    .doc(workspaceId)
    .set({
      workspaceId,
      name: opts.name,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
    });

  if (opts.setActive) {
    await firestoreAdmin
      .collection('users')
      .doc(opts.userId)
      .collection('state')
      .doc('workspace')
      .set(
        { activeWorkspaceId: workspaceId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
  }

  return { workspaceId };
}

export async function setActiveWorkspaceForUser(opts: {
  userId: string;
  workspaceId: string;
}): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();

  // Verify user has access via user-owned index doc (fast path).
  const idxRef = firestoreAdmin
    .collection('users')
    .doc(opts.userId)
    .collection('workspaces')
    .doc(opts.workspaceId);
  const idxSnap = await idxRef.get();
  if (!idxSnap.exists) {
    throw new Error('Not a member of that workspace.');
  }

  await firestoreAdmin
    .collection('users')
    .doc(opts.userId)
    .collection('state')
    .doc('workspace')
    .set(
      { activeWorkspaceId: opts.workspaceId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}


