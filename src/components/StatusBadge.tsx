import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  HelpCircle,
  XCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  value: string;
  variant?: 'validation' | 'status' | 'check' | 'reconcile' | 'severity';
}

export function StatusBadge({ value, variant = 'status' }: StatusBadgeProps) {
  const trimmed = (value || '').trim();
  const lower = trimmed.toLowerCase();

  if (variant === 'validation' || variant === 'severity') {
    if (trimmed === 'VALID') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>VALID</span>
        </span>
      );
    }
    if (trimmed === 'WARNING' || trimmed === 'REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{trimmed}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/80 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>ERROR</span>
      </span>
    );
  }

  if (variant === 'check') {
    if (trimmed === 'OK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>OK</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Review Needed</span>
      </span>
    );
  }

  if (variant === 'reconcile') {
    switch (trimmed) {
      case 'Matched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Matched</span>
          </span>
        );
      case 'Value Mismatch':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Value Mismatch</span>
          </span>
        );
      case 'Missing in File A':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/80 whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Missing in File A</span>
          </span>
        );
      case 'Missing in File B':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200/80 whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>Missing in File B</span>
          </span>
        );
      case 'Duplicate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200/80 whitespace-nowrap">
            <Copy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Duplicate</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
            <span>{trimmed || 'Unknown'}</span>
          </span>
        );
    }
  }

  // Universal Business Status badge
  if (
    [
      'success',
      'successful',
      'completed',
      'settled',
      'paid',
      'cleared',
      'ok',
      'approved',
      'active',
      'resolved',
      'closed',
      'delivered',
      'in stock',
      'present',
    ].includes(lower)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{trimmed}</span>
      </span>
    );
  }

  if (
    [
      'pending',
      'in progress',
      'processing',
      'initiated',
      'hold',
      'on hold',
      'open',
      'on leave',
      'probation',
      'low stock',
      'pending approval',
      'pending customer',
    ].includes(lower)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{trimmed}</span>
      </span>
    );
  }

  if (
    [
      'failed',
      'failure',
      'declined',
      'rejected',
      'bounced',
      'cancelled',
      'canceled',
      'escalated',
      'overdue',
      'out of stock',
      'quarantined',
      'inactive',
    ].includes(lower)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/80 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>{trimmed}</span>
      </span>
    );
  }

  if (!trimmed || trimmed === '—' || trimmed === '(Missing)') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
        <span>{trimmed || '—'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/80 whitespace-nowrap">
      <HelpCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      <span>{trimmed}</span>
    </span>
  );
}
