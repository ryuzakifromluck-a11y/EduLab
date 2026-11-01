import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import RouteErrorPage from './pages/RouteErrorPage'

const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const ExperimentRoute = lazy(() => import('./pages/ExperimentRoute'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ImpactPage = lazy(() => import('./pages/ImpactPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const TeacherRemotePage = lazy(() => import('./pages/TeacherRemotePage'))
const StudentRemotePage = lazy(() => import('./pages/StudentRemotePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Render errors and failed lazy-chunk loads land here instead of React Router's developer screen.
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/physics', element: <SubjectPage subject="physics" /> },
      { path: '/physics/:id', element: <ExperimentRoute subject="physics" /> },
      { path: '/chemistry', element: <SubjectPage subject="chemistry" /> },
      { path: '/chemistry/:id', element: <ExperimentRoute subject="chemistry" /> },
      { path: '/biology', element: <SubjectPage subject="biology" /> },
      { path: '/biology/:id', element: <ExperimentRoute subject="biology" /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/impact', element: <ImpactPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/teacher/remote', element: <TeacherRemotePage /> },
      { path: '/student/remote', element: <StudentRemotePage /> },
      { path: '/student/remote/:code', element: <StudentRemotePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
