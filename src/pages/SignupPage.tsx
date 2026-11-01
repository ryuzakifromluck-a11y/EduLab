import { AuthForm } from '../components/auth/AuthForm'
import { RequireGuest } from '../components/auth/RouteGuards'

export default function SignupPage() {
  return (
    <RequireGuest>
      <AuthForm mode="signup" />
    </RequireGuest>
  )
}
