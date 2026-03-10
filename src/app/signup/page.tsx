'use client'

import { useState } from 'react'
import Link from 'next/link'

const ALLOWED_DOMAINS = ['aegis.ventures', 'gmail.com']

function validateEmail(email: string): string | null {
  if (!email) return '이메일을 입력하세요.'
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return '@aegis.ventures 또는 @gmail.com 이메일만 가입 가능합니다.'
  }
  return null
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const emailError = validateEmail(email)
    if (emailError) { setError(emailError); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!name.trim()) { setError('이름을 입력하세요.'); return }
    if (!phone.trim()) { setError('연락처를 입력하세요.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '가입 신청 실패')
        return
      }

      setSuccess(true)
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">{"\u2705"}</div>
          <h2 className="text-xl font-bold text-foreground mb-2">가입 신청 완료</h2>
          <p className="text-muted text-sm mb-6">
            관리자 승인 후 로그인할 수 있습니다.<br />
            승인이 완료되면 로그인해 주세요.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg
                       font-medium transition-colors"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Delta-Trading</h1>
          <p className="text-muted mt-2 text-sm">회원가입 신청</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder="id@aegis.ventures 또는 id@gmail.com"
            />
            <p className="text-xs text-muted mt-1">@aegis.ventures, @gmail.com만 가입 가능</p>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder="6자 이상"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder="비밀번호 재입력"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">연락처</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder="010-1234-5678"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg
                       font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '가입 신청'}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
