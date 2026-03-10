'use client'

import { useState } from 'react'

// CSV 원본 구조 그대로 4섹션으로 분리
const SECTIONS = [
  {
    title: 'KYC 정보',
    fields: [
      { key: 'code', label: '분류', type: 'text' },
      { key: 'kyc_name', label: '거래소 KYC', type: 'text' },
      { key: 'brought_by', label: '가져온 사람', type: 'text' },
      { key: 'eng_name', label: '영문명', type: 'text' },
      { key: 'device', label: '기기명', type: 'text' },
      { key: 'birth', label: '생년월일', type: 'text' },
    ],
  },
  {
    title: '거래소 로그인 정보',
    fields: [
      { key: 'gmail', label: 'Gmail 주소', type: 'email' },
      { key: 'gmail_pw', label: 'Gmail PW', type: 'password' },
      { key: 'exchange_pw', label: '거래소 PW', type: 'password' },
      { key: 'pin', label: 'PIN 번호', type: 'password' },
      { key: 'google_otp', label: '구글 OTP 여부', type: 'text' },
      { key: 'recovery_email', label: '복구 이메일', type: 'email' },
    ],
  },
  {
    title: 'UID (거래소별)',
    fields: [
      { key: 'uid_ourbit', label: '아워빗', type: 'text' },
      { key: 'uid_picol', label: '파이콜', type: 'text' },
      { key: 'uid_tapbit', label: '탭비트', type: 'text' },
      { key: 'uid_digifinex', label: '디지파이넥스', type: 'text' },
      { key: 'uid_jucom', label: '주닷컴', type: 'text' },
      { key: 'uid_bitget', label: '비트겟', type: 'text' },
      { key: 'uid_biconomy', label: '비코노미', type: 'text' },
    ],
  },
  {
    title: '핸드폰 가입 정보',
    fields: [
      { key: 'sim_owner', label: 'SIM 명의자', type: 'text' },
      { key: 'sim_brought_by', label: '가져온 사람', type: 'text' },
      { key: 'sim_org', label: '확보자 소속', type: 'text' },
      { key: 'phone', label: '핸드폰 번호', type: 'text' },
      { key: 'carrier', label: '통신사', type: 'text' },
      { key: 'carrier_id', label: '통신사 ID', type: 'text' },
      { key: 'carrier_pw', label: '통신사 PW', type: 'password' },
      { key: 'payment_type', label: '납입 방식', type: 'text' },
      { key: 'postpaid_end', label: '후불폰 할인 종료일', type: 'text' },
      { key: 'prepaid_account', label: '선불폰 충전 계좌', type: 'text' },
    ],
  },
]

export type KycFormData = Record<string, string>

interface TraderOption {
  id: string
  name: string
}

interface KycAccountFormProps {
  initialValues?: KycFormData
  onSubmit: (values: KycFormData) => void
  submitLabel?: string
  isLoading?: boolean
  traderOptions?: TraderOption[]
  initialTraderId?: string
}

function getAllKeys() {
  return SECTIONS.flatMap((s) => s.fields.map((f) => f.key))
}

export function KycAccountForm({
  initialValues = {},
  onSubmit,
  submitLabel = '저장',
  isLoading = false,
  traderOptions = [],
  initialTraderId = '',
}: KycAccountFormProps) {
  const [values, setValues] = useState<KycFormData>(() => {
    const init: KycFormData = {}
    for (const key of getAllKeys()) {
      init[key] = initialValues[key] ?? ''
    }
    init._trader_id = initialValues._trader_id ?? initialTraderId
    return init
  })

  const [showPasswords, setShowPasswords] = useState(false)

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
        />
        비밀번호 표시
      </label>

      {traderOptions.length > 0 && (
        <div>
          <label className="block text-xs text-muted mb-1">담당 트레이더</label>
          <select
            value={values._trader_id}
            onChange={(e) => handleChange('_trader_id', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-card-border rounded-lg
                       text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">선택하세요</option>
            {traderOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h4 className="text-sm font-semibold text-accent mb-3 border-b border-card-border pb-2">
            {section.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-muted mb-1">{field.label}</label>
                <input
                  type={field.type === 'password' && !showPasswords ? 'password' : 'text'}
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg
                             text-sm text-foreground placeholder-muted focus:outline-none
                             focus:border-accent transition-colors"
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg
                   font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '처리 중...' : submitLabel}
      </button>
    </form>
  )
}

export { SECTIONS }
