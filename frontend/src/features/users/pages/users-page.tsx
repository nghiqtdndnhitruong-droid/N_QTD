import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Check,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Unlock,
  UserCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui';
import { FormDateField, FormSelectField, FormTextField } from '@/components/form';
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type AuthUser,
  type Permission,
  type UserRole,
} from '@/stores/auth.store';
import {
  useCreateUser,
  useResetUserPassword,
  useUpdateUser,
  useUpdateUserStatus,
  useUsersList,
} from '../hooks/use-users';
import {
  getCanonicalIdIssuePlace,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';

const ID_DOCUMENT_TYPE_OPTIONS = [
  { value: 'CAN_CUOC_CONG_DAN', label: 'Căn cước công dân' },
  { value: 'CAN_CUOC', label: 'Căn cước' },
] as const;

const GENDER_OPTIONS = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
] as const;

const currentYear = new Date().getFullYear();

const userFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Chỉ gồm chữ cái, số, gạch dưới')
    .optional(),
  password: z
    .string()
    .min(6, 'Mật khẩu khởi tạo tối thiểu 6 ký tự')
    .optional()
    .or(z.literal('')),
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  idType: z.enum(['CAN_CUOC_CONG_DAN', 'CAN_CUOC']),
  idNumber: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: 'Số Căn cước / CCCD phải đúng 12 chữ số',
    }),
  idIssueDate: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      },
      { message: 'Ngày cấp không hợp lệ hoặc lớn hơn ngày hiện tại' }
    ),
  idIssuePlace: z.string().trim().max(255),
  yearOfBirth: z.coerce.number().int().min(1900).max(currentYear),
  gender: z.enum(['NAM', 'NU']),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const resetPasswordFormSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

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
      { code: 'user:view', label: 'Xem danh sách tài khoản cán bộ' },
      { code: 'user:manage', label: 'Quản lý tài khoản cán bộ (thêm, sửa, khóa)' },
      { code: 'role:manage', label: 'Cấu hình phân quyền RBAC' },
    ],
  },
];

const ROLES: UserRole[] = ['CREDIT_OFFICER', 'ADMIN'];

