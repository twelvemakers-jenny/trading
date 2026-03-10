import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const supabaseAdmin = getAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed_at: u.email_confirmed_at,
  }))

  return NextResponse.json({ users })
}

// 회원 수정: 이메일 인증 확인, 트레이더 등록
export async function PATCH(request: NextRequest) {
  const supabaseAdmin = getAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const { action, userId, email, role, name } = await request.json()

  // 이메일 인증 처리
  if (action === 'confirm_email') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  // 트레이더 등록 (auth user → traders 테이블)
  if (action === 'register_trader') {
    if (!role || !name) {
      return NextResponse.json({ error: '이름과 역할은 필수입니다.' }, { status: 400 })
    }

    // 이미 등록되어 있는지 확인
    const { data: existing } = await supabaseAdmin
      .from('traders')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 트레이더로 등록된 회원입니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('traders').insert({
      auth_id: userId,
      name,
      role,
      status: 'active',
      metadata: { email, phone: '' },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: '알 수 없는 액션입니다.' }, { status: 400 })
}
