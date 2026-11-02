import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DescriptionItem,
  DescriptionList,
} from '@/components/ui';
import { FormTextField } from '@/components/form';
import { notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout/page-header';
import { useAuthStore } from '@/stores/auth.store';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(8, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 300));
    notifySuccess('Đã cập nhật mật khẩu thành công');
    reset();
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông tin tài khoản"
        description="Xem thông tin cán bộ, danh sách quyền được cấp và đổi mật khẩu đăng nhập."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Hồ sơ cán bộ</CardTitle>
              <CardDescription>Thông tin định danh và phân quyền hiện tại</CardDescription>
            </div>
            <Badge tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              {user.title}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <DescriptionList columns={2}>
              <DescriptionItem label="Họ và tên" value={user.fullName} />
              <DescriptionItem label="Tên đăng nhập" value={user.username} mono />
              <DescriptionItem label="Chức danh" value={user.title} />
              <DescriptionItem label="Vai trò hệ thống" value={user.roles.join(', ')} mono />
            </DescriptionList>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quyền hạn được cấp ({user.permissions.length})
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {user.permissions.map((perm) => (
                  <Badge key={perm} tone="neutral" className="font-mono text-[11px]">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardHeader>
              <div>
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription>Sử dụng mật khẩu mạnh từ 8 ký tự trở lên</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormTextField
                control={control}
                name="currentPassword"
                type="password"
                label="Mật khẩu hiện tại"
                required
              />
              <FormTextField
                control={control}
                name="newPassword"
                type="password"
                label="Mật khẩu mới"
                required
              />
              <FormTextField
                control={control}
                name="confirmPassword"
                type="password"
                label="Nhập lại mật khẩu mới"
                required
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<KeyRound className="h-4 w-4" />}
              >
                Cập nhật mật khẩu
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

