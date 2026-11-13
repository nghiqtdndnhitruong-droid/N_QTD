import { useState, useEffect } from 'react';
import { FilePenLine, Info } from 'lucide-react';
import { DateInput } from '@/components/form';
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
import { formatContractNumber } from '../utils/contract-number';
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
  const [applicationDate, setApplicationDate] = useState('');
  const [committeeAuthDate, setCommitteeAuthDate] = useState('');

  const updateMutation = useUpdateLoan(loan.id);

  useEffect(() => {
    if (open) {
      setContractNumber(loan.contractNumber || '');
      setContractDate(loan.contractDate ? loan.contractDate.slice(0, 10) : '');
      setApplicationDate(
        loan.applicationDate
          ? loan.applicationDate.slice(0, 10)
          : loan.createdAt
            ? loan.createdAt.slice(0, 10)
            : '',
      );
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
        applicationDate: applicationDate ? applicationDate : null,
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
        'Ngày làm hồ sơ, số khế ước, ngày lập khế ước và ngày chứng thực ủy ban đã được đồng bộ.',
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

            <DateInput
              id="modal-application-date"
              label="Ngày làm hồ sơ vay"
              value={applicationDate}
              onValueChange={setApplicationDate}
              placeholder="dd/mm/yyyy"
              hint="Ngày làm hồ sơ vay vốn (được sử dụng cho các biến ngày/tháng/năm trên các biểu mẫu Word: {{NGAY}}, {{THANG}}, {{NAM}})."
            />

            <div className="space-y-1.5">
              <label htmlFor="modal-contract-number" className="block text-xs font-semibold text-slate-700">
                Số khế ước nhận nợ
              </label>
              <input
                id="modal-contract-number"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(formatContractNumber(e.target.value, contractNumber))}
                placeholder="VD: 26.11.020"
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs font-mono focus:border-primary-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Định dạng xx.yy.zzz (Năm.Tháng.Số khế ước, VD: 26.11.020). Để trống nếu hồ sơ chưa được cấp số.
              </p>
            </div>

            <DateInput
              id="modal-contract-date"
              label="Ngày lập khế ước"
              value={contractDate}
              onValueChange={setContractDate}
              placeholder="dd/mm/yyyy"
              hint="Ngày phát hành/ký khế ước nhận nợ giữa thành viên vay và Quỹ tín dụng."
            />

            {loan.loanType === LoanType.THE_CHAP && (
              <DateInput
                id="modal-committee-date"
                label="Ngày chứng thực Ủy ban nhân dân"
                value={committeeAuthDate}
                onValueChange={setCommitteeAuthDate}
                placeholder="dd/mm/yyyy"
                hint="Ngày UBND cấp xã/phường chứng thực hợp đồng thế chấp tài sản."
                wrapperClassName="border-t border-slate-100 pt-3"
              />
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
