import { Routes, Route, Navigate } from 'react-router-dom'
import { AppRoute } from './paths'
import MainLayout from '../layout/MainLayout'
import DashboardPage  from '../pages/DashboardPage'
import TasksPage      from '../pages/TasksPage'
import GoalsPage      from '../pages/GoalsPage'
import GoalDetailPage from '../pages/GoalDetailPage'
import ListsPage      from '../pages/ListsPage'
import CalendarPage   from '../pages/CalendarPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={AppRoute.Dashboard}  element={<DashboardPage />}  />
        <Route path={AppRoute.Tasks}      element={<TasksPage />}      />
        <Route path={AppRoute.Goals}      element={<GoalsPage />}      />
        <Route path={AppRoute.GoalDetail} element={<GoalDetailPage />} />
        <Route path={AppRoute.Lists}      element={<ListsPage />}      />
        <Route path={AppRoute.Calendar}   element={<CalendarPage />}   />
        <Route path="*" element={<Navigate to={AppRoute.Dashboard} replace />} />
      </Route>
    </Routes>
  )
}
