import { Check, CheckCircle2, CalendarClock, ClipboardCheck, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@/components/ui';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { formatDateVN } from '@/shared/format';
import { useUpdateLoan } from '../hooks/use-loans';
import type { Loan } from '../types/loan.types';
import {
  computeLoanInspectionSchedule,
  getEarliestDisbursementDate,
  normalizeInspectionChecks,
} from '../utils/loan-inspection';

export interface LoanInspectionSectionProps {
  loan: Loan;
}

export function LoanInspectionSection({ loan }: LoanInspectionSectionProps) {
  const updateLoanMutation = useUpdateLoan(loan.id);
  const disbursementDate = getEarliestDisbursementDate(loan);
  const currentChecks = normalizeInspectionChecks(loan.inspectionChecks);

  if (!disbursementDate) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Khoản vay chưa được giải ngân nên chưa phát sinh lịch biên bản kiểm tra định kỳ.
        </CardContent>
      </Card>
    );
  }

  const schedule = computeLoanInspectionSchedule(disbursementDate, currentChecks);
  const completedCount = schedule.filter((item) => item.completed).length;

  const handleToggleRound = async (index: number) => {
    if (updateLoanMutation.isPending) return;
    const nextChecks = [...currentChecks];
    nextChecks[index] = !nextChecks[index];

    try {
      await updateLoanMutation.mutateAsync({
        inspectionChecks: nextChecks,
      });
      const target = schedule[index];
      notifySuccess(
        nextChecks[index]
          ? `Đã đánh dấu bổ sung biên bản Đợt ${index + 1} (${target?.periodLabel})`
          : `Đã bỏ đánh dấu biên bản Đợt ${index + 1} (${target?.periodLabel})`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleMarkAll = async (completed: boolean) => {
    if (updateLoanMutation.isPending) return;
    const nextChecks = [completed, completed, completed, completed];
    try {
      await updateLoanMutation.mutateAsync({
        inspectionChecks: nextChecks,
      });
      notifySuccess(
        completed
          ? 'Đã đánh dấu hoàn thành cả 4 đợt biên bản kiểm tra'
          : 'Đã đặt lại tiến độ 4 đợt biên bản kiểm tra',
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Theo dõi Biên bản kiểm tra sử dụng vốn sau giải ngân (4 đợt)</CardTitle>
          <CardDescription>
            Ngày giải ngân đầu tiên: <strong>{formatDateVN(disbursementDate)}</strong> · Định kỳ kiểm
            tra vào cuối các quý Tháng 3, Tháng 6, Tháng 9, Tháng 11
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={completedCount === 4 ? 'success' : completedCount > 0 ? 'primary' : 'neutral'}>
            Tiến độ: {completedCount}/4 biên bản
          </Badge>
          {completedCount < 4 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateLoanMutation.isPending}
              onClick={() => void handleMarkAll(true)}
            >
              Chọn đủ 4 đợt
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={updateLoanMutation.isPending}
              onClick={() => void handleMarkAll(false)}
            >
              Bỏ chọn tất cả
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Thanh tiến độ tổng quan */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-primary-600" />
              <span>Tiến độ bổ sung biên bản kiểm tra định kỳ</span>
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {completedCount} / 4 đợt hoàn thành ({Math.round((completedCount / 4) * 100)}%)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {schedule.map((item) => (
              <div
                key={item.index}
                className={`h-2.5 rounded-full transition-all ${
                  item.completed
                    ? 'bg-emerald-500 shadow-xs'
                    : item.isDueOrPast
                      ? 'bg-amber-300'
                      : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Danh sách 4 mốc thời gian kiểm tra */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {schedule.map((item) => {
            return (
              <div
                key={item.index}
                role="button"
                tabIndex={0}
                onClick={() => void handleToggleRound(item.index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleToggleRound(item.index);
                  }
                }}
                className={`group flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all select-none ${
                  item.completed
                    ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50'
                    : item.isDueOrPast
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/60'
                      : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
                } ${updateLoanMutation.isPending ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Ô Check lớn */}
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      item.completed
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-300 bg-white group-hover:border-primary-500'
                    }`}
                  >
                    {item.completed && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Đợt {item.roundNumber}: Quý {item.periodLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Mốc cuối quý:{' '}
                        <strong className="font-mono text-slate-800">{item.quarterEndDate}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {item.completed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Đã bổ sung
                    </span>
                  ) : item.isDueOrPast ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Cần bổ sung
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                      Chưa bổ sung
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hiển thị 4 ô vuông nhỏ tiến độ biên bản kiểm tra trên bảng danh sách khoản vay
 */
export function LoanInspectionSquares({
  loan,
  onClick,
}: {
  loan: Loan;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const disbursementDate = getEarliestDisbursementDate(loan);

  if (!disbursementDate) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const schedule = computeLoanInspectionSchedule(disbursementDate, loan.inspectionChecks);
  const completedCount = schedule.filter((s) => s.completed).length;

  return (
    <div
      onClick={onClick}
      className="inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-1 hover:bg-slate-100 transition-colors"
      title={`Biên bản kiểm tra định kỳ: Đã bổ sung ${completedCount}/4 đợt (Nhấn để mở tab Kiểm tra)`}
    >
      <div className="flex items-center gap-1">
        {schedule.map((item) => (
          <span
            key={item.index}
            title={`Đợt ${item.roundNumber} (${item.periodLabel} - hạn ${item.quarterEndDate}): ${
              item.completed ? 'Đã bổ sung' : 'Chưa bổ sung'
            }`}
            className={`inline-block h-3.5 w-3.5 rounded-[3px] border transition-all ${
              item.completed
                ? 'bg-emerald-500 border-emerald-600 shadow-2xs'
                : item.isDueOrPast
                  ? 'bg-amber-100 border-amber-400'
                  : 'bg-slate-200 border-slate-300'
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-slate-600">
        {completedCount}/4
      </span>
    </div>
  );
}
