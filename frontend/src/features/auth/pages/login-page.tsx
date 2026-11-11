import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ConfigProvider, Form, Input, Button, Alert, theme } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/query';
import { notifySuccess } from '@/components/feedback';
import { loginApi, type LoginPayload } from '../api/auth.api';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [form] = Form.useForm<LoginPayload>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: LoginPayload) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const session = await loginApi({
        username: values.username.trim(),
        password: values.password,
      });

      queryClient.clear();
      setSession({ accessToken: session.accessToken, user: session.user });
      notifySuccess(`Xin chào, ${session.user.fullName}`, session.user.title);

      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#2e67b2',
          colorBgContainer: '#0c213f',
          colorBgElevated: '#112c52',
          colorBorder: '#1c3d69',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'Inter Variable, Inter, sans-serif',
        },
      }}
    >
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#06111f] via-[#091b33] to-[#0f284d] px-4 py-12 sm:px-6 lg:px-8">
        {/* Subtle decorative background lights */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-400/10 blur-[140px]" />

        <div className="relative w-full max-w-md">
          {/* Header & Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-900/50">
              <BankOutlined className="text-2xl" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              QUỸ TÍN DỤNG NHÂN DÂN
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
              Hệ thống Quản lý Nghiệp vụ Tín dụng
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-700/60 bg-[#0b1f3a]/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-slate-100">Đăng nhập tài khoản</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Nhập thông tin xác thực được cấp để truy cập hệ thống
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5">
                <Alert
                  type="error"
                  message={errorMessage}
                  showIcon
                  closable
                  onClose={() => setErrorMessage(null)}
                />
              </div>
            )}

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
              autoComplete="off"
              className="space-y-4"
            >
              <Form.Item
                name="username"
                label={<span className="text-xs font-medium text-slate-300">Tên đăng nhập</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined className="text-slate-400" />}
                  placeholder="Nhập tên đăng nhập"
                  autoFocus
                  disabled={loading}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs font-medium text-slate-300">Mật khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="Nhập mật khẩu"
                  disabled={loading}
                />
              </Form.Item>

              <Form.Item className="pt-2 mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  icon={!loading && <ArrowRightOutlined />}
                  className="h-11 font-medium shadow-md shadow-primary-900/40"
                >
                  {loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Hệ thống an toàn & bảo mật nội bộ Quỹ tín dụng nhân dân
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