export function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'LOCKED' | ''>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  // Modal reset password & lock confirm
  const [resetPwdUser, setResetPwdUser] = useState<AuthUser | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<AuthUser | null>(null);

  const { data, isLoading } = useUsersList({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const resetPasswordMutation = useResetUserPassword();

  const [isGenderManuallyChanged, setIsGenderManuallyChanged] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      idType: 'CAN_CUOC_CONG_DAN',
      idNumber: '',
      idIssueDate: '',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      yearOfBirth: 1990,
      gender: 'NAM',
    },
  });

  const {
    control: pwdControl,
    handleSubmit: handlePwdSubmit,
    reset: resetPwdForm,
    formState: { isSubmitting: isSubmittingPwd },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: '' },
  });

  const handleOpenCreateDrawer = () => {
    setEditingUser(null);
    setIsGenderManuallyChanged(false);
    reset({
      username: '',
      password: '',
      fullName: '',
      idType: 'CAN_CUOC_CONG_DAN',
      idNumber: '',
      idIssueDate: '',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      yearOfBirth: 1990,
      gender: 'NAM',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (u: AuthUser) => {
    setEditingUser(u);
    setIsGenderManuallyChanged(false);
    reset({
      username: u.username,
      password: '',
      fullName: u.profile?.fullName || u.fullName,
      idType: u.profile?.idType || 'CAN_CUOC_CONG_DAN',
      idNumber: u.profile?.idNumber || '',
      idIssueDate: u.profile?.idIssueDate ? u.profile.idIssueDate.slice(0, 10) : '',
      idIssuePlace: u.profile?.idIssuePlace || getCanonicalIdIssuePlace(u.profile?.idType),
      yearOfBirth: u.profile?.yearOfBirth || 1990,
      gender: (u.profile?.gender as 'NAM' | 'NU') || 'NAM',
    });
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'gender') {
        setIsGenderManuallyChanged(true);
      } else if (name === 'idType') {
        const newType = value.idType as 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
        if (newType) {
          setValue('idIssuePlace', getCanonicalIdIssuePlace(newType), { shouldValidate: true });
          if (value.idNumber) {
            const parsed = parseCitizenIdInfo(value.idNumber);
            if (parsed) {
              if (!isGenderManuallyChanged && parsed.gender) {
                setValue('gender', parsed.gender as 'NAM' | 'NU', { shouldValidate: true });
              }
              if (parsed.yearOfBirth) {
                setValue('yearOfBirth', parsed.yearOfBirth, { shouldValidate: true });
              }
            }
          }
        }
      } else if (name === 'idNumber') {
        const idType = value.idType;
        if ((idType === 'CAN_CUOC_CONG_DAN' || idType === 'CAN_CUOC') && value.idNumber) {
          const parsed = parseCitizenIdInfo(value.idNumber);
          if (parsed) {
            if (!isGenderManuallyChanged && parsed.gender) {
              setValue('gender', parsed.gender as 'NAM' | 'NU', { shouldValidate: true });
            }
            if (parsed.yearOfBirth) {
              setValue('yearOfBirth', parsed.yearOfBirth, { shouldValidate: true });
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, isGenderManuallyChanged]);

  const onUserFormSubmit = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        // Cập nhật
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          payload: {
            fullName: values.fullName.trim(),
            idType: values.idType,
            idNumber: values.idNumber || null,
            idIssueDate: values.idIssueDate || null,
            idIssuePlace: values.idIssuePlace || null,
            yearOfBirth: values.yearOfBirth || null,
            gender: values.gender || null,
          },
        });
        notifySuccess(`Cập nhật thông tin cán bộ ${values.fullName} thành công`);
      } else {
        // Tạo mới
        if (!values.username) {
          notifyError('Vui lòng nhập tên đăng nhập');
          return;
        }
        if (!values.password) {
          notifyError('Vui lòng nhập mật khẩu khởi tạo');
          return;
        }
        await createUserMutation.mutateAsync({
          username: values.username.trim(),
          password: values.password,
          fullName: values.fullName.trim(),
          idType: values.idType,
          idNumber: values.idNumber || null,
          idIssueDate: values.idIssueDate || null,
          idIssuePlace: values.idIssuePlace || null,
          yearOfBirth: values.yearOfBirth || null,
          gender: values.gender || null,
        });
        notifySuccess(`Tạo tài khoản cán bộ ${values.username} thành công`);
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      notifyError(err?.message || 'Thao tác không thành công');
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!statusTargetUser) return;
    const nextStatus = statusTargetUser.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
      await updateStatusMutation.mutateAsync({
        id: statusTargetUser.id,
        status: nextStatus,
      });
      notifySuccess(
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản [${statusTargetUser.username}]`
          : `Đã mở khóa tài khoản [${statusTargetUser.username}]`
      );
      setStatusTargetUser(null);
    } catch (err: any) {
      notifyError(err?.message || 'Không thể thay đổi trạng thái tài khoản');
    }
  };

  const onResetPasswordSubmit = async (values: ResetPasswordFormValues) => {
    if (!resetPwdUser) return;
    try {
      await resetPasswordMutation.mutateAsync({
        id: resetPwdUser.id,
        newPassword: values.newPassword,
      });
      notifySuccess(`Đặt lại mật khẩu cho tài khoản ${resetPwdUser.username} thành công`);
      setResetPwdUser(null);
      resetPwdForm();
    } catch (err: any) {
      notifyError(err?.message || 'Không thể đặt lại mật khẩu');
    }
  };

  const usersList = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tài khoản & Phân quyền Cán bộ"
        description="Quản lý danh sách tài khoản cán bộ tín dụng, hồ sơ pháp lý và kiểm soát quyền truy cập hệ thống."
        actions={
          <Button
            type="button"
            onClick={handleOpenCreateDrawer}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Thêm tài khoản cán bộ
          </Button>
        }
      />

      {/* Bộ lọc và Danh sách tài khoản */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Danh sách cán bộ tín dụng
              </CardTitle>
              <CardDescription>
                Tổng số {data?.pagination?.total ?? usersList.length} tài khoản trong hệ thống
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên, username, CCCD..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-60 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-primary-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tên đăng nhập</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">CCCD & Năm sinh</th>
                  <th className="px-4 py-3">Đăng nhập cuối</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                      Đang tải danh sách tài khoản...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                      Không tìm thấy tài khoản cán bộ nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isLocked = u.status === 'LOCKED';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {u.username}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {u.profile?.fullName || u.fullName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={isAdmin ? 'primary' : 'info'}
                            icon={isAdmin ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          >
                            {ROLE_LABELS[u.role || (isAdmin ? 'ADMIN' : 'CREDIT_OFFICER')]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={isLocked ? 'danger' : 'success'}>
                            {isLocked ? 'Bị khóa' : 'Hoạt động'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {u.profile?.idNumber ? (
                            <div>
                              <span>{u.profile.idNumber}</span>
                              {u.profile.yearOfBirth && (
                                <span className="ml-1 text-slate-400">({u.profile.yearOfBirth})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDrawer(u)}
                              title="Sửa thông tin hồ sơ"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            </Button>

                            {!isAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusTargetUser(u)}
                                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                {isLocked ? (
                                  <Unlock className="h-3.5 w-3.5 text-success-600" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-danger-600" />
                                )}
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResetPwdUser(u);
                                resetPwdForm({ newPassword: '' });
                              }}
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ma trận Phân quyền theo Vai trò */}
      <Card className="shadow-sm">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Ma trận Phân quyền theo Vai trò (RBAC Matrix)
            </CardTitle>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer: Thêm mới / Cập nhật tài khoản cán bộ */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-xl">
          <DrawerHeader
            title={editingUser ? `Chỉnh sửa thông tin: ${editingUser.username}` : 'Thêm tài khoản cán bộ mới'}
            description={
              editingUser
                ? 'Cập nhật thông tin định danh và hồ sơ cán bộ tín dụng'
                : 'Khởi tạo tài khoản riêng biệt và hồ sơ cho cán bộ sử dụng hệ thống'
            }
          />

          <form onSubmit={handleSubmit(onUserFormSubmit)} noValidate className="flex flex-1 flex-col justify-between">
            <DrawerBody className="space-y-4">
              {!editingUser && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormTextField
                    control={control}
                    name="username"
                    label="Tên đăng nhập"
                    required
                    placeholder="Ví dụ: cbtd_an"
                  />
                  <FormTextField
                    control={control}
                    name="password"
                    type="password"
                    label="Mật khẩu khởi tạo"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              <FormTextField
                control={control}
                name="fullName"
                label="Họ và tên cán bộ"
                required
                placeholder="Ví dụ: Nguyễn Văn An"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectField
                  control={control}
                  name="idType"
                  label="Loại giấy tờ"
                  required
                  options={ID_DOCUMENT_TYPE_OPTIONS}
                />

                <FormTextField
                  control={control}
                  name="idNumber"
                  label="Số Căn cước / CCCD"
                  required
                  placeholder="Nhập 12 chữ số"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormDateField
                  control={control}
                  name="idIssueDate"
                  label="Ngày cấp"
                  required
                  placeholder="dd/mm/yyyy"
                />

                <FormTextField
                  control={control}
                  name="idIssuePlace"
                  label="Nơi cấp"
                  required
                  placeholder="Cục CSQLHC về TTXH hoặc Bộ Công An"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormTextField
                  control={control}
                  name="yearOfBirth"
                  label="Năm sinh"
                  required
                  type="number"
                  placeholder="Ví dụ: 1990"
                />

                <FormSelectField
                  control={control}
                  name="gender"
                  label="Giới tính"
                  required
                  options={GENDER_OPTIONS}
                />
              </div>
            </DrawerBody>

            <DrawerFooter className="border-t border-slate-100 bg-slate-50/40">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsDrawerOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Modal: Đặt lại mật khẩu */}
      <Dialog open={!!resetPwdUser} onOpenChange={(open) => !open && setResetPwdUser(null)}>
        <DialogContent>
          <DialogHeader>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Đặt lại mật khẩu cho tài khoản: {resetPwdUser?.username}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Nhập mật khẩu mới cho cán bộ. Cán bộ sẽ dùng mật khẩu này để đăng nhập.
              </p>
            </div>
          </DialogHeader>

          <form onSubmit={handlePwdSubmit(onResetPasswordSubmit)} noValidate>
            <DialogBody className="space-y-4 py-4">
              <FormTextField
                control={pwdControl}
                name="newPassword"
                type="password"
                label="Mật khẩu mới"
                required
                placeholder="Tối thiểu 6 ký tự"
              />
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingPwd}
                onClick={() => setResetPwdUser(null)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" isLoading={isSubmittingPwd} leftIcon={<KeyRound className="h-4 w-4" />}>
                Cập nhật mật khẩu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm: Khóa / Mở khóa tài khoản */}
      <ConfirmDialog
        open={!!statusTargetUser}
        onOpenChange={(open) => !open && setStatusTargetUser(null)}
        title={
          statusTargetUser?.status === 'LOCKED'
            ? `Mở khóa tài khoản: ${statusTargetUser?.username}?`
            : `Khóa tài khoản: ${statusTargetUser?.username}?`
        }
        description={
          statusTargetUser?.status === 'LOCKED'
            ? 'Cán bộ sẽ có thể đăng nhập và tiếp tục thực hiện nghiệp vụ tín dụng bình thường.'
            : 'Khi bị khóa, cán bộ sẽ không thể đăng nhập vào hệ thống. Mọi dữ liệu hồ sơ và lịch sử nghiệp vụ vẫn được bảo toàn nguyên vẹn.'
        }
        confirmText={statusTargetUser?.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
        tone={statusTargetUser?.status === 'LOCKED' ? 'primary' : 'danger'}
        isLoading={updateStatusMutation.isPending}
        onConfirm={handleToggleStatusConfirm}
      />
    </div>
  );
}
