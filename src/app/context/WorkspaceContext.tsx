import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../data/api';
import { useCurrentUser } from '../auth/AuthProvider';
import type { CurrentUser, Member, Workspace, WorkspaceType } from '../types';

const STORAGE_KEY = 'currentWorkspaceId';

interface WorkspaceContextType {
  currentUser: CurrentUser;
  workspaces: Workspace[];
  /** null só enquanto carrega */
  currentWorkspace: Workspace | null;
  /** workspace_members.id do usuário no workspace atual */
  currentMemberId: string;
  members: Member[];
  loading: boolean;
  createWorkspace: (name: string, type: WorkspaceType) => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  joinWorkspace: (code: string) => Promise<void>;
  regenerateInviteCode: () => Promise<void>;
  /** Por workspace_members.id */
  removeMember: (memberId: string) => Promise<void>;
  isOwner: boolean;
  getMemberById: (memberId: string) => Member | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function readSavedWorkspaceId(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveWorkspaceId(id: string) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* aba anônima etc. */ }
}

export const workspaceKeys = {
  mine: (userId: string) => ['workspaces', userId] as const,
  members: (workspaceId: string) => ['members', workspaceId] as const,
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(readSavedWorkspaceId);

  const mine = useQuery({
    queryKey: workspaceKeys.mine(currentUser.id),
    queryFn: () => api.fetchMyWorkspaces(currentUser.id),
  });

  // Primeiro acesso: cria o workspace pessoal (uma vez por montagem)
  const creatingFirst = useRef(false);
  useEffect(() => {
    if (!mine.data || mine.data.workspaces.length > 0 || creatingFirst.current) return;
    creatingFirst.current = true;
    api.createWorkspace('Meu Workspace', 'personal')
      .then(async ({ workspace }) => {
        await api.seedDefaultCategories(workspace.id);
        setSelectedId(workspace.id);
        saveWorkspaceId(workspace.id);
        await queryClient.invalidateQueries({ queryKey: workspaceKeys.mine(currentUser.id) });
      })
      .catch(err => toast.error(`Não foi possível criar seu workspace: ${err.message}`));
  }, [mine.data, currentUser.id, queryClient]);

  const workspaces = mine.data?.workspaces ?? [];
  const currentWorkspace =
    workspaces.find(w => w.id === selectedId) ?? workspaces[0] ?? null;
  const currentMemberId = currentWorkspace ? mine.data?.memberIdByWorkspace[currentWorkspace.id] ?? '' : '';

  const membersQuery = useQuery({
    queryKey: workspaceKeys.members(currentWorkspace?.id ?? ''),
    queryFn: () => api.fetchMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace,
  });
  const members = membersQuery.data ?? [];

  const refreshMine = useCallback(
    () => queryClient.invalidateQueries({ queryKey: workspaceKeys.mine(currentUser.id) }),
    [queryClient, currentUser.id],
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
    saveWorkspaceId(id);
  }, []);

  const createWorkspace = useCallback(async (name: string, type: WorkspaceType) => {
    const { workspace } = await api.createWorkspace(name, type);
    await api.seedDefaultCategories(workspace.id);
    await refreshMine();
    select(workspace.id);
  }, [refreshMine, select]);

  const joinWorkspace = useCallback(async (code: string) => {
    const { workspace } = await api.joinWorkspace(code);
    await refreshMine();
    select(workspace.id);
  }, [refreshMine, select]);

  const regenerate = useMutation({
    mutationFn: () => api.regenerateInviteCode(currentWorkspace!.id),
    onSuccess: refreshMine,
  });

  const remove = useMutation({
    mutationFn: api.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(currentWorkspace?.id ?? '') }),
  });

  const getMemberById = useCallback((id: string) => members.find(m => m.id === id), [members]);

  const value = useMemo<WorkspaceContextType>(() => ({
    currentUser,
    workspaces,
    currentWorkspace,
    currentMemberId,
    members,
    loading: mine.isPending || (mine.data?.workspaces.length === 0) || !currentWorkspace,
    createWorkspace,
    switchWorkspace: select,
    joinWorkspace,
    regenerateInviteCode: async () => { await regenerate.mutateAsync(); },
    removeMember: async (memberId: string) => { await remove.mutateAsync(memberId); },
    isOwner: !!currentWorkspace && currentWorkspace.ownerId === currentUser.id,
    getMemberById,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentUser, mine.data, mine.isPending, currentWorkspace?.id, currentMemberId, members,
       createWorkspace, select, joinWorkspace, getMemberById]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace precisa estar dentro de <WorkspaceProvider>');
  return ctx;
}

/** Workspace atual, para componentes que só renderizam depois do carregamento. */
export function useActiveWorkspace(): { workspace: Workspace; memberId: string } {
  const { currentWorkspace, currentMemberId } = useWorkspace();
  if (!currentWorkspace) throw new Error('useActiveWorkspace usado antes do workspace carregar');
  return { workspace: currentWorkspace, memberId: currentMemberId };
}
