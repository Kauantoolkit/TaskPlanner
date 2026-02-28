import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Workspace, User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [members, setMembers] = useState<User[]>([]);
  const [initialized, setInitialized] = useState(false);

  const isMountedRef = useRef(true);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Função para inicializar workspace (definida sem useCallback)
  const initWorkspace = (userId: string, isLocal: boolean = false) => {
    if (!isMountedRef.current) return;

    const savedWorkspaces = localStorage.getItem(`workspaces_${userId}`);
    if (savedWorkspaces) {
      const parsed = JSON.parse(savedWorkspaces);
      setWorkspaces(parsed);
      
      const savedCurrentId = localStorage.getItem(`current_workspace_${userId}`);
      if (savedCurrentId && parsed.find((w: Workspace) => w.id === savedCurrentId)) {
        setCurrentWorkspaceId(savedCurrentId);
      } else {
        setCurrentWorkspaceId(parsed[0]?.id || '');
      }
    } else {
      const initialWorkspace: Workspace = {
        id: `workspace-${Date.now()}`,
        name: 'Meu Espaço',
        type: 'personal',
        ownerId: userId,
        memberIds: [userId],
        createdAt: new Date().toISOString(),
      };
      setWorkspaces([initialWorkspace]);
      setCurrentWorkspaceId(initialWorkspace.id);
      localStorage.setItem(`workspaces_${userId}`, JSON.stringify([initialWorkspace]));
    }

    const savedMembers = localStorage.getItem(`members_${userId}`);
    const userData = isLocal 
      ? { id: userId, name: 'Usuário Local', email: 'local@planner.com', role: 'owner' as const }
      : null;
    
    if (savedMembers) {
      setMembers(JSON.parse(savedMembers));
    } else if (userData) {
      setMembers([userData]);
      localStorage.setItem(`members_${userId}`, JSON.stringify([userData]));
    }
    
    setInitialized(true);
  };

  // Escuta auth
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const localUser: User = {
        id: 'local-user',
        name: 'Usuário Local',
        email: 'local@planner.com',
        role: 'owner',
      };
      setCurrentUser(localUser);
      initWorkspace('local-user', true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      setSupabaseUser(session?.user ?? null);
    }).catch(() => {
      if (isMountedRef.current) {
        setSupabaseUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMountedRef.current) {
        setSupabaseUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Quando supabaseUser mudar
  useEffect(() => {
    if (!isSupabaseConfigured && currentUser) {
      initWorkspace(currentUser.id, true);
      return;
    }

    if (!supabaseUser) {
      if (isSupabaseConfigured) {
        setCurrentUser(null);
        setWorkspaces([]);
        setMembers([]);
        setInitialized(false);
      }
      return;
    }

    const internalUser: User = {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      role: 'owner',
    };

    setCurrentUser(internalUser);
    initWorkspace(supabaseUser.id, false);
  }, [supabaseUser, currentUser]);

  // Salvar workspaces
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && workspaces.length > 0 && initialized) {
      localStorage.setItem(`workspaces_${userId}`, JSON.stringify(workspaces));
    }
  }, [workspaces, supabaseUser, currentUser, initialized]);

  // Salvar workspace atual
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && currentWorkspaceId && initialized) {
      localStorage.setItem(`current_workspace_${userId}`, currentWorkspaceId);
    }
  }, [currentWorkspaceId, supabaseUser, currentUser, initialized]);

  // Salvar membros
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && members.length > 0 && initialized) {
      localStorage.setItem(`members_${userId}`, JSON.stringify(members));
    }
  }, [members, supabaseUser, currentUser, initialized]);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;

  const createWorkspace = (name: string, type: Workspace['type']) => {
    if (!currentUser) return;

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
  };

  const switchWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
  };

  const addMember = (name: string, email: string) => {
    if (!currentWorkspace || !currentUser) return;

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
  };

  const removeMember = (userId: string) => {
    if (!currentWorkspace) return;
    if (userId === currentWorkspace.ownerId) return;

    setWorkspaces(prev => prev.map(w =>
      w.id === currentWorkspace.id 
        ? { ...w, memberIds: w.memberIds.filter(id => id !== userId) }
        : w
    ));
  };

  const canCreateForOthers = () => {
    if (!currentWorkspace || !currentUser) return false;
    return currentUser.role === 'owner' || currentUser.id === currentWorkspace.ownerId;
  };

  const isOwner = () => {
    if (!currentWorkspace || !currentUser) return false;
    return currentUser.id === currentWorkspace.ownerId;
  };

  const getMemberById = (id: string) => {
    return members.find(m => m.id === id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        currentUser,
        supabaseUser,
        members: members.filter(m => currentWorkspace?.memberIds.includes(m.id)),
        createWorkspace,
        switchWorkspace,
        addMember,
        removeMember,
        canCreateForOthers,
        isOwner,
        getMemberById,
      }}
    >
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
