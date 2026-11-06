export interface Task {
  id: number;
  descricao: string;
  inicio: number;
  fim: number;
  status: string;
  resultado: number[] | null;
}
