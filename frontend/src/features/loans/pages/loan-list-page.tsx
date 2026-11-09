import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, FilePenLine, Plus, Trash2 } from 'lucide-react';
import { LoanStatus, LoanTermType, LoanType } from '@/shared/types';
import {
  LOAN_STATUS_META,
  LOAN_TERM_TYPE_LABELS,
  LOAN_TYPE_LABELS,
} from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND } from '@/shared/format';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { Badge, Button, LoanStatusBadge } from '@/components/ui';
import { DataTable, DataTableToolbar } from '@/components/data-table';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  notifyApiError,
  notifyInfo,
  notifySuccess,
} from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import { useDeleteLoan, useLoansList } from '../hooks/use-loans';
import type { Loan } from '../types/loan.types';

const FILTER_KEYS = ['status', 'loanType', 'termType'] as const;

export function LoanListPage() {
  const navigate = useNavigate();
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const deleteLoanMutation = useDeleteLoan();

  const tableState = useTableUrlState<{
    status?: LoanStatus;
    loanType?: LoanType;
    termType?: LoanTermType;
  }>({
    defaultLimit: 10,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const { data, isLoading, isFetching, error, refetch } = useLoansList({
    page: tableState.page,
    limit: tableState.limit,
    search: tableState.search || undefined,
    sortBy: tableState.sortBy,
    sortOrder: tableState.sortOrder,
    status: tableState.filters.status,
    loanType: tableState.filters.loanType,
    termType: tableState.filters.termType,
  });

  const columns = useMemo<ColumnDef<Loan>[]>(
    () => [
      {
        accessorKey: 'contractNumber',
        header: 'Số khế ước',
        meta: { sticky: 'left', sortableId: 'contractNumber' },
        cell: ({ row }) => (
          <Link
            to={`/loans/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className={
              row.original.contractNumber
                ? 'font-mono font-semibold text-primary-700 hover:underline'
                : 'italic text-xs text-slate-400 hover:text-slate-600 hover:underline'
            }
          >
            {row.original.contractNumber || 'Chưa cấp số khế ước'}
          </Link>
        ),
      },
      {
        id: 'member',
        header: 'Thành viên vay vốn',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">
              {row.original.member?.fullName ?? '—'}
            </div>
            {row.original.member?.memberCode && (
              <div className="font-mono text-xs text-slate-500">
                {row.original.member.memberCode}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'loanType',
        header: 'Hình thức',
        cell: ({ row }) => (
          <Badge tone={row.original.loanType === LoanType.THE_CHAP ? 'primary' : 'neutral'}>
            {LOAN_TYPE_LABELS[row.original.loanType]}
          </Badge>
        ),
      },
      {
        accessorKey: 'termType',
        header: 'Kỳ hạn',
        cell: ({ row }) => (
          <div>
            <span className="text-xs font-medium text-slate-700">
              {LOAN_TERM_TYPE_LABELS[row.original.termType]}
            </span>
            {row.original.halfTermPaymentDate && (
              <div className="text-[10px] text-slate-500">
                Mốc 50%: {formatDateVN(row.original.halfTermPaymentDate)}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'loanAmount',
        header: 'Số tiền vay',
        meta: { align: 'right', sortableId: 'loanAmount' },
        cell: ({ row }) => (
          <span className="font-bold text-slate-900 tabular-nums">
            {formatVND(row.original.loanAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'interestRate',
        header: 'Lãi suất',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-medium text-primary-700 tabular-nums">
            {formatInterestRate(row.original.interestRate)}
          </span>
        ),
      },
      {
        accessorKey: 'maturityDate',
        header: 'Ngày đáo hạn',
        meta: { sortableId: 'maturityDate' },
        cell: ({ row }) => (
          <div>
            <span className="tabular-nums text-xs">
              {formatDateVN(row.original.maturityDate, 'Chưa giải ngân')}
            </span>
            {row.original.expectedMaturityDate &&
              row.original.maturityDate &&
              row.original.expectedMaturityDate.slice(0, 10) !==
                row.original.maturityDate.slice(0, 10) && (
                <div className="text-[10px] font-medium text-amber-700">
                  Rút ngắn theo HĐTC
                </div>
              )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <LoanStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { align: 'right', sticky: 'right' },
        cell: ({ row }) => (
          <div className="inline-flex items-center justify-end gap-1">
            {row.original.status === LoanStatus.DANG_TAO && (
              <Can perm="loan:update">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<FilePenLine className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/loans/new?draft=${row.original.id}`);
                  }}
                >
                  Tiếp tục lập
                </Button>
              </Can>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/loans/${row.original.id}`);
              }}
            >
              Chi tiết
            </Button>
            <Can perm="loan:delete">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-600"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingLoan(row.original);
                }}
              >
                Xóa
              </Button>
            </Can>
          </div>
        ),
      },
    ],
    [navigate],
  );

  const isDeletingLoanFinanciallyLocked = Boolean(
    deletingLoan &&
      (deletingLoan.status === LoanStatus.DA_GIAI_NGAN ||
        deletingLoan.status === LoanStatus.QUA_HAN ||
        deletingLoan.status === LoanStatus.DA_TAT_TOAN ||
        (deletingLoan.disbursements?.length ?? 0) > 0 ||
        (deletingLoan.repayments?.length ?? 0) > 0),
  );

  const handleConfirmDeleteLoan = async () => {
    if (!deletingLoan) return;
    try {
      const res = await deleteLoanMutation.mutateAsync({
        id: deletingLoan.id,
        reason: 'Xóa hồ sơ vay tạo nhầm chưa phát sinh giao dịch tài chính',
      });
      notifySuccess(
        `Đã xóa hồ sơ khoản vay ${res.contractNumber || `#${res.id.slice(-6)}`}`,
        res.releasedCollateralsCount > 0
          ? `Đã giải phóng ${res.releasedCollateralsCount} tài sản thế chấp đính kèm.`
          : 'Dấu vết thao tác đã được ghi nhận vào nhật ký kiểm toán (Audit Log).',
      );
      setDeletingLoan(null);
    } catch (err) {
      setDeletingLoan(null);
      notifyApiError(err);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Hồ sơ Khoản vay"
        description="Theo dõi toàn bộ hồ sơ vay tín chấp, vay thế chấp, trạng thái giải ngân, thu nợ và đáo hạn."
        actions={
          <>
            <Can perm="report:export">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() =>
                  notifyInfo(
                    'Đang chuẩn bị tệp Excel danh sách khoản vay',
                    'Xuất toàn bộ bản ghi khớp với bộ lọc hiện tại qua GET /api/v1/loans/export.',
                  )
                }
              >
                Xuất Excel
              </Button>
            </Can>
            <Can perm="loan:create">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/loans/new')}
              >
                Lập hồ sơ vay mới
              </Button>
            </Can>
          </>
        }
      />

      <DataTableToolbar
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        searchPlaceholder="Tìm theo số khế ước, họ tên hoặc mã thành viên..."
        activeFilterCount={tableState.activeFilterCount}
        onResetFilters={tableState.resetFilters}
        filters={
          <>
            <select
              aria-label="Lọc theo trạng thái khoản vay"
              value={tableState.filters.status ?? ''}
              onChange={(e) =>
                tableState.setFilter(
                  'status',
                  (e.target.value || undefined) as LoanStatus | undefined,
                )
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(LOAN_STATUS_META).map(([statusKey, meta]) => (
                <option key={statusKey} value={statusKey}>
                  {meta.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo hình thức vay"
              value={tableState.filters.loanType ?? ''}
              onChange={(e) =>
                tableState.setFilter(
                  'loanType',
                  (e.target.value || undefined) as LoanType | undefined,
                )
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả hình thức</option>
              <option value={LoanType.TIN_CHAP}>{LOAN_TYPE_LABELS.TIN_CHAP}</option>
              <option value={LoanType.THE_CHAP}>{LOAN_TYPE_LABELS.THE_CHAP}</option>
            </select>

            <select
              aria-label="Lọc theo kỳ hạn vay"
              value={tableState.filters.termType ?? ''}
              onChange={(e) =>
                tableState.setFilter(
                  'termType',
                  (e.target.value || undefined) as LoanTermType | undefined,
                )
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả kỳ hạn</option>
              <option value={LoanTermType.NGAN_HAN}>{LOAN_TERM_TYPE_LABELS.NGAN_HAN}</option>
              <option value={LoanTermType.TRUNG_HAN}>{LOAN_TERM_TYPE_LABELS.TRUNG_HAN}</option>
            </select>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        pagination={data?.pagination}
        onPageChange={tableState.setPage}
        onLimitChange={tableState.setLimit}
        sortBy={tableState.sortBy}
        sortOrder={tableState.sortOrder}
        onSortChange={tableState.setSorting}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        isFiltered={tableState.activeFilterCount > 0}
        onResetFilters={tableState.resetFilters}
        emptyTitle="Chưa có hồ sơ khoản vay nào"
        emptyDescription="Tạo hồ sơ vay tín chấp hoặc thế chấp mới cho thành viên của Quỹ."
        emptyAction={
          <Can perm="loan:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/loans/new')}
            >
              Lập hồ sơ vay mới
            </Button>
          </Can>
        }
        onRowClick={(row) => navigate(`/loans/${row.id}`)}
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={
                  row.contractNumber
                    ? 'font-mono font-bold text-primary-700'
                    : 'italic text-xs text-slate-400'
                }
              >
                {row.contractNumber || 'Chưa cấp số khế ước'}
              </span>
              <LoanStatusBadge status={row.status} />
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {row.member?.fullName ?? '—'}{' '}
              <span className="font-mono text-xs font-normal text-slate-500">
                {row.member?.memberCode ? `(${row.member.memberCode})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{LOAN_TYPE_LABELS[row.loanType]}</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatVND(row.loanAmount)}
              </span>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={Boolean(deletingLoan)}
        onOpenChange={(open) => !open && setDeletingLoan(null)}
        title={`Xác nhận xóa khoản vay ${deletingLoan?.contractNumber || 'Chưa cấp số khế ước'}?`}
        description={
          deletingLoan
            ? isDeletingLoanFinanciallyLocked
              ? `LƯU Ý NGHIỆP VỤ: Khoản vay của thành viên "${deletingLoan.member?.fullName ?? ''}" đang ở trạng thái "${LOAN_STATUS_META[deletingLoan.status].label}" và đã có giao dịch giải ngân/thu nợ kế toán. Hệ thống KHÔNG cho phép xóa lịch sử tài chính — vui lòng mở chi tiết khoản vay để thực hiện Tất toán hoặc Điều chỉnh.`
              : `Hồ sơ vay của thành viên "${deletingLoan.member?.fullName ?? ''}" (${formatVND(deletingLoan.loanAmount)}) hiện chưa phát sinh giao dịch giải ngân/thu nợ. Khi xác nhận xóa, hồ sơ sẽ được vô hiệu hóa (Soft Delete), giải phóng tài sản thế chấp đính kèm và ghi nhận vào Audit Log.`
            : undefined
        }
        confirmText={isDeletingLoanFinanciallyLocked ? 'Thử gửi yêu cầu kiểm tra' : 'Xác nhận xóa hồ sơ vay'}
        tone="danger"
        isLoading={deleteLoanMutation.isPending}
        onConfirm={handleConfirmDeleteLoan}
      />
    </div>
  );
}
