const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success',
  pending: 'bg-warning/20 text-warning',
  completed: 'bg-success/20 text-success',
  closed: 'bg-muted/20 text-muted',
  dormant: 'bg-warning/20 text-warning',
  cancelled: 'bg-danger/20 text-danger',
  adjusted: 'bg-accent/20 text-accent',
  long: 'bg-success/20 text-success',
  short: 'bg-danger/20 text-danger',
}

const statusLabels: Record<string, string> = {
  active: '활성',
  pending: '대기',
  completed: '완료',
  closed: '종료',
  dormant: '휴면',
  cancelled: '취소',
  adjusted: '조정',
  long: 'Long',
  short: 'Short',
  initial: '초기투입',
  additional: '추가투입',
  withdrawal: '회수',
  profit_withdrawal: '수익출금',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] ?? 'bg-muted/20 text-muted'}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}
