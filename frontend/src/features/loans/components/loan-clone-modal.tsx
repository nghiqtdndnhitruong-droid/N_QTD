import { useState } from 'react';
import { Copy, Landmark, Search, User } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { TextInput } from '@/components/form';
import { notifyApiError, notifySuccess, Skeleton } from '@/components/feedback';
import { useLoansList, useCloneLoan } from '../hooks/use-loans';
import { formatVND, formatDateVN } from '@/shared/format';
import { LOAN_TYPE_LABELS, LOAN_TERM_TYPE_LABELS } from '@/shared/constants';
import type { Loan } from '../types/loan.types';

export interface LoanCloneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMemberId?: string;
  onSuccess: (clonedLoan: Loan) => void;
}

export function LoanCloneModal({
  open,
  onOpenChange,
  targetMemberId,
  onSuccess,
}: LoanCloneModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const { data: loansData, isLoading } = useLoansList({
    page: 1,
    limit: 15,
    search: searchTerm.trim() || undefined,
  });

  const cloneMutation = useCloneLoan();
  const loans = loansData?.items ?? [];

  const handleConfirmClone = async () => {
    if (!selectedLoan) return;
    try {
      const cloned = await cloneMutation.mutateAsync({
        sourceLoanId: selectedLoan.id,
        targetMemberId,
      });
      notifySuccess(
        'Đã sao chép hồ sơ khoản vay thành công!',
        `Toàn bộ thông tin, phương án vay và tài sản thế chấp (${cloned.collaterals?.length ?? 0} tài sản) đã được nạp vào hồ sơ mới.`
      );
      onOpenChange(false);
      onSuccess(cloned);
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary-600" />
            <DialogTitle>Tải dữ liệu từ khoản vay cũ / Sao chép hồ sơ</DialogTitle>
          </div>
          <DialogDescription>
            Hệ thống sẽ sao chép toàn bộ thông tin khoản vay cũ (kỳ hạn, số tiền, phương án vay, người thừa kế,
            đặc biệt là toàn bộ tài sản thế chấp và bảng định giá) sang hồ sơ mới.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="relative">
            <TextInput
              placeholder="Tìm theo tên thành viên, mã TV, CCCD, số khế ước..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftAddon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : loans.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Không tìm thấy hồ sơ khoản vay nào phù hợp.
              </div>
            ) : (
              loans.map((loan) => {
                const isSelected = selectedLoan?.id === loan.id;
                const collateralsCount = loan.collaterals?.length ?? 0;
                return (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedLoan(loan)}
                    className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-slate-900">
                          {loan.member?.fullName ?? 'Thành viên'}
                        </span>
                        {loan.member?.memberCode && (
                          <Badge tone="neutral" className="text-[11px]">
                            {loan.member.memberCode}
                          </Badge>
                        )}
                        <span className="font-mono text-xs text-primary-700">
                          {loan.contractNumber ? `(${loan.contractNumber})` : '(Chưa cấp số)'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="font-medium text-slate-900 tabular-nums">
                          Số tiền: <strong>{formatVND(loan.loanAmount)}</strong>
                        </span>
                        <span>{LOAN_TYPE_LABELS[loan.loanType]}</span>
                        <span>{LOAN_TERM_TYPE_LABELS[loan.termType]}</span>
                        {loan.contractDate && (
                          <span>Ngày: {formatDateVN(loan.contractDate)}</span>
                        )}
                      </div>

                      <div className="pt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Landmark className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {collateralsCount > 0 ? (
                            <strong className="text-primary-700">{collateralsCount} tài sản thế chấp</strong>
                          ) : (
                            'Chưa có tài sản'
                          )}
                        </span>
                        {loan.heir?.fullName && (
                          <span>· Thừa kế: <strong>{loan.heir.fullName}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="pl-3 self-center">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'primary' : 'outline'}
                      >
                        {isSelected ? 'Đã chọn' : 'Chọn'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedLoan}
            isLoading={cloneMutation.isPending}
            onClick={handleConfirmClone}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Sao chép khoản vay này
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
