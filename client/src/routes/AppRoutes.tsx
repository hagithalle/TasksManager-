import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppRoute } from './paths'
import { useAuth } from '../contexts/AuthContext'
import MainLayout from '../layout/MainLayout'
import LoginPage     from '../pages/LoginPage'
import DashboardPage  from '../pages/DashboardPage'
import TasksPage      from '../pages/TasksPage'
import GoalsPage      from '../pages/GoalsPage'
import GoalDetailPage from '../pages/GoalDetailPage'
import ListsPage      from '../pages/ListsPage'
import ListDetailPage from '../pages/ListDetailPage'
import CalendarPage   from '../pages/CalendarPage'
import JoinPage       from '../pages/JoinPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to={AppRoute.Login} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={AppRoute.Login} element={<LoginPage />} />
      <Route path={AppRoute.Join}  element={<JoinPage />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path={AppRoute.Dashboard}  element={<DashboardPage />}  />
        <Route path={AppRoute.Tasks}      element={<TasksPage />}      />
        <Route path={AppRoute.Goals}      element={<GoalsPage />}      />
        <Route path={AppRoute.GoalDetail} element={<GoalDetailPage />} />
        <Route path={AppRoute.Lists}      element={<ListsPage />}      />
        <Route path={AppRoute.ListDetail} element={<ListDetailPage />} />
        <Route path={AppRoute.Calendar}   element={<CalendarPage />}   />
        <Route path="*" element={<Navigate to={AppRoute.Dashboard} replace />} />
      </Route>
    </Routes>
  )
}

