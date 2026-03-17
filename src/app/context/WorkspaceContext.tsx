import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Workspace, User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUser: User | null;
  currentMemberId: string;
  members: User[];
  loading: boolean;
  createWorkspace: (name: string, type: Workspace['type']) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  joinWorkspace: (code: string) => Promise<void>;
  regenerateInviteCode: () => Promise<void>;
  addMember: (name: string, email: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  canCreateForOthers: () => boolean;
  isOwner: () => boolean;
  getMemberById: (id: string) => User | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const LOCAL_USER: User = {
  id: 'local-user',
  name: 'Usuário Local',
  email: 'local@planner.com',
  role: 'owner',
};

const LOCAL_WORKSPACE: Workspace = {
  id: 'workspace-local',
  name: 'Meu Espaço',
  type: 'personal',
  ownerId: 'local-user',
  memberIds: ['local-user'],
  createdAt: new Date().toISOString(),
};

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function WorkspaceProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [members, setMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembersForWorkspace = useCallback(async (workspaceId: string) => {
    if (!isSupabaseConfigured) {
      setMembers([LOCAL_USER]);
      return;
    }
    try {
      const { data } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, name, email')
        .eq('workspace_id', workspaceId);

      if (data) {
        setMembers(data.map(m => ({
          id: m.user_id || m.id,
          name: m.name || 'Membro',
          email: m.email || '',
          role: m.role as 'owner' | 'member',
        })));
      }
    } catch (err) {
      console.error('Error loading members:', err);
    }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setWorkspaces([LOCAL_WORKSPACE]);
      setCurrentWorkspaceId(LOCAL_WORKSPACE.id);
      setCurrentMemberId(LOCAL_USER.id);
      setCurrentUser(LOCAL_USER);
      setMembers([LOCAL_USER]);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        role: 'owner',
      });

      // Load all workspace_members rows for this user
      const { data: memberRows } = await supabase
        .from('workspace_members')
        .select('workspace_id, id, role')
        .eq('user_id', user.id);

      const memberWorkspaceIds = [...new Set((memberRows || []).map(m => m.workspace_id))];

      // Also include owned workspaces (in case member row is missing)
      const { data: ownedWs } = await supabase
        .from('workspaces')
        .select('id, name, type, owner_id, created_at, invite_code')
        .eq('owner_id', user.id);

      const ownedIds = (ownedWs || []).map(w => w.id);
      const allIds = [...new Set([...memberWorkspaceIds, ...ownedIds])];

      let allWorkspacesData: any[] = [];

      if (allIds.length > 0) {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('id, name, type, owner_id, created_at, invite_code')
          .in('id', allIds);
        allWorkspacesData = wsData || [];
      }

      if (allWorkspacesData.length === 0) {
        // Create initial personal workspace
        const inviteCode = generateInviteCode();
        const { data: newWs } = await supabase
          .from('workspaces')
          .insert({ name: 'Meu Workspace', type: 'personal', owner_id: user.id, invite_code: inviteCode })
          .select('id, name, type, owner_id, created_at, invite_code')
          .single();

        if (newWs) {
          const { data: newMember } = await supabase
            .from('workspace_members')
            .insert({
              workspace_id: newWs.id,
              user_id: user.id,
              role: 'owner',
              name: user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
            })
            .select('id')
            .single();

          allWorkspacesData = [newWs];
          // Set both together after all async work
          setWorkspaces([{
            id: newWs.id, name: newWs.name, type: newWs.type,
            ownerId: newWs.owner_id, memberIds: [], createdAt: newWs.created_at,
            inviteCode: newWs.invite_code,
          }]);
          setCurrentWorkspaceId(newWs.id);
          setCurrentMemberId(newMember?.id || '');
          localStorage.setItem('currentWorkspaceId', newWs.id);
          setMembers([{ id: user.id, name: user.email?.split('@')[0] || 'Usuário', email: user.email || '', role: 'owner' }]);
          setLoading(false);
          return;
        }
      }

      const mapped: Workspace[] = allWorkspacesData.map(w => ({
        id: w.id, name: w.name, type: w.type,
        ownerId: w.owner_id, memberIds: [], createdAt: w.created_at,
        inviteCode: w.invite_code,
      }));

      // Restore last selected workspace or use first
      const savedId = localStorage.getItem('currentWorkspaceId');
      const selectedId = savedId && mapped.find(w => w.id === savedId)
        ? savedId
        : mapped[0]?.id || '';

      // Find member row for selected workspace
      const memberRow = (memberRows || []).find(m => m.workspace_id === selectedId);
      let resolvedMemberId = memberRow?.id || '';

      if (!resolvedMemberId && selectedId) {
        const { data: mRow } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', selectedId)
          .eq('user_id', user.id)
          .maybeSingle();
        resolvedMemberId = mRow?.id || '';
      }

      // Set everything atomically (React 18 batches these in async)
      setWorkspaces(mapped);
      setCurrentWorkspaceId(selectedId);
      setCurrentMemberId(resolvedMemberId);

      if (selectedId) {
        await loadMembersForWorkspace(selectedId);
      }
    } catch (err) {
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [loadMembersForWorkspace]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const currentWorkspace = useMemo(
    () => workspaces.find(w => w.id === currentWorkspaceId) || null,
    [workspaces, currentWorkspaceId]
  );

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    localStorage.setItem('currentWorkspaceId', workspaceId);

    if (!isSupabaseConfigured) {
      setCurrentWorkspaceId(workspaceId);
      setCurrentMemberId(LOCAL_USER.id);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberRow } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Set both together after all async work (React 18 batches these)
    setCurrentWorkspaceId(workspaceId);
    setCurrentMemberId(memberRow?.id || '');
    await loadMembersForWorkspace(workspaceId);
  }, [loadMembersForWorkspace]);

  const createWorkspace = useCallback(async (name: string, type: Workspace['type']) => {
    if (!isSupabaseConfigured) {
      const newWs: Workspace = {
        id: `workspace-${Date.now()}`,
        name, type,
        ownerId: LOCAL_USER.id,
        memberIds: [LOCAL_USER.id],
        createdAt: new Date().toISOString(),
      };
      setWorkspaces(prev => [...prev, newWs]);
      setCurrentWorkspaceId(newWs.id);
      setCurrentMemberId(LOCAL_USER.id);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const inviteCode = generateInviteCode();
    const { data: newWs, error } = await supabase
      .from('workspaces')
      .insert({ name, type, owner_id: user.id, invite_code: inviteCode })
      .select('id, name, type, owner_id, created_at, invite_code')
      .single();

    if (error) throw error;

    const { data: newMember } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: newWs.id,
        user_id: user.id,
        role: 'owner',
        name: user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
      })
      .select('id')
      .single();

    const workspace: Workspace = {
      id: newWs.id, name: newWs.name, type: newWs.type,
      ownerId: newWs.owner_id, memberIds: [user.id],
      createdAt: newWs.created_at, inviteCode: newWs.invite_code,
    };

    setWorkspaces(prev => [...prev, workspace]);
    setCurrentWorkspaceId(newWs.id);
    setCurrentMemberId(newMember?.id || '');
    localStorage.setItem('currentWorkspaceId', newWs.id);
    setMembers([{ id: user.id, name: user.email?.split('@')[0] || 'Usuário', email: user.email || '', role: 'owner' }]);
  }, []);

  const joinWorkspace = useCallback(async (code: string) => {
    if (!isSupabaseConfigured) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data: ws, error } = await supabase
      .from('workspaces')
      .select('id, name, type, owner_id, created_at, invite_code')
      .eq('invite_code', code.trim().toUpperCase())
      .single();

    if (error || !ws) throw new Error('Código de convite inválido');

    // Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', ws.id)
      .eq('user_id', user.id)
      .maybeSingle();

    let memberId = existing?.id || '';

    if (!existing) {
      const { data: newMember, error: joinError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: 'member',
          name: user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
        })
        .select('id')
        .single();

      if (joinError) throw joinError;
      memberId = newMember?.id || '';
    }

    const newWorkspace: Workspace = {
      id: ws.id, name: ws.name, type: ws.type,
      ownerId: ws.owner_id, memberIds: [], createdAt: ws.created_at,
      inviteCode: ws.invite_code,
    };

    setWorkspaces(prev => prev.find(w => w.id === ws.id) ? prev : [...prev, newWorkspace]);
    setCurrentWorkspaceId(ws.id);
    setCurrentMemberId(memberId);
    localStorage.setItem('currentWorkspaceId', ws.id);
    await loadMembersForWorkspace(ws.id);
  }, [loadMembersForWorkspace]);

  const regenerateInviteCode = useCallback(async () => {
    if (!isSupabaseConfigured || !currentWorkspaceId) return;

    const newCode = generateInviteCode();
    const { error } = await supabase
      .from('workspaces')
      .update({ invite_code: newCode })
      .eq('id', currentWorkspaceId);

    if (error) throw error;

    setWorkspaces(prev => prev.map(w =>
      w.id === currentWorkspaceId ? { ...w, inviteCode: newCode } : w
    ));
  }, [currentWorkspaceId]);

  const addMember = useCallback(async (_name: string, _email: string) => {
    // Real membership happens via invite code (joinWorkspace)
    // Kept for local mode compatibility only
    if (!isSupabaseConfigured) {
      setMembers(prev => [...prev, {
        id: `user-${Date.now()}`,
        name: _name, email: _email, role: 'member',
      }]);
    }
  }, []);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentWorkspace || userId === currentWorkspace.ownerId) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', userId);
      if (error) throw error;
    }

    setMembers(prev => prev.filter(m => m.id !== userId));
  }, [currentWorkspace, currentWorkspaceId]);

  const canCreateForOthers = useCallback(() => {
    if (!currentUser || !currentWorkspace) return false;
    return currentUser.id === currentWorkspace.ownerId;
  }, [currentUser, currentWorkspace]);

  const isOwner = useCallback(() => {
    if (!currentUser || !currentWorkspace) return false;
    return currentUser.id === currentWorkspace.ownerId;
  }, [currentUser, currentWorkspace]);

  const getMemberById = useCallback((id: string) => {
    return members.find(m => m.id === id);
  }, [members]);

  const value = useMemo(() => ({
    currentWorkspace,
    workspaces,
    currentUser,
    currentMemberId,
    members,
    loading,
    createWorkspace,
    switchWorkspace,
    joinWorkspace,
    regenerateInviteCode,
    addMember,
    removeMember,
    canCreateForOthers,
    isOwner,
    getMemberById,
  }), [
    currentWorkspace, workspaces, currentUser, currentMemberId, members, loading,
    createWorkspace, switchWorkspace, joinWorkspace, regenerateInviteCode,
    addMember, removeMember, canCreateForOthers, isOwner, getMemberById,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
