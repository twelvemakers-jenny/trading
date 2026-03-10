interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg
                     font-medium transition-colors"
        >
          + {action.label}
        </button>
      )}
    </div>
  )
}
