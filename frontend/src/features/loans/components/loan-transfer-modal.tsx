import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Loader2, UserCheck } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { formatVND } from '@/shared/format';
import { useTransferLoan, useTransferTargets } from '../hooks/use-loans';
import type { Loan, TransferLoanResult } from '../types/loan.types';

export interface LoanTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  onSuccess?: (result: TransferLoanResult) => void;
}

export function LoanTransferModal({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: LoanTransferModalProps) {
  const [targetOfficerId, setTargetOfficerId] = useState('');
  const [reason, setReason] = useState('');

  const {
    data: officers = [],
    isLoading: isLoadingOfficers,
    isError: isOfficersError,
    refetch: refetchOfficers,
  } = useTransferTargets(open);
  const transferMutation = useTransferLoan();

  const availableOfficers = useMemo(() => {
    if (!loan) return officers;
    return officers.filter((o) => o.id !== loan.createdById);
  }, [officers, loan]);

  const currentOfficer = useMemo(() => {
    if (!loan?.createdById) return null;
    return officers.find((o) => o.id === loan.createdById) ?? null;
  }, [officers, loan]);

  useEffect(() => {
    if (open) {
      setTargetOfficerId('');
      setReason('');
    }
  }, [open, loan?.id]);

  if (!loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOfficerId) return;

    try {
      const result = await transferMutation.mutateAsync({
        loanId: loan.id,
        targetOfficerId,
        reason: reason.trim() || undefined,
      });

      notifySuccess(
        `Đã chuyển dời khoản vay sang cán bộ ${result.toOfficerName}`,
        `Hồ sơ ${loan.contractNumber || `#${loan.id.slice(-6)}`} đã được bàn giao thành công.`,
      );
      onOpenChange(false);
      onSuccess?.(result);
    } catch (err) {
      notifyApiError(err, 'Không thể chuyển dời khoản vay');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary-600" />
              <span>Chuyển dời khoản vay sang cán bộ khác</span>
            </DialogTitle>
            <DialogDescription>
              Chuyển quyền quản lý hồ sơ khoản vay này cho cán bộ tín dụng khác trong hệ thống.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-4">
            {/* Thông tin khoản vay */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số khế ước / Hồ sơ:</span>
                <span className="font-mono font-bold text-primary-700">
                  {loan.contractNumber || `#${loan.id.slice(-6)} (Chưa cấp số)`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Người vay:</span>
                <span className="font-semibold text-slate-900">
                  {loan.member?.fullName ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số tiền vay:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatVND(loan.loanAmount)}
                </span>
              </div>
              {currentOfficer && (
                <div className="flex items-center justify-between border-t border-slate-200/70 pt-1.5 mt-1.5">
                  <span className="text-slate-500">Cán bộ đang quản lý:</span>
                  <span className="font-semibold text-slate-800">
                    {currentOfficer.fullName} ({currentOfficer.username})
                  </span>
                </div>
              )}
            </div>

            {/* Chọn cán bộ nhận bàn giao */}
            <div className="space-y-1.5">
              <label
                htmlFor="transfer-target-officer"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary-600" />
                <span>
                  Chọn cán bộ tiếp nhận <span className="text-danger-600">*</span>
                </span>
              </label>

              {isLoadingOfficers ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
                  <span>Đang tải danh sách cán bộ...</span>
                </div>
              ) : isOfficersError ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <span>Không thể tải danh sách cán bộ. Vui lòng thử lại.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void refetchOfficers()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : availableOfficers.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Chưa có cán bộ khác trong hệ thống để chuyển dời.
                </div>
              ) : (
                <select
                  id="transfer-target-officer"
                  required
                  value={targetOfficerId}
                  onChange={(e) => setTargetOfficerId(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary-600 focus:outline-none"
                >
                  <option value="">-- Chọn cán bộ nhận bàn giao --</option>
                  {availableOfficers.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.fullName} — {officer.position} ({officer.username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Lý do chuyển dời */}
            <div className="space-y-1.5">
              <label htmlFor="transfer-reason" className="block text-xs font-semibold text-slate-700">
                Lý do chuyển dời (Tùy chọn)
              </label>
              <textarea
                id="transfer-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Bàn giao địa bàn quản lý, điều chuyển công tác..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-primary-600 focus:outline-none"
              />
            </div>

            {/* Cảnh báo */}
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Sau khi chuyển dời, cán bộ hiện tại sẽ <strong>không còn quản lý</strong> khoản vay
                này nữa; toàn bộ hồ sơ và dữ liệu khoản vay sẽ thuộc về cán bộ mới được chọn.
              </span>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              leftIcon={<ArrowRightLeft className="h-4 w-4" />}
              disabled={!targetOfficerId || availableOfficers.length === 0}
              isLoading={transferMutation.isPending}
            >
              Xác nhận chuyển dời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
