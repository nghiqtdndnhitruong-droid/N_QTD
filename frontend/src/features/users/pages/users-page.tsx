import { Check, Shield } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Alert } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type Permission,
  type UserRole,
} from '@/stores/auth.store';

const ALL_PERMISSIONS: { group: string; items: { code: Permission; label: string }[] }[] = [
  {
    group: 'Tổng quan & Báo cáo',
    items: [
      { code: 'dashboard:view', label: 'Xem Dashboard tổng quan' },
      { code: 'report:view', label: 'Xem báo cáo tín dụng' },
      { code: 'report:export', label: 'Xuất tệp Excel báo cáo & danh sách' },
      { code: 'document:print', label: 'In hợp đồng, khế ước, phiếu thu' },
    ],
  },
  {
    group: 'Thành viên & Hồ sơ vay',
    items: [
      { code: 'member:view', label: 'Tra cứu thành viên' },
      { code: 'member:create', label: 'Thêm thành viên mới' },
      { code: 'member:update', label: 'Cập nhật hồ sơ thành viên' },
      { code: 'loan:view', label: 'Xem danh sách & chi tiết khoản vay' },
      { code: 'loan:create', label: 'Lập hồ sơ khoản vay mới' },
      { code: 'loan:update', label: 'Cập nhật thông tin hồ sơ vay' },
      { code: 'loan:change-status', label: 'Chuyển trạng thái hồ sơ (Hoàn thành / Tất toán)' },
    ],
  },
  {
    group: 'Tài sản thế chấp, Giải ngân & Thu nợ',
    items: [
      { code: 'collateral:view', label: 'Xem tài sản thế chấp' },
      { code: 'collateral:create', label: 'Thêm tài sản thế chấp' },
      { code: 'collateral:update', label: 'Sửa tài sản thế chấp' },
      { code: 'collateral:delete', label: 'Xóa tài sản thế chấp' },
      { code: 'disbursement:create', label: 'Ghi nhận giải ngân vốn vay' },
      { code: 'repayment:create', label: 'Ghi nhận thu nợ gốc & lãi' },
    ],
  },
  {
    group: 'Danh mục & Quản trị hệ thống',
    items: [
      { code: 'interest-rate:view', label: 'Xem bảng lãi suất' },
      { code: 'interest-rate:create', label: 'Ban hành bảng lãi suất mới' },
      { code: 'asset-pricing:view', label: 'Xem bảng giá đất' },
      { code: 'asset-pricing:create', label: 'Thêm quy định đơn giá đất' },
      { code: 'asset-pricing:update', label: 'Cập nhật đơn giá đất' },
      { code: 'user:manage', label: 'Quản lý tài khoản cán bộ' },
      { code: 'role:manage', label: 'Cấu hình phân quyền RBAC' },
    ],
  },
];

const ROLES: UserRole[] = ['CREDIT_OFFICER', 'ADMIN'];

export function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Người dùng & Ma trận Phân quyền (RBAC)"
        badge={<Badge tone="warning">MOCK MODULE</Badge>}
        description="Cấu hình vai trò Cán bộ tín dụng và Quản trị hệ thống theo mô hình quyền module:action."
      />

      <Alert tone="info" title="Module Quản trị người dùng đang chạy với dữ liệu mô phỏng [MOCK]">
        Backend hiện chưa có bảng <code>users</code> và <code>roles</code>. Ma trận dưới đây phản
        ánh chính xác bộ quyền RBAC mà Frontend đang áp dụng qua <code>&lt;Can&gt;</code> và{' '}
        <code>&lt;RequirePermission&gt;</code>.
      </Alert>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Ma trận Phân quyền theo Vai trò (RBAC Matrix)</CardTitle>
            <CardDescription>
              So sánh quyền hạn giữa Cán bộ tín dụng và Quản trị hệ thống
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nhóm / Quyền hạn</th>
                  <th className="px-4 py-3">Mã quyền (Code)</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary-600" />
                        <span>{ROLE_LABELS[role]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ALL_PERMISSIONS.map((group) =>
                  group.items.map((perm, idx) => (
                    <tr key={perm.code}>
                      <td className="px-4 py-2.5">
                        {idx === 0 && (
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">
                            {group.group}
                          </div>
                        )}
                        <div className="font-medium text-slate-800">{perm.label}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{perm.code}</td>
                      {ROLES.map((role) => {
                        const granted = ROLE_PERMISSIONS[role].includes(perm.code);
                        return (
                          <td key={role} className="px-4 py-2.5 text-center">
                            {granted ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-100 text-success-700">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

