import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { applyServerErrorsToForm } from '@/lib/http';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { Card, CardContent } from '@/components/ui';
import {
  ConfirmDialog,
  DetailPageSkeleton,
  ErrorState,
  notifyApiError,
  notifySuccess,
} from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { MemberForm } from '../components/member-form';
import { useCreateMember, useMemberDetail, useUpdateMember } from '../hooks/use-members';

export function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [isDirty, setIsDirty] = useState(false);
  const guard = useUnsavedChangesGuard(isDirty);

  const { data: member, isLoading, error, refetch } = useMemberDetail(id);
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember(id ?? '');

  if (isEdit && isLoading) {
    return <DetailPageSkeleton />;
  }

  if (isEdit && error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backLink={
          <Link
            to={isEdit ? `/members/${id}` : '/members'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isEdit ? 'Quay lại chi tiết thành viên' : 'Quay lại danh sách thành viên'}</span>
          </Link>
        }
        title={isEdit ? `Chỉnh sửa thành viên: ${member?.fullName ?? ''}` : 'Thêm hồ sơ thành viên mới'}
        description="Các trường đánh dấu (*) là bắt buộc. Hệ thống tự động kiểm tra trùng lặp Mã thành viên và Số CCCD."
      />

      <Card>
        <CardContent className="p-6">
          <MemberForm
            initialData={member}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            submitLabel={isEdit ? 'Cập nhật thành viên' : 'Tạo hồ sơ thành viên'}
            onDirtyChange={setIsDirty}
            onCancel={() => navigate(isEdit ? `/members/${id}` : '/members')}
            onSubmit={async (values, setError) => {
              try {
                if (isEdit && id) {
                  await updateMutation.mutateAsync(values);
                  setIsDirty(false);
                  notifySuccess('Đã cập nhật thông tin thành viên');
                  navigate(`/members/${id}`);
                } else {
                  const created = await createMutation.mutateAsync(values);
                  setIsDirty(false);
                  notifySuccess(`Đã tạo thành viên ${created.fullName}`);
                  navigate(`/members/${created.id}`);
                }
              } catch (err) {
                if (!applyServerErrorsToForm(err, setError)) {
                  notifyApiError(err);
                }
              }
            }}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={guard.isBlocked}
        onOpenChange={(open) => !open && guard.reset()}
        title="Rời trang khi chưa lưu thay đổi?"
        description="Thông tin bạn vừa nhập trong biểu mẫu chưa được lưu. Nếu rời trang ngay bây giờ, các thay đổi sẽ bị mất."
        confirmText="Rời trang"
        cancelText="Ở lại tiếp tục nhập"
        tone="danger"
        onConfirm={guard.proceed}
      />
    </div>
  );
}

