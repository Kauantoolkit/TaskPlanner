import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Workspace, User } from '../types';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUser: User | null;
  members: User[];
  createWorkspace: (name: string, type: Workspace['type']) => void;
  switchWorkspace: (workspaceId: string) => void;
  addMember: (name: string, email: string) => void;
  removeMember: (userId: string) => void;
  canCreateForOthers: () => boolean;
  isOwner: () => boolean;
  getMemberById: (id: string) => User | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  id: 'local-user',
  name: 'Usuário Local',
  email: 'local@planner.com',
  role: 'owner',
};

const DEFAULT_WORKSPACE: Workspace = {
  id: 'workspace-local',
  name: 'Meu Espaço',
  type: 'personal',
  ownerId: 'local-user',
  memberIds: ['local-user'],
  createdAt: new Date().toISOString(),
};

export function WorkspaceProvider({ children }: { children: ReactNode }): React.ReactElement {
  // Estados sempre na mesma ordem
  const [currentUser] = useState<User>(DEFAULT_USER);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(DEFAULT_WORKSPACE.id);
  const [members, setMembers] = useState<User[]>([DEFAULT_USER]);

  // Workspace atual computado
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || DEFAULT_WORKSPACE;

  // Funções - definidas uma única vez
  const createWorkspace = useCallback((name: string, type: Workspace['type']) => {
    const newWorkspace: Workspace = {
      id: `workspace-${Date.now()}`,
      name,
      type,
      ownerId: currentUser.id,
      memberIds: [currentUser.id],
      createdAt: new Date().toISOString(),
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    setCurrentWorkspaceId(newWorkspace.id);
  }, [currentUser.id]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
  }, []);

  const addMember = useCallback((name: string, email: string) => {
    const newMember: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: 'member',
    };
    setMembers(prev => [...prev, newMember]);
    setWorkspaces(prev => prev.map(w => 
      w.id === currentWorkspace.id 
        ? { ...w, memberIds: [...w.memberIds, newMember.id] }
        : w
    ));
  }, [currentWorkspace.id]);

  const removeMember = useCallback((userId: string) => {
    if (userId === currentWorkspace.ownerId) return;
    setWorkspaces(prev => prev.map(w =>
      w.id === currentWorkspace.id 
        ? { ...w, memberIds: w.memberIds.filter(id => id !== userId) }
        : w
    ));
  }, [currentWorkspace.id, currentWorkspace.ownerId]);

  const canCreateForOthers = useCallback(() => {
    return currentUser.role === 'owner' || currentUser.id === currentWorkspace.ownerId;
  }, [currentUser.role, currentUser.id, currentWorkspace.ownerId]);

  const isOwner = useCallback(() => {
    return currentUser.id === currentWorkspace.ownerId;
  }, [currentUser.id, currentWorkspace.ownerId]);

  const getMemberById = useCallback((id: string) => {
    return members.find(m => m.id === id);
  }, [members]);

  const value = useMemo(() => ({
    currentWorkspace,
    workspaces,
    currentUser,
    members: members.filter(m => currentWorkspace?.memberIds.includes(m.id)),
    createWorkspace,
    switchWorkspace,
    addMember,
    removeMember,
    canCreateForOthers,
    isOwner,
    getMemberById,
  }), [
    currentWorkspace,
    workspaces,
    currentUser,
    members,
    createWorkspace,
    switchWorkspace,
    addMember,
    removeMember,
    canCreateForOthers,
    isOwner,
    getMemberById,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};
