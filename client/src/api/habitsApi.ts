import axios from 'axios';

export interface HabitCompletion {
  id: number;
  taskId: string;
  userId: string;
  date: string;
  completed: boolean;
  completedAt?: string;
  task?: {
    id: string;
    title: string;
  };
}

export const habitsApi = {
  getToday: async (): Promise<HabitCompletion[]> => {
    const { data } = await axios.get('/api/habits/today');
    return data;
  },
  complete: async (id: number) => {
    await axios.post(`/api/habits/${id}/complete`);
  },
};
