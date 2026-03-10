import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, name, role, phone } = await request.json()

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Supabase Auth 유저 생성 (서비스 롤 키로 이메일 인증 없이 바로 생성)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. traders 테이블에 active 상태로 등록
  const { error: insertError } = await supabaseAdmin.from('traders').insert({
    auth_id: authData.user.id,
    name,
    role,
    status: 'active',
    metadata: { phone: phone || '', email },
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
