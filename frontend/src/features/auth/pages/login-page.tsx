import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router';
import { Landmark, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { env } from '@/config/env';
import { Button } from '@/components/ui';
import { FormTextField } from '@/components/form';
import { Alert, notifyError, notifySuccess } from '@/components/feedback';
import { useAuthStore } from '@/stores/auth.store';
import { loginApi } from '../api/auth.api';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      username: 'cbtd',
      password: 'Password@123',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const session = await loginApi(values);
      setSession({ accessToken: session.accessToken, user: session.user });
      notifySuccess(`Xin chào, ${session.user.fullName}`, session.user.title);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect, { replace: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    }
  };

  const fillDemoAccount = (username: 'cbtd' | 'admin') => {
    setValue('username', username, { shouldValidate: true });
    setValue('password', 'Password@123', { shouldValidate: true });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-900 text-white shadow-sm">
            <Landmark className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary-900">
              QUỸ TÍN DỤNG NHÂN DÂN
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Hệ thống Quản lý Nghiệp vụ Tín dụng
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">Đăng nhập hệ thống</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Nhập tài khoản cán bộ được cấp để truy cập nghiệp vụ
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormTextField
              control={control}
              name="username"
              label="Tên đăng nhập"
              required
              autoComplete="username"
              placeholder="Ví dụ: cbtd hoặc admin"
            />

            <FormTextField
              control={control}
              name="password"
              type="password"
              label="Mật khẩu"
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Đang xác thực..."
              leftIcon={<Lock className="h-4 w-4" />}
              className="w-full"
            >
              Đăng nhập
            </Button>
          </form>

          {env.enableMock && (
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
              <Alert tone="warning" title="Chế độ xác thực mô phỏng [MOCK AUTH]">
                Backend hiện chưa có module <code>/auth</code>. Chọn nhanh một vai trò dưới đây để
                kiểm thử phân quyền giao diện:
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<UserCheck className="h-3.5 w-3.5 text-primary-600" />}
                  onClick={() => fillDemoAccount('cbtd')}
                >
                  Cán bộ tín dụng
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-amber-600" />}
                  onClick={() => fillDemoAccount('admin')}
                >
                  Quản trị (Admin)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

