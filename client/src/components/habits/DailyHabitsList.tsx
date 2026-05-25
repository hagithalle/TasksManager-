import { useEffect, useState } from 'react';
import { habitsApi, HabitCompletion } from '../../api/habitsApi';
import { Box, Checkbox, Typography, CircularProgress, Alert } from '@mui/material';

export default function DailyHabitsList() {
  const [habits, setHabits] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    habitsApi.getToday()
      .then((data) => {
        if (Array.isArray(data)) {
          setHabits(data);
        } else {
          setHabits([]);
        }
      })
      .catch((err) => {
        // אם אין הרגלים (404/204) - אל תציג שגיאה
        if (err?.response?.status === 404 || err?.response?.status === 204) {
          setHabits([]);
        } else {
          setError('שגיאה בטעינת הרגלים');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCheck = async (id: number) => {
    try {
      await habitsApi.complete(id);
      setHabits(habits => habits.map(h => h.id === id ? { ...h, completed: true, completedAt: new Date().toISOString() } : h));
    } catch {
      setError('שגיאה בסימון הרגל');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box mb={2} p={2} bgcolor="#f5f5ff" borderRadius={2}>
        <Typography variant="subtitle2" color="primary">
          עוזר חכם:
        </Typography>
        <Typography variant="body2">
          {habits.filter(h => !h.completed).length === 0
            ? 'כל הכבוד! השלמת את כל ההרגלים להיום 🎉'
            : 'נסה לסיים לפחות הרגל אחד נוסף היום כדי לשמור על רצף!'}
        </Typography>
      </Box>
      <Typography variant="h6" mb={2}>הרגלים יומיים</Typography>
      {habits.length === 0 && <Typography>אין הרגלים להיום</Typography>}
      {habits.map(habit => (
        <Box key={habit.id} display="flex" alignItems="center" mb={1}>
          <Checkbox
            checked={habit.completed}
            onChange={() => handleCheck(habit.id)}
            disabled={habit.completed}
          />
          <Typography sx={{ textDecoration: habit.completed ? 'line-through' : 'none' }}>
            {habit.task?.title}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
