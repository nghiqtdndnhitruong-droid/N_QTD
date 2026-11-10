import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck, Save, RotateCcw } from 'lucide-react';
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
import { FormDateField, FormSelectField, FormTextField } from '@/components/form';
import { notifyError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout/page-header';
import { useAuthStore, type UserProfileData } from '@/stores/auth.store';
import {
  getProfileApi,
  updateProfileApi,
  changePasswordApi,
  type UpdateProfilePayload,
} from '../api/auth.api';
import {
  parseCitizenIdInfo,
  getCanonicalIdIssuePlace,
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

const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .transform((val) => val.replace(/\s+/g, ' ')),
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
      { message: 'Ngày cấp không được lớn hơn ngày hiện tại' }
    ),
  idIssuePlace: z.string().trim().max(255),
  yearOfBirth: z
    .coerce
    .number()
    .int('Năm sinh phải là số nguyên')
    .min(1900, 'Năm sinh không hợp lệ')
    .max(currentYear, `Năm sinh không được vượt quá năm ${currentYear}`),
  gender: z.enum(['NAM', 'NU']),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(8, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);

  const [initialProfile, setInitialProfile] = useState<ProfileFormValues>({
    fullName: user?.profile?.fullName || user?.fullName || '',
    idType: user?.profile?.idType || 'CAN_CUOC_CONG_DAN',
    idNumber: user?.profile?.idNumber || '',
    idIssueDate: user?.profile?.idIssueDate || '',
    idIssuePlace: user?.profile?.idIssuePlace || 'Cục CSQLHC về TTXH',
    yearOfBirth: user?.profile?.yearOfBirth || 1990,
    gender: (user?.profile?.gender as 'NAM' | 'NU') || 'NAM',
  });

  const [isGenderManuallyChanged, setIsGenderManuallyChanged] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onTouched',
    defaultValues: initialProfile,
  });

  // Tải dữ liệu hồ sơ mới nhất từ Backend khi vào trang
  useEffect(() => {
    let mounted = true;
    getProfileApi()
      .then((data) => {
        if (!mounted) return;
        const formatted: ProfileFormValues = {
          fullName: data.fullName || user?.fullName || '',
          idType: data.idType || 'CAN_CUOC_CONG_DAN',
          idNumber: data.idNumber || '',
          idIssueDate: data.idIssueDate ? data.idIssueDate.slice(0, 10) : '',
          idIssuePlace: data.idIssuePlace || getCanonicalIdIssuePlace(data.idType),
          yearOfBirth: data.yearOfBirth || 1990,
          gender: (data.gender as 'NAM' | 'NU') || 'NAM',
        };
        setInitialProfile(formatted);
        reset(formatted);
      })
      .catch((_err) => {
        // Fallback về dữ liệu authStore
        if (!mounted) return;
        if (user?.profile) {
          const fallback: ProfileFormValues = {
            fullName: user.profile.fullName || user.fullName,
            idType: user.profile.idType || 'CAN_CUOC_CONG_DAN',
            idNumber: user.profile.idNumber || '',
            idIssueDate: user.profile.idIssueDate ? user.profile.idIssueDate.slice(0, 10) : '',
            idIssuePlace: user.profile.idIssuePlace || 'Cục CSQLHC về TTXH',
            yearOfBirth: user.profile.yearOfBirth || 1990,
            gender: (user.profile.gender as 'NAM' | 'NU') || 'NAM',
          };
          setInitialProfile(fallback);
          reset(fallback);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user, reset]);

  // Tự động nhận diện giới tính và năm sinh từ số Căn cước
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'gender') {
        setIsGenderManuallyChanged(true);
      } else if (name === 'idType') {
        const newType = value.idType as 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
        if (newType) {
          setValue('idIssuePlace', getCanonicalIdIssuePlace(newType), {
            shouldValidate: true,
            shouldDirty: true,
          });
          if (value.idNumber) {
            const parsed = parseCitizenIdInfo(value.idNumber);
            if (parsed) {
              if (!isGenderManuallyChanged && parsed.gender) {
                setValue('gender', parsed.gender as 'NAM' | 'NU', {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
              if (parsed.yearOfBirth) {
                setValue('yearOfBirth', parsed.yearOfBirth, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
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
              setValue('gender', parsed.gender as 'NAM' | 'NU', {
                shouldValidate: true,
                shouldDirty: true,
              });
            }
            if (parsed.yearOfBirth) {
              setValue('yearOfBirth', parsed.yearOfBirth, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, isGenderManuallyChanged]);

  // Form Đổi mật khẩu
  const {
    control: pwdControl,
    handleSubmit: handlePwdSubmit,
    reset: resetPwdForm,
    formState: { isSubmitting: isSubmittingPwd },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Lưu hồ sơ cá nhân
  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      const payload: UpdateProfilePayload = {
        fullName: values.fullName.trim(),
        idType: values.idType,
        idNumber: values.idNumber ? values.idNumber.trim() : null,
        idIssueDate: values.idIssueDate || null,
        idIssuePlace: values.idIssuePlace ? values.idIssuePlace.trim() : null,
        yearOfBirth: values.yearOfBirth || null,
        gender: values.gender || null,
      };

      const res = await updateProfileApi(payload);
      const updatedData: UserProfileData = {
        fullName: res.fullName,
        idType: res.idType,
        idNumber: res.idNumber,
        idIssueDate: res.idIssueDate,
        idIssuePlace: res.idIssuePlace,
        yearOfBirth: res.yearOfBirth,
        gender: res.gender,
      };

      updateUserProfile(updatedData);
      setInitialProfile(values);
      reset(values);
      setIsGenderManuallyChanged(false);
      notifySuccess('Lưu thông tin hồ sơ cá nhân thành công');
    } catch (err: any) {
      notifyError(err?.message || 'Không thể lưu hồ sơ cá nhân. Vui lòng thử lại.');
    }
  };

  // Hủy bỏ thay đổi
  const handleCancel = () => {
    reset(initialProfile);
    setIsGenderManuallyChanged(false);
  };

  // Đổi mật khẩu
  const onPasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePasswordApi({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notifySuccess('Đã cập nhật mật khẩu đăng nhập thành công');
      resetPwdForm();
    } catch (err: any) {
      notifyError(err?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ cán bộ tín dụng"
        description="Xem và quản lý thông tin định danh cá nhân, phân quyền hệ thống và bảo mật tài khoản."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI (2/3): Form cập nhật 7 trường hồ sơ cá nhân */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Thông tin hồ sơ cá nhân
                </CardTitle>
                <CardDescription>
                  Thông tin phục vụ định danh và ký kết văn bản nghiệp vụ tín dụng
                </CardDescription>
              </div>
              <Badge tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {user.title}
              </Badge>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit(onProfileSubmit)} noValidate>
            <CardContent className="space-y-5">
              {/* 1. Họ và tên */}
              <FormTextField
                control={control}
                name="fullName"
                label="Họ và tên"
                required
                placeholder="Ví dụ: Nguyễn Văn A"
              />

              {/* 2. Loại giấy tờ & 3. Số giấy tờ */}
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

              {/* 4. Ngày cấp & 5. Nơi cấp */}
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

              {/* 6. Năm sinh & 7. Giới tính */}
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

              {/* Thông tin tài khoản định danh (chỉ đọc) */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <DescriptionList columns={2}>
                  <DescriptionItem label="Tên đăng nhập" value={user.username} mono />
                  <DescriptionItem label="Vai trò hệ thống" value={user.roles.join(', ')} mono />
                </DescriptionList>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/40 py-3.5">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || !isDirty}
                onClick={handleCancel}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Hủy bỏ
              </Button>

              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !isDirty}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Lưu thay đổi
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* CỘT PHẢI (1/3): Đổi mật khẩu & Quyền hạn */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <form onSubmit={handlePwdSubmit(onPasswordSubmit)} noValidate>
              <CardHeader>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Đổi mật khẩu</CardTitle>
                  <CardDescription>Cập nhật mật khẩu bảo vệ tài khoản</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormTextField
                  control={pwdControl}
                  name="currentPassword"
                  type="password"
                  label="Mật khẩu hiện tại"
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                />
                <FormTextField
                  control={pwdControl}
                  name="newPassword"
                  type="password"
                  label="Mật khẩu mới"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                />
                <FormTextField
                  control={pwdControl}
                  name="confirmPassword"
                  type="password"
                  label="Xác nhận mật khẩu mới"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                />
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/40 py-3.5">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmittingPwd}
                  leftIcon={<KeyRound className="h-4 w-4" />}
                >
                  Cập nhật mật khẩu
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Card Quyền hạn */}
          <Card className="shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Quyền hạn được cấp ({user.permissions.length})
                </CardTitle>
                <CardDescription>Các thao tác bạn được phép thực hiện trên hệ thống</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {user.permissions.map((perm) => (
                  <Badge key={perm} tone="neutral" className="font-mono text-[10px]">
                    {perm}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
