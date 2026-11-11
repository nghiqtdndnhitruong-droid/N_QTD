import { AlertTriangle, Banknote, CalendarClock, Coins, Wallet } from 'lucide-react';
import { formatDateVN, formatInterestRate, formatVND } from '@/shared/format';
import { StatCard } from '@/components/ui';
import { Alert, CardGridSkeleton } from '@/components/feedback';
import type { LoanSummary } from '../types/loan.types';

export function LoanSummaryStrip({
  summary,
  isLoading,
}: {
  summary?: LoanSummary;
  isLoading?: boolean;
}) {
  if (isLoading || !summary) {
    return <CardGridSkeleton count={4} />;
  }

  return (
    <div className="space-y-3">
      {summary.isOverdue && (
        <Alert
          tone="danger"
          title={`Cảnh báo khoản vay quá hạn (${summary.overdueDays} ngày sau ngày đáo hạn)`}
        >
          Khoản vay đã vượt quá thời gian ân hạn (9 ngày kể từ ngày đáo hạn{' '}
          <strong>{formatDateVN(summary.maturityDate)}</strong>). Vui lòng liên hệ thành viên để
          đôn đốc thu hồi nợ gốc và lãi.
        </Alert>
      )}

      {summary.halfTermPaymentStatus === 'QUA_HAN' && (
        <Alert
          tone="danger"
          title={`Quá hạn mốc trả phân nửa nợ gốc (${formatDateVN(summary.halfTermPaymentDate)})`}
        >
          Khoản vay trung hạn yêu cầu hoàn thành tối thiểu 50% nợ gốc (
          <strong>{formatVND(summary.halfTermRequiredAmount ?? 0)}</strong>) trước ngày{' '}
          <strong>{formatDateVN(summary.halfTermPaymentDate)}</strong>. Hiện mới thu được{' '}
          <strong className="text-danger-700">{formatVND(summary.halfTermPrincipalPaid ?? 0)}</strong>.
          Vui lòng đôn đốc thành viên nộp nợ gốc theo quy chế Quỹ.
        </Alert>
      )}

      {summary.halfTermPaymentStatus === 'DEN_HAN' && (
        <Alert
          tone="warning"
          title={`Đến hạn mốc trả phân nửa nợ gốc (${formatDateVN(summary.halfTermPaymentDate)})`}
        >
          Khoản vay trung hạn cần đạt tối thiểu 50% nợ gốc (
          <strong>{formatVND(summary.halfTermRequiredAmount ?? 0)}</strong>) trước ngày{' '}
          <strong>{formatDateVN(summary.halfTermPaymentDate)}</strong>. Hiện đã thu:{' '}
          <strong className="text-primary-700">{formatVND(summary.halfTermPrincipalPaid ?? 0)}</strong>.
        </Alert>
      )}

      {summary.warnings && summary.warnings.length > 0 && (
        <div className="space-y-3">
          {summary.warnings
            .filter((w) => w.code !== 'MORTGAGE_SHORTENED')
            .map((w, idx) => (
              <Alert key={idx} tone="warning" title={w.title}>
                {w.message}
              </Alert>
            ))}
        </div>
      )}

      {summary.isMortgageShortened && (
        <Alert
          tone="warning"
          title="Thời hạn vay được xác định theo Hợp đồng thế chấp"
        >
          Ngày đáo hạn thực tế là <strong>{formatDateVN(summary.maturityDate)}</strong> (ngắn hơn
          kỳ hạn quy định của gói vay: {formatDateVN(summary.expectedMaturityDate)}) do thời hạn
          hiệu lực của Hợp đồng thế chấp kết thúc trước.
        </Alert>
      )}

      {summary.isInterestOverdue && !summary.isOverdue && (
        <Alert
          tone="warning"
          title={`Đến kỳ thu lãi (${summary.unpaidInterestDays} ngày chưa đóng lãi)`}
        >
          Số tiền lãi tạm tính đến hôm nay:{' '}
          <strong className="tabular-nums">{formatVND(summary.unpaidInterestAmount)}</strong>.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hạn mức vay được duyệt"
          value={formatVND(summary.approvedLoanAmount)}
          subtext={`Lãi suất chốt: ${formatInterestRate(summary.interestRateAnnual)} · Kỳ hạn ${summary.termMonths} tháng`}
          icon={<Banknote className="h-5 w-5" />}
          tone="primary"
        />

        <StatCard
          label="Đã giải ngân / Còn được rút"
          value={formatVND(summary.totalDisbursed)}
          subtext={`Còn được giải ngân: ${formatVND(summary.remainingDisbursableAmount)} (${summary.disbursementCount} đợt)`}
          icon={<Wallet className="h-5 w-5" />}
          tone="default"
        />

        <StatCard
          label="Dư nợ gốc thực tế hiện tại"
          value={formatVND(summary.currentPrincipalBalance)}
          subtext={`Gốc đã trả: ${formatVND(summary.totalPrincipalPaid)} · Lãi đã thu: ${formatVND(summary.totalInterestPaid)}`}
          icon={<Coins className="h-5 w-5" />}
          tone={summary.currentPrincipalBalance === 0 ? 'success' : 'warning'}
        />

        <StatCard
          label={
            summary.isMortgageShortened
              ? 'Ngày đáo hạn (theo HĐTC)'
              : 'Ngày đáo hạn & Lãi tạm tính'
          }
          value={formatDateVN(summary.maturityDate, 'Chưa giải ngân')}
          subtext={
            summary.isMortgageShortened
              ? `Kỳ hạn gốc: ${formatDateVN(summary.expectedMaturityDate)} · Lãi tạm: ${formatVND(summary.unpaidInterestAmount)}`
              : `Lãi tạm tính (${summary.unpaidInterestDays} ngày): ${formatVND(summary.unpaidInterestAmount)}`
          }
          icon={
            summary.isOverdue || summary.isMortgageShortened ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CalendarClock className="h-5 w-5" />
            )
          }
          tone={summary.isOverdue ? 'danger' : summary.isMortgageShortened ? 'warning' : 'default'}
        />
      </div>
    </div>
  );
}

