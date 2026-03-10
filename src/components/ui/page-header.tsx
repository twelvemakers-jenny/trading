interface ActionDef {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  confirm?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: ActionDef
  actions?: ActionDef[]
}

export function PageHeader({ title, description, action, actions }: PageHeaderProps) {
  const allActions = actions ?? (action ? [action] : [])

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {allActions.length > 0 && (
        <div className="flex gap-2">
          {allActions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                if (a.confirm) {
                  if (window.confirm(a.confirm)) a.onClick()
                } else {
                  a.onClick()
                }
              }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                a.variant === 'secondary'
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30'
                  : 'bg-accent hover:bg-accent-hover text-white'
              }`}
            >
              {a.variant === 'secondary' ? '' : '+ '}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
