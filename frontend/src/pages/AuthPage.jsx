import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../lib/auth-context'

const loginSchema = z.object({ username: z.string().min(1, 'Enter your username'), password: z.string().min(1, 'Enter your password') })
const registerSchema = loginSchema.extend({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export default function AuthPage({ register = false }) {
  const { login, register: createAccount } = useAuth()
  const navigate = useNavigate()
  const [requestError, setRequestError] = useState('')
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(register ? registerSchema : loginSchema),
  })

  async function submit(values) {
    setRequestError('')
    try {
      if (register) await createAccount(values)
      else await login(values)
      navigate('/', { replace: true })
    } catch (error) {
      const response = error.response?.data
      setRequestError(response?.detail || response?.username?.[0] || response?.email?.[0] || response?.password?.[0] || 'Could not connect. Check the API server and try again.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <div className="brand-lockup"><span className="brand-mark"><Check size={18} strokeWidth={3} /></span><span>momentum</span></div>
        <div className="aside-copy">
          <p className="eyebrow">A clearer way to work</p>
          <h1>Make room for<br />meaningful work.</h1>
          <p>Bring your plans, priorities, and progress into one focused space.</p>
        </div>
        <div className="aside-note"><span className="note-dot" /> Your workspace, ready when you are</div>
      </section>
      <section className="auth-main">
        <div className="auth-mobile-brand"><span className="brand-mark"><Check size={18} strokeWidth={3} /></span> momentum</div>
        <form className="auth-form" onSubmit={handleSubmit(submit)}>
          <p className="eyebrow">{register ? 'Start fresh' : 'Welcome back'}</p>
          <h2>{register ? 'Create your account' : 'Sign in to Momentum'}</h2>
          <p className="auth-subtitle">{register ? 'Build a workspace that moves with you.' : 'Pick up right where you left off.'}</p>
          {register && <label className="field"><span>Email</span><input autoComplete="email" type="email" placeholder="you@example.com" {...field('email')} />{errors.email && <small>{errors.email.message}</small>}</label>}
          <label className="field"><span>Username</span><input autoComplete="username" placeholder="Your username" {...field('username')} />{errors.username && <small>{errors.username.message}</small>}</label>
          <label className="field"><span>Password</span><input autoComplete={register ? 'new-password' : 'current-password'} type="password" placeholder="At least 8 characters" {...field('password')} />{errors.password && <small>{errors.password.message}</small>}</label>
          {requestError && <p className="form-error" role="alert">{requestError}</p>}
          <button className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : register ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
          <p className="auth-switch">{register ? 'Already have an account?' : 'New to Momentum?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
        </form>
        <p className="auth-footer">Personal work, thoughtfully organized.</p>
      </section>
    </main>
  )
}