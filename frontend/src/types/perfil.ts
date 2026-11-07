export type IniciativaPublica = {
  id: string;
  titulo: string;
  categoria: string;
  sector: string;
  estado: string;
};

// Compatible con los campos comunes de ProfileResource y OrganizationResource.
export type PerfilPublicoData = {
  id: string;
  is_organization: boolean;
  name: string;
  description: string;
  location: string;
  image: string | null;
  classification: string;
  contact: { email?: string; phone?: string };
  initiatives: IniciativaPublica[];
  interests?: string[];
};
