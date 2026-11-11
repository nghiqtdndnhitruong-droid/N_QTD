import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CreditCard, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { LoanStatus } from '@/shared/types';
import {
  GENDER_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  LOAN_TERM_TYPE_LABELS,
  LOAN_TYPE_LABELS,
} from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND } from '@/shared/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescriptionItem,
  DescriptionList,
  LoanStatusBadge,
} from '@/components/ui';
import {
  Alert,
  ConfirmDialog,
  DetailPageSkeleton,
  EmptyState,
  ErrorState,
  notifyApiError,
  notifySuccess,
} from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import { useLoansList } from '@/features/loans/hooks/use-loans';
import { checkIdExpiryStatus } from '@/features/loans/utils/loan-warnings';
import { useDeleteMember, useMemberDetail } from '../hooks/use-members';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: member, isLoading, error, refetch } = useMemberDetail(id);
  const deleteMemberMutation = useDeleteMember();
  const { data: memberLoans } = useLoansList({
    page: 1,
    limit: 20,
    memberId: id,
  });

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !member) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const expiryStatus = checkIdExpiryStatus(member.idExpiry);

  const loans = memberLoans?.items ?? [];
  const activeLoans = loans.filter((l) => l.status !== LoanStatus.DA_TAT_TOAN);

  const handleConfirmDelete = async () => {
    try {
      const res = await deleteMemberMutation.mutateAsync({
        id: member.id,
        reason: 'Xóa từ màn hình chi tiết thành viên',
      });
      notifySuccess(
        res.deleteMode === 'SOFT_DELETE'
          ? `Đã xóa mềm thành viên ${res.fullName}`
          : `Đã xóa vĩnh viễn thành viên ${res.fullName}`,
      );
      setConfirmDeleteOpen(false);
      navigate('/members');
    } catch (err) {
      setConfirmDeleteOpen(false);
      notifyApiError(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={
          <Link
            to="/members"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Danh sách thành viên</span>
          </Link>
        }
        title={member.fullName}
        badge={
          member.memberCode ? (
            <Badge tone="primary" className="font-mono">
              {member.memberCode}
            </Badge>
          ) : (
            <Badge tone="warning">
              Chưa cấp mã
            </Badge>
          )
        }
        description={`Hồ sơ thành viên · Cập nhật lần cuối: ${formatDateVN(member.updatedAt)}`}
        actions={
          <>
            <Can perm="member:delete">
              <Button
                variant="outline"
                size="sm"
                className="border-danger-200 text-danger-600 hover:bg-danger-50"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Xóa thành viên
              </Button>
            </Can>
            <Can perm="member:update">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => navigate(`/members/${member.id}/edit`)}
              >
                Chỉnh sửa
              </Button>
            </Can>
            <Can perm="loan:create">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate(`/loans/new?memberId=${member.id}`)}
              >
                Lập hồ sơ vay cho thành viên này
              </Button>
            </Can>
          </>
        }
      />

      {expiryStatus?.isExpired && (
        <Alert
          tone="danger"
          title="Giấy tờ tùy thân của thành viên đã hết hạn"
        >
          Loại giấy tờ ({ID_DOCUMENT_TYPE_LABELS[member.idType]}) của thành viên {member.fullName} đã hết hạn vào ngày{' '}
          <strong>{formatDateVN(member.idExpiry)}</strong>. Vui lòng nhắc nhở thành viên làm thủ tục cấp đổi giấy tờ để đảm bảo tính pháp lý khi lập hồ sơ vay.
        </Alert>
      )}

      {expiryStatus?.isExpiringSoon && (
        <Alert
          tone="warning"
          title="Giấy tờ tùy thân của thành viên sắp hết hạn (< 6 tháng)"
        >
          Loại giấy tờ ({ID_DOCUMENT_TYPE_LABELS[member.idType]}) của thành viên {member.fullName} sẽ hết hạn vào ngày{' '}
          <strong>{formatDateVN(member.idExpiry)}</strong> (còn {expiryStatus.daysRemaining} ngày, dưới 6 tháng). Cán bộ lưu ý nhắc nhở thành viên kế hoạch gia hạn/cấp đổi giấy tờ.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Thông tin định danh & Địa bàn quản lý</CardTitle>
            <CardDescription>Thông tin pháp lý và địa bàn Tỉnh → Xã → Ấp của người vay</CardDescription>
          </div>
          {member.hamletName && member.communeName && (
            <Badge tone="info">
              <MapPin className="mr-1 h-3 w-3" />
              {member.hamletName} · {member.communeName} · {member.provinceName || 'Tỉnh Vĩnh Long'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <DescriptionList columns={3}>
            <DescriptionItem
              label="Mã thành viên"
              value={
                member.memberCode || (
                  <Badge tone="warning" className="text-xs font-normal">
                    Chưa cấp mã
                  </Badge>
                )
              }
              mono={Boolean(member.memberCode)}
            />
            <DescriptionItem label="Họ và tên" value={member.fullName} />
            <DescriptionItem
              label="Năm sinh / Giới tính"
              value={`${member.yearOfBirth} (${GENDER_LABELS[member.gender]})`}
            />
            <DescriptionItem label="Số điện thoại" value={member.phoneNumber || '—'} mono />
            <DescriptionItem label="Loại giấy tờ" value={ID_DOCUMENT_TYPE_LABELS[member.idType]} />
            <DescriptionItem label="Số giấy tờ" value={member.idNumber} mono />
            <DescriptionItem label="Ngày cấp" value={formatDateVN(member.idIssueDate)} mono />
            <DescriptionItem label="Nơi cấp" value={member.idIssuePlace} span={2} />
            <DescriptionItem
              label="Ngày hết hạn"
              value={
                member.idExpiry ? (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    {formatDateVN(member.idExpiry)}
                    {expiryStatus?.isExpired && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                        Đã hết hạn
                      </span>
                    )}
                    {expiryStatus?.isExpiringSoon && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                        Sắp hết hạn (&lt; 6th)
                      </span>
                    )}
                  </span>
                ) : (
                  'Không thời hạn'
                )
              }
              mono
            />
            <DescriptionItem
              label="Ấp / Khu phố"
              value={member.hamletName || '—'}
            />
            <DescriptionItem
              label="Xã quản lý"
              value={member.communeName || '—'}
            />
            <DescriptionItem
              label="Tỉnh / Thành phố"
              value={member.provinceName || '—'}
            />
            <DescriptionItem label="Địa chỉ thường trú đầy đủ" value={member.address} span={3} />
          </DescriptionList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lịch sử các khoản vay của thành viên ({loans.length})</CardTitle>
            <CardDescription>
              Bao gồm cả hồ sơ đang tạo, đang dư nợ và đã tất toán
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <EmptyState
              title="Thành viên chưa có khoản vay nào"
              description="Bạn có thể tạo hồ sơ khoản vay mới cho thành viên này ngay bây giờ."
              icon={<CreditCard className="h-6 w-6" />}
              action={
                <Can perm="loan:create">
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => navigate(`/loans/new?memberId=${member.id}`)}
                  >
                    Lập hồ sơ vay mới
                  </Button>
                </Can>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">Số khế ước</th>
                    <th className="px-4 py-2.5">Hình thức</th>
                    <th className="px-4 py-2.5">Kỳ hạn</th>
                    <th className="px-4 py-2.5 text-right">Số tiền vay</th>
                    <th className="px-4 py-2.5 text-right">Lãi suất</th>
                    <th className="px-4 py-2.5">Đáo hạn</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan) => (
                    <tr
                      key={loan.id}
                      onClick={() => navigate(`/loans/${loan.id}`)}
                      className="cursor-pointer hover:bg-primary-50/50"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-primary-700">
                        {loan.contractNumber || 'Chưa cấp số khế ước'}
                      </td>
                      <td className="px-4 py-3">{LOAN_TYPE_LABELS[loan.loanType]}</td>
                      <td className="px-4 py-3">{LOAN_TERM_TYPE_LABELS[loan.termType]}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatVND(loan.loanAmount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatInterestRate(loan.interestRate)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatDateVN(loan.maturityDate)}
                      </td>
                      <td className="px-4 py-3">
                        <LoanStatusBadge status={loan.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Xác nhận xóa thành viên ${member.fullName}${member.memberCode ? ` (${member.memberCode})` : ''}?`}
        description={
          activeLoans.length > 0
            ? `CẢNH BÁO: Thành viên này hiện có ${activeLoans.length} khoản vay chưa tất toán. Hệ thống sẽ chặn thao tác xóa cho đến khi các khoản vay được tất toán hoặc hủy.`
            : loans.length > 0
              ? `Thành viên này có ${loans.length} khoản vay đã tất toán trong lịch sử. Hệ thống sẽ áp dụng Xóa mềm (Soft Delete) để ẩn thành viên khỏi danh sách hoạt động nhưng vẫn bảo toàn lịch sử kiểm toán.`
              : 'Thành viên này chưa từng phát sinh hồ sơ vay nào. Hệ thống sẽ xóa vĩnh viễn bản ghi thành viên này.'
        }
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteMemberMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
