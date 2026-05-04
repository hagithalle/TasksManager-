import AppRoutes from './routes/AppRoutes'

// App is intentionally thin — providers live in main.tsx,
// routing lives in AppRoutes, layout lives in MainLayout.
export default function App() {
  return <AppRoutes />
}
