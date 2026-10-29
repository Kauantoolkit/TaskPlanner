// Tipos do schema public do Supabase, no formato do `supabase gen types typescript`.
// Mantidos à mão: ao criar uma migration em supabase/migrations, atualize aqui.
// Estado atual: até 0002_modelo_de_tarefas.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row, Optional extends keyof Row = Exclude<keyof Row, Required>> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type TaskKind = 'once' | 'daily' | 'weekly' | 'delivery';
export type WorkspaceType = 'family' | 'business' | 'personal';
export type MemberRole = 'owner' | 'member';

export type WorkspaceRow = {
  id: string;
  name: string;
  type: WorkspaceType;
  owner_id: string;
  invite_code: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  name: string;
  email: string;
  created_at: string | null;
};

export type TaskRow = {
  id: string;
  workspace_id: string;
  assigned_to_id: string;
  created_by_id: string;
  text: string;
  kind: TaskKind;
  /** yyyy-MM-dd; só em kind = 'once' */
  date: string | null;
  /** yyyy-MM-dd; só em kind = 'delivery' */
  delivery_date: string | null;
  /** 0 = domingo … 6 = sábado; só em kind = 'weekly' */
  recurring_days: number[];
  completed: boolean;
  completed_dates: string[];
  category_id: string | null;
  /** HH:mm:ss */
  scheduled_time: string | null;
  estimated_duration_minutes: number | null;
  yellow_alert_minutes: number | null;
  started_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string | null;
};

export type TaskDailyLogRow = {
  id: string;
  task_id: string;
  log_date: string;
  description: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesRow = {
  user_id: string;
  dark_mode: boolean;
  show_completed: boolean;
  confirm_delete: boolean;
  sort_by_time: boolean;
  updated_at: string;
};

export type KanbanBoardRow = {
  id: string;
  task_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type KanbanColumnRow = {
  id: string;
  board_id: string;
  title: string;
  order: number;
  color: string | null;
  is_completion_column: boolean;
  created_at: string;
  updated_at: string;
};

export type KanbanCardRow = {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  order: number;
  assigned_to_id: string | null;
  due_date: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      workspaces: Table<WorkspaceRow, 'name' | 'type' | 'owner_id'>;
      workspace_members: Table<WorkspaceMemberRow, 'workspace_id' | 'user_id' | 'role' | 'name' | 'email'>;
      tasks: Table<TaskRow, 'workspace_id' | 'assigned_to_id' | 'created_by_id' | 'text' | 'kind'>;
      categories: Table<CategoryRow, 'workspace_id' | 'name' | 'color'>;
      task_daily_logs: Table<TaskDailyLogRow, 'task_id' | 'log_date' | 'description'>;
      user_preferences: Table<UserPreferencesRow, never>;
      kanban_boards: Table<KanbanBoardRow, 'task_id' | 'workspace_id' | 'title'>;
      kanban_columns: Table<KanbanColumnRow, 'board_id' | 'title'>;
      kanban_cards: Table<KanbanCardRow, 'column_id' | 'board_id' | 'title'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_workspace: {
        Args: { p_name: string; p_type: WorkspaceType };
        Returns: {
          workspace_id: string; member_id: string; name: string; type: WorkspaceType;
          owner_id: string; invite_code: string; created_at: string;
        }[];
      };
      join_workspace: {
        Args: { p_code: string };
        Returns: {
          workspace_id: string; member_id: string; name: string; type: WorkspaceType;
          owner_id: string; created_at: string;
        }[];
      };
      regenerate_invite_code: { Args: { p_workspace_id: string }; Returns: string };
      get_workspace_members: {
        Args: { p_workspace_id: string };
        Returns: { id: string; user_id: string; role: MemberRole; name: string; email: string }[];
      };
      create_kanban_board_with_columns: {
        Args: { p_task_id: string; p_workspace_id: string; p_title: string; p_columns: Json };
        Returns: string;
      };
      move_kanban_card: { Args: { p_card_id: string; p_to_column: string; p_new_order: number }; Returns: undefined };
      reorder_kanban_cards: { Args: { p_column_id: string; p_card_ids: string[] }; Returns: undefined };
      reorder_kanban_columns: { Args: { p_board_id: string; p_column_ids: string[] }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
