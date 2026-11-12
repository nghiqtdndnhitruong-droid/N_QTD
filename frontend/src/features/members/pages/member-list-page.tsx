import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Gender, IdDocumentType } from '@/shared/types';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN } from '@/shared/format';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { Badge, Button } from '@/components/ui';
import { DataTable, DataTableToolbar } from '@/components/data-table';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  notifyApiError,
  notifyInfo,
  notifySuccess,
} from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import { useAreaTree } from '@/features/areas/hooks/use-areas';
import { checkIdExpiryStatus } from '@/features/loans/utils/loan-warnings';
import { useDeleteMember, useMembersList } from '../hooks/use-members';
import type { Member } from '../types/member.types';

const FILTER_KEYS = ['gender', 'idType', 'communeId', 'hamletId'] as const;

export function MemberListPage() {
  const navigate = useNavigate();
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const deleteMemberMutation = useDeleteMember();
  const { data: areaTree = [] } = useAreaTree();

  const tableState = useTableUrlState<{
    gender?: Gender;
    idType?: IdDocumentType;
    communeId?: string;
    hamletId?: string;
  }>({
    defaultLimit: 10,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const communes = useMemo(() => areaTree[0]?.communes ?? [], [areaTree]);
  const selectedCommune = useMemo(
    () => communes.find((c) => c.id === tableState.filters.communeId),
    [communes, tableState.filters.communeId],
  );
  const hamletsForFilter = useMemo(
    () => selectedCommune?.hamlets ?? [],
    [selectedCommune],
  );

  const { data, isLoading, isFetching, error, refetch } = useMembersList({
    page: tableState.page,
    limit: tableState.limit,
    search: tableState.search || undefined,
    sortBy: tableState.sortBy,
    sortOrder: tableState.sortOrder,
    gender: tableState.filters.gender,
    idType: tableState.filters.idType,
    communeId: tableState.filters.communeId,
    hamletId: tableState.filters.hamletId,
  });

  const columns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: 'memberCode',
        header: 'Mã TV',
        meta: { sticky: 'left', sortableId: 'memberCode' },
        cell: ({ row }) => (
          <Link
            to={`/members/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono font-semibold text-primary-700 hover:underline"
          >
            {row.original.memberCode ? (
              row.original.memberCode
            ) : (
              <Badge tone="warning" className="text-[10px] font-normal">
                Chưa cấp mã
              </Badge>
            )}
          </Link>
        ),
      },
      {
        accessorKey: 'fullName',
        header: 'Họ và tên',
        meta: { sortableId: 'fullName' },
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.fullName}</div>
            {row.original.phoneNumber && (
              <div className="text-[11px] font-mono text-slate-500">{row.original.phoneNumber}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'yearOfBirth',
        header: 'Năm sinh',
        meta: { align: 'center', sortableId: 'yearOfBirth' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.yearOfBirth}</span>,
      },
      {
        accessorKey: 'gender',
        header: 'Giới tính',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Badge tone={row.original.gender === Gender.NAM ? 'primary' : 'info'}>
            {GENDER_LABELS[row.original.gender]}
          </Badge>
        ),
      },
      {
        accessorKey: 'idNumber',
        header: 'Giấy tờ tùy thân',
        cell: ({ row }) => {
          const expiryStatus = checkIdExpiryStatus(row.original.idExpiry);
          return (
            <div>
              <div className="font-mono font-medium text-slate-900">{row.original.idNumber}</div>
              <div className="text-[11px] text-slate-500">
                {ID_DOCUMENT_TYPE_LABELS[row.original.idType]} · Cấp:{' '}
                {formatDateVN(row.original.idIssueDate)}
              </div>
              {row.original.idExpiry ? (
                <>
                  {expiryStatus?.isExpired && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                        ⚠️ Hết hạn: {formatDateVN(row.original.idExpiry)}
                      </span>
                    </div>
                  )}
                  {expiryStatus?.isExpiringSoon && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                        ⚠️ Sắp hết hạn (&lt; 6th): {formatDateVN(row.original.idExpiry)}
                      </span>
                    </div>
                  )}
                  {!expiryStatus?.isExpired && !expiryStatus?.isExpiringSoon && (
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Hạn: {formatDateVN(row.original.idExpiry)}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Hạn: <span className="font-medium text-slate-600">Không thời hạn</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'address',
        header: 'Địa bàn thường trú (Ấp → Xã → Tỉnh)',
        cell: ({ row }) => (
          <div className="max-w-xs space-y-0.5">
            {row.original.hamletName && row.original.communeName ? (
              <div className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>
                  {row.original.hamletName}, {row.original.communeName}
                </span>
              </div>
            ) : null}
            <div className="line-clamp-2 text-xs text-slate-600">{row.original.address}</div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { align: 'right', sticky: 'right' },
        cell: ({ row }) => (
          <div className="inline-flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/members/${row.original.id}`);
              }}
            >
              Xem
            </Button>
            <Can perm="member:update">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/members/${row.original.id}/edit`);
                }}
              >
                Sửa
              </Button>
            </Can>
            <Can perm="member:delete">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-600"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingMember(row.original);
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

  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    try {
      const res = await deleteMemberMutation.mutateAsync({
        id: deletingMember.id,
        reason: 'Xóa hồ sơ thành viên theo yêu cầu cán bộ quản lý',
      });
      const memberCodeDisplay = res.memberCode ? ` (${res.memberCode})` : ' (Chưa cấp mã)';
      notifySuccess(
        res.deleteMode === 'SOFT_DELETE'
          ? `Đã xóa mềm thành viên ${res.fullName}${memberCodeDisplay}`
          : `Đã xóa vĩnh viễn thành viên ${res.fullName}${memberCodeDisplay}`,
        res.deleteMode === 'SOFT_DELETE'
          ? 'Thành viên đã từng có hồ sơ vay đã tất toán nên được ẩn an toàn để bảo toàn lịch sử kiểm toán.'
          : 'Thành viên chưa phát sinh giao dịch nào nên đã được xóa khỏi danh sách.',
      );
      setDeletingMember(null);
    } catch (err) {
      setDeletingMember(null);
      notifyApiError(err);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Thành viên"
        description="Danh sách thành viên Quỹ tín dụng nhân dân theo địa bàn Ấp → Xã → Tỉnh, thông tin căn cước và lịch sử vay vốn."
        actions={
          <>
            <Can perm="report:export">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() =>
                  notifyInfo(
                    'Đang chuẩn bị tệp Excel danh sách thành viên',
                    'Chức năng kết nối endpoint GET /api/v1/members/export theo bộ lọc hiện tại.',
                  )
                }
              >
                Xuất Excel
              </Button>
            </Can>
            <Can perm="member:create">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/members/new')}
              >
                Thêm thành viên
              </Button>
            </Can>
          </>
        }
      />

      <DataTableToolbar
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        searchPlaceholder="Tìm theo mã TV, họ tên, số CCCD hoặc tên Ấp/Xã..."
        activeFilterCount={tableState.activeFilterCount}
        onResetFilters={tableState.resetFilters}
        filters={
          <>
            <select
              aria-label="Lọc theo Xã quản lý"
              value={tableState.filters.communeId ?? ''}
              onChange={(e) => {
                const nextCommune = e.target.value || undefined;
                tableState.setFilter('communeId', nextCommune);
                tableState.setFilter('hamletId', undefined);
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả Xã quản lý</option>
              {communes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo Ấp"
              disabled={!tableState.filters.communeId}
              value={tableState.filters.hamletId ?? ''}
              onChange={(e) =>
                tableState.setFilter('hamletId', e.target.value || undefined)
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 focus:border-primary-600 focus:outline-none"
            >
              <option value="">
                {tableState.filters.communeId ? 'Tất cả Ấp trong xã' : 'Chọn Xã để lọc Ấp'}
              </option>
              {hamletsForFilter.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo giới tính"
              value={tableState.filters.gender ?? ''}
              onChange={(e) =>
                tableState.setFilter('gender', (e.target.value || undefined) as Gender | undefined)
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả giới tính</option>
              <option value={Gender.NAM}>Nam</option>
              <option value={Gender.NU}>Nữ</option>
            </select>

            <select
              aria-label="Lọc theo loại giấy tờ"
              value={tableState.filters.idType ?? ''}
              onChange={(e) =>
                tableState.setFilter(
                  'idType',
                  (e.target.value || undefined) as IdDocumentType | undefined,
                )
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả loại giấy tờ</option>
              <option value={IdDocumentType.CAN_CUOC_CONG_DAN}>Căn cước công dân</option>
              <option value={IdDocumentType.CAN_CUOC}>Căn cước</option>
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
        emptyTitle="Chưa có hồ sơ thành viên nào"
        emptyDescription="Bắt đầu bằng cách thêm thành viên đầu tiên để lập hồ sơ vay vốn."
        emptyAction={
          <Can perm="member:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/members/new')}
            >
              Thêm thành viên
            </Button>
          </Can>
        }
        onRowClick={(row) => navigate(`/members/${row.id}`)}
        renderMobileCard={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{row.fullName}</span>
              {row.memberCode ? (
                <Badge tone="primary" className="font-mono">
                  {row.memberCode}
                </Badge>
              ) : (
                <Badge tone="warning" className="text-[10px] font-normal">
                  Chưa cấp mã
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-600">
              CCCD: <span className="font-mono">{row.idNumber}</span> · Năm sinh: {row.yearOfBirth}
            </div>
            <div className="text-xs text-slate-500">{row.address}</div>
          </div>
        )}
      />

      <ConfirmDialog
        open={Boolean(deletingMember)}
        onOpenChange={(open) => !open && setDeletingMember(null)}
        title={`Xác nhận xóa thành viên ${deletingMember?.fullName ?? ''}?`}
        description={
          deletingMember
            ? `Mã thành viên: ${deletingMember.memberCode || 'Chưa cấp mã'} · CCCD: ${deletingMember.idNumber}. Nếu thành viên đang có khoản vay chưa tất toán, hệ thống sẽ từ chối xóa để bảo vệ an toàn tín dụng. Nếu đã từng có khoản vay đã tất toán, hệ thống sẽ áp dụng Xóa mềm (Soft Delete).`
            : undefined
        }
        confirmText="Xác nhận xóa thành viên"
        tone="danger"
        isLoading={deleteMemberMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
