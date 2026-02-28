import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Workspace, User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface WorkspaceContextType {
  // Workspace atual
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  
  // Usuário atual (do Supabase Auth ou local)
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  
  // Membros do workspace atual
  members: User[];
  
  // Ações
  createWorkspace: (name: string, type: Workspace['type']) => void;
  switchWorkspace: (workspaceId: string) => void;
  addMember: (name: string, email: string) => void;
  removeMember: (userId: string) => void;
  
  // Helpers
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

  // Escutar mudanças de autenticação (só se Supabase configurado)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Modo local: criar usuário padrão
      const localUser: User = {
        id: 'local-user',
        name: 'Usuário Local',
        email: 'local@planner.com',
        role: 'owner',
      };
      setCurrentUser(localUser);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Quando o supabaseUser mudar, criar/carregar o usuário interno
  useEffect(() => {
    // Modo local (sem Supabase)
    if (!isSupabaseConfigured && currentUser) {
      const userId = currentUser.id;
      
      // Carregar ou criar workspace inicial
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
        // Criar workspace inicial
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

      // Carregar membros
      const savedMembers = localStorage.getItem(`members_${userId}`);
      if (savedMembers) {
        setMembers(JSON.parse(savedMembers));
      } else {
        setMembers([currentUser]);
        localStorage.setItem(`members_${userId}`, JSON.stringify([currentUser]));
      }
      return;
    }

    if (!supabaseUser) {
      if (isSupabaseConfigured) {
        setCurrentUser(null);
        setWorkspaces([]);
        setMembers([]);
      }
      return;
    }

    // Criar usuário interno a partir do Supabase User
    const internalUser: User = {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      role: 'owner', // Primeiro usuário é sempre owner do seu workspace
    };

    setCurrentUser(internalUser);

    // Carregar ou criar workspace inicial
    const savedWorkspaces = localStorage.getItem(`workspaces_${supabaseUser.id}`);
    if (savedWorkspaces) {
      const parsed = JSON.parse(savedWorkspaces);
      setWorkspaces(parsed);
      
      const savedCurrentId = localStorage.getItem(`current_workspace_${supabaseUser.id}`);
      if (savedCurrentId && parsed.find((w: Workspace) => w.id === savedCurrentId)) {
        setCurrentWorkspaceId(savedCurrentId);
      } else {
        setCurrentWorkspaceId(parsed[0]?.id || '');
      }
    } else {
      // Criar workspace inicial
      const initialWorkspace: Workspace = {
        id: `workspace-${Date.now()}`,
        name: 'Meu Espaço',
        type: 'personal',
        ownerId: supabaseUser.id,
        memberIds: [supabaseUser.id],
        createdAt: new Date().toISOString(),
      };
      setWorkspaces([initialWorkspace]);
      setCurrentWorkspaceId(initialWorkspace.id);
      localStorage.setItem(`workspaces_${supabaseUser.id}`, JSON.stringify([initialWorkspace]));
    }

    // Carregar membros
    const savedMembers = localStorage.getItem(`members_${supabaseUser.id}`);
    if (savedMembers) {
      setMembers(JSON.parse(savedMembers));
    } else {
      setMembers([internalUser]);
      localStorage.setItem(`members_${supabaseUser.id}`, JSON.stringify([internalUser]));
    }
  }, [supabaseUser, currentUser]);

  // Salvar workspaces quando mudarem
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && workspaces.length > 0) {
      localStorage.setItem(`workspaces_${userId}`, JSON.stringify(workspaces));
    }
  }, [workspaces, supabaseUser, currentUser]);

  // Salvar workspace atual
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && currentWorkspaceId) {
      localStorage.setItem(`current_workspace_${userId}`, currentWorkspaceId);
    }
  }, [currentWorkspaceId, supabaseUser, currentUser]);

  // Salvar membros
  useEffect(() => {
    const userId = isSupabaseConfigured ? supabaseUser?.id : currentUser?.id;
    if (userId && members.length > 0) {
      localStorage.setItem(`members_${userId}`, JSON.stringify(members));
    }
  }, [members, supabaseUser, currentUser]);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;

  // Criar novo workspace
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

  // Trocar workspace
  const switchWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
  };

  // Adicionar membro (sem limites!)
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

  // Remover membro
  const removeMember = (userId: string) => {
    if (!currentWorkspace) return;
    
    // Não pode remover o owner - simplesmente não faz nada
    if (userId === currentWorkspace.ownerId) {
      return;
    }

    setWorkspaces(prev => prev.map(w =>
      w.id === currentWorkspace.id 
        ? { ...w, memberIds: w.memberIds.filter(id => id !== userId) }
        : w
    ));
  };

  // Verificar se pode criar tarefas para outros
  const canCreateForOthers = () => {
    if (!currentWorkspace || !currentUser) return false;
    return currentUser.role === 'owner' || currentUser.id === currentWorkspace.ownerId;
  };

  // Verificar se é owner
  const isOwner = () => {
    if (!currentWorkspace || !currentUser) return false;
    return currentUser.id === currentWorkspace.ownerId;
  };

  // Pegar membro por ID
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