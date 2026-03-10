import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_DOMAINS = ['aegis.ventures', 'gmail.com']

export async function POST(request: NextRequest) {
  const { email, password, name, phone } = await request.json()

  // 입력 검증
  if (!email || !password || !name || !phone) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: '@aegis.ventures 또는 @gmail.com 이메일만 가입 가능합니다.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Auth 유저 생성 (service role → 이메일 인증 불필요, rate limit 없음)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. traders 테이블에 pending 상태로 등록 (역할은 admin이 승인 시 지정)
  const { error: insertError } = await supabaseAdmin.from('traders').insert({
    auth_id: authData.user.id,
    name,
    role: 'trader',
    status: 'pending',
    metadata: { phone, email },
  })

  if (insertError) {
    // traders insert 실패 시 Auth 유저도 정리
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
