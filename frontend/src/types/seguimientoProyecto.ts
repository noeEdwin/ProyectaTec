export type AvanceProyecto = {
  id: number;
  project_id: number;
  title: string;
  description: string;
  progress: number | null;
  author?: {
    id: number;
    name: string;
  } | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type UltimoProgresoProyecto = {
  update_id: number;
  progress: number;
  created_at: string | null;
};

export type NuevoAvanceProyecto = {
  title: string;
  description: string;
  progress: number | null;
};

export type MetaAvancesProyecto = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};
