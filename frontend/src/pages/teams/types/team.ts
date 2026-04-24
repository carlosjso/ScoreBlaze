export type TeamStatus = "Activo" | "Inactivo" | "Suspendido";

export type Team = {
  id: number;
  name: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  playersCount: number;
  status: TeamStatus;
  logoUrl?: string;
};
