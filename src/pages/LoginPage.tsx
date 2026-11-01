import { AuthForm } from '../components/auth/AuthForm'
import { RequireGuest } from '../components/auth/RouteGuards'

export default function LoginPage() {
  return (
    <RequireGuest>
      <AuthForm mode="login" />
    </RequireGuest>
  )
}
