import { useState, useEffect } from 'react';
import { FilePenLine, Info } from 'lucide-react';
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
import { LoanType } from '@/shared/types';
import { useUpdateLoan } from '../hooks/use-loans';
import type { Loan } from '../types/loan.types';

export interface LoanContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  onSuccess?: () => void;
}

export function LoanContractModal({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: LoanContractModalProps) {
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [committeeAuthDate, setCommitteeAuthDate] = useState('');

  const updateMutation = useUpdateLoan(loan.id);

  useEffect(() => {
    if (open) {
      setContractNumber(loan.contractNumber || '');
      setContractDate(loan.contractDate ? loan.contractDate.slice(0, 10) : '');
      setCommitteeAuthDate(
        loan.mortgageContract?.committeeAuthDate
          ? loan.mortgageContract.committeeAuthDate.slice(0, 10)
          : '',
      );
    }
  }, [open, loan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        contractNumber: contractNumber.trim() ? contractNumber.trim() : null,
        contractDate: contractDate ? contractDate : null,
      };

      if (loan.loanType === LoanType.THE_CHAP) {
        payload.mortgageContract = {
          committeeAuthDate: committeeAuthDate ? committeeAuthDate : null,
        };
      }

      await updateMutation.mutateAsync(payload);
      notifySuccess(
        'Đã cập nhật thông tin thành công!',
        'Số khế ước, ngày lập khế ước và ngày chứng thực ủy ban đã được đồng bộ.',
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePenLine className="h-5 w-5 text-primary-600" />
              <span>Cập nhật Khế ước & Chứng thực Ủy ban</span>
            </DialogTitle>
            <DialogDescription>
              Cho phép bổ sung hoặc điều chỉnh số khế ước, ngày cấp khế ước và ngày chứng thực ủy ban
              bất kỳ lúc nào (kể cả khi khoản vay đã giải ngân).
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-4">
            <div className="rounded-md border border-info-200 bg-info-50/60 p-3 text-xs text-info-800 flex items-start gap-2">
              <Info className="h-4 w-4 text-info-600 shrink-0 mt-0.5" />
              <span>
                Nếu chưa cấp số khế ước, bạn có thể để trống. Hệ thống sẽ lưu trạng thái{' '}
                <strong>"Chưa cấp số khế ước"</strong> mà không báo lỗi trùng lặp.
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="modal-contract-number" className="block text-xs font-semibold text-slate-700">
                Số khế ước nhận nợ
              </label>
              <input
                id="modal-contract-number"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="VD: KU-2026-001 hoặc 26.11.001..."
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs font-mono focus:border-primary-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Số khế ước duy nhất của khoản vay. Để trống nếu hồ sơ chưa được cấp số.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="modal-contract-date" className="block text-xs font-semibold text-slate-700">
                Ngày lập khế ước
              </label>
              <input
                id="modal-contract-date"
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-primary-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Ngày phát hành/ký khế ước nhận nợ giữa thành viên vay và Quỹ tín dụng.
              </p>
            </div>

            {loan.loanType === LoanType.THE_CHAP && (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label htmlFor="modal-committee-date" className="block text-xs font-semibold text-slate-700">
                  Ngày chứng thực Ủy ban nhân dân
                </label>
                <input
                  id="modal-committee-date"
                  type="date"
                  value={committeeAuthDate}
                  onChange={(e) => setCommitteeAuthDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-primary-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Ngày UBND cấp xã/phường chứng thực hợp đồng thế chấp tài sản.
                </p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
