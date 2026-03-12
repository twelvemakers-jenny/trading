'use client'

import { useState } from 'react'
import { z } from 'zod'
import type { FieldDefinition } from '@/types/database'

interface DynamicFormProps {
  fields: FieldDefinition[]
  initialValues?: Record<string, string>
  onSubmit: (values: Record<string, string>) => void
  submitLabel?: string
  isLoading?: boolean
}

// 동적 Zod 스키마 생성 — 관리자가 설정한 필드 정의로부터 런타임 검증
function buildZodSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    let validator: z.ZodString = z.string()

    switch (field.type) {
      case 'email':
        validator = z.string().email('유효한 이메일을 입력하세요')
        break
      case 'number':
        validator = z.string().regex(/^-?\d+(\.\d+)?$/, '숫자를 입력하세요')
        break
      case 'phone':
        validator = z.string().min(1, '연락처를 입력하세요')
        break
      case 'date':
        validator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식')
        break
      case 'select':
        validator = z.string().min(1, '항목을 선택하세요')
        break
      default:
        validator = z.string()
    }

    shape[field.key] = field.required
      ? validator.min(1, `${field.label}은(는) 필수 항목입니다`)
      : validator.optional().or(z.literal(''))
  }

  return z.object(shape)
}

export function DynamicForm({
  fields,
  initialValues = {},
  onSubmit,
  submitLabel = '저장',
  isLoading = false,
}: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      init[f.key] = initialValues[f.key] ?? ''
    }
    return init
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const schema = buildZodSchema(fields)
    const result = schema.safeParse(values)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm text-muted mb-1.5">
            {field.label}
            {field.required && <span className="text-danger ml-1">*</span>}
          </label>

          {field.type === 'select' ? (
            <select
              value={values[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-background border border-card-border rounded-lg
                         text-sm sm:text-base text-foreground focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">선택하세요</option>
              {field.options?.map((opt) => {
                const [value, label] = opt.includes('::') ? opt.split('::') : [opt, opt]
                return <option key={opt} value={opt}>{label}</option>
              })}
            </select>
          ) : (
            <input
              type={field.type === 'number' ? 'text' : field.type}
              value={values[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              {...(field.type === 'date' ? { max: '9999-12-31' } : {})}
              className="w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
                         text-foreground placeholder-muted focus:outline-none focus:border-accent
                         transition-colors"
              placeholder={field.label}
            />
          )}

          {errors[field.key] && (
            <p className="text-danger text-xs mt-1">{errors[field.key]}</p>
          )}
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
