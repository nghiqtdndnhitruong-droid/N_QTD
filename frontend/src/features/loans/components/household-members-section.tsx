import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Gender, IdDocumentType } from '@/shared/types';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN } from '@/shared/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui';
import {
  FormDateField,
  FormNumberField,
  FormSelectField,
  FormTextField,
} from '@/components/form';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import {
  getCanonicalIdIssuePlace,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';
import { useUpdateLoan } from '../hooks/use-loans';
import {
  householdMemberFormSchema,
  type HouseholdMemberFormValues,
} from '../schemas/loan.schema';
import type { HouseholdMember } from '../types/loan.types';

const ID_DOCUMENT_OPTIONS = [
  { value: IdDocumentType.CAN_CUOC_CONG_DAN, label: 'Căn cước công dân (12 số)' },
  { value: IdDocumentType.CAN_CUOC, label: 'Căn cước (mẫu mới)' },
];

const GENDER_OPTIONS = [
  { value: Gender.NAM, label: 'Nam' },
  { value: Gender.NU, label: 'Nữ' },
];

export interface HouseholdMembersSectionProps {
  loanId: string;
  householdMembers?: HouseholdMember[] | null;
  readOnly?: boolean;
  borrowerAddress?: string;
}

export function HouseholdMembersSection({
  loanId,
  householdMembers = [],
  readOnly = false,
  borrowerAddress = '',
}: HouseholdMembersSectionProps) {
  const currentMembers = householdMembers ?? [];
  const updateLoanMutation = useUpdateLoan(loanId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<HouseholdMemberFormValues>({
    resolver: zodResolver(householdMemberFormSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      idNumber: '',
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      yearOfBirth: undefined,
      gender: Gender.NAM,
      idIssueDate: '',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      address: '',
    },
  });

  const watchedIdNumber = useWatch({ control, name: 'idNumber' });
  const watchedIdType = useWatch({ control, name: 'idType' });

  // Tự động nhận diện năm sinh và giới tính khi nhập đủ 12 số CCCD
  useEffect(() => {
    if (watchedIdNumber && watchedIdNumber.length === 12) {
      const parsed = parseCitizenIdInfo(watchedIdNumber);
      if (parsed) {
        setValue('gender', parsed.gender, { shouldValidate: true, shouldDirty: true });
        setValue('yearOfBirth', parsed.yearOfBirth, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedIdNumber, setValue]);

  // Tự động điền nơi cấp chuẩn theo loại giấy tờ (CAN_CUOC: Bộ Công An, CAN_CUOC_CONG_DAN: Cục CSQLHC về TTXH)
  useEffect(() => {
    if (watchedIdType) {
      setValue('idIssuePlace', getCanonicalIdIssuePlace(watchedIdType), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedIdType, setValue]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      fullName: '',
      idNumber: '',
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      yearOfBirth: undefined,
      gender: Gender.NAM,
      idIssueDate: '',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      address: borrowerAddress || '',
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = currentMembers[index];
    if (!item) return;
    setEditingIndex(index);
    reset({
      fullName: item.fullName,
      idNumber: item.idNumber,
      idType: item.idType ?? IdDocumentType.CAN_CUOC_CONG_DAN,
      yearOfBirth: item.yearOfBirth,
      gender: item.gender ?? Gender.NAM,
      idIssueDate: item.idIssueDate ? item.idIssueDate.slice(0, 10) : '',
      idIssuePlace: item.idIssuePlace || (item.idType ? getCanonicalIdIssuePlace(item.idType) : 'Cục CSQLHC về TTXH'),
      address: item.address ?? '',
    });
    setDrawerOpen(true);
  };

  const handleCopyBorrowerAddress = () => {
    if (borrowerAddress) {
      setValue('address', borrowerAddress.trim(), { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit = async (values: HouseholdMemberFormValues) => {
    try {
      const memberPayload: HouseholdMember = {
        fullName: values.fullName.trim(),
        idNumber: values.idNumber.trim(),
        idType: values.idType,
        yearOfBirth: values.yearOfBirth,
        gender: values.gender,
        idIssueDate: values.idIssueDate ? values.idIssueDate : null,
        idIssuePlace:
          values.idIssuePlace?.trim() || (values.idType ? getCanonicalIdIssuePlace(values.idType) : null),
        address: values.address?.trim() || null,
      };

      let nextMembers: HouseholdMember[];
      if (editingIndex !== null) {
        nextMembers = currentMembers.map((m, idx) => (idx === editingIndex ? memberPayload : m));
      } else {
        nextMembers = [...currentMembers, memberPayload];
      }

      await updateLoanMutation.mutateAsync({
        householdMembers: nextMembers,
      });

      notifySuccess(
        editingIndex !== null
          ? 'Đã cập nhật thông tin thành viên hộ gia đình'
          : 'Đã thêm thành viên hộ gia đình thành công'
      );
      setDrawerOpen(false);
    } catch (err) {
      notifyApiError(err, 'Lưu thông tin thành viên hộ thất bại');
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingIndex === null) return;
    try {
      const nextMembers = currentMembers.filter((_, idx) => idx !== deletingIndex);
      await updateLoanMutation.mutateAsync({
        householdMembers: nextMembers,
      });
      notifySuccess('Đã xóa thành viên hộ gia đình');
      setDeletingIndex(null);
    } catch (err) {
      notifyApiError(err, 'Xóa thành viên hộ thất bại');
    }
  };

  return (
    <Card className="border-sky-200 bg-sky-50/20">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            <CardTitle>Thành viên trong hộ gia đình</CardTitle>
            <Badge tone={currentMembers.length > 0 ? 'primary' : 'neutral'}>
              {currentMembers.length} thành viên
            </Badge>
          </div>
          <CardDescription className="mt-1">
            Áp dụng cho khoản vay thế chấp có tài sản thuộc diện đất hộ gia đình. Tự động nhận diện năm sinh, giới tính và nơi cấp từ CCCD 12 số.
          </CardDescription>
        </div>

        {!readOnly && (
          <Can perm="loan:update">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              className="border-sky-300 text-sky-700 hover:bg-sky-50"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm thành viên hộ
            </Button>
          </Can>
        )}
      </CardHeader>

      <CardContent>
        {currentMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sky-200 bg-white/60 p-6 text-center">
            <Users className="h-8 w-8 text-sky-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Chưa có thành viên hộ nào được khai báo
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng bổ sung đầy đủ các thành viên trong hộ để xuất các biểu mẫu và hợp đồng tín dụng chính xác.
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-3 border-sky-300 text-sky-700 hover:bg-sky-50"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Thêm thành viên đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-700 font-semibold">
                  <th className="py-2.5 pl-3 pr-2 text-center w-12">STT</th>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Năm sinh / Giới tính</th>
                  <th className="py-2.5 px-3">Số giấy tờ</th>
                  <th className="py-2.5 px-3">Loại giấy tờ</th>
                  <th className="py-2.5 px-3">Ngày cấp</th>
                  <th className="py-2.5 px-3">Nơi cấp</th>
                  <th className="py-2.5 px-3">Địa chỉ</th>
                  {!readOnly && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentMembers.map((member, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pl-3 pr-2 text-center text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {member.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {member.yearOfBirth ?? '—'} ({member.gender ? GENDER_LABELS[member.gender] : '—'})
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                      {member.idNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {member.idType ? ID_DOCUMENT_TYPE_LABELS[member.idType] : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {member.idIssueDate ? formatDateVN(member.idIssueDate) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={member.idIssuePlace ?? ''}>
                      {member.idIssuePlace || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[220px] truncate" title={member.address ?? ''}>
                      {member.address || '—'}
                    </td>
                    {!readOnly && (
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-600 hover:text-primary-600"
                            onClick={() => handleOpenEdit(idx)}
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => setDeletingIndex(idx)}
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Drawer Thêm / Chỉnh sửa thành viên hộ */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-w-md">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DrawerHeader
              title={editingIndex !== null ? 'Chỉnh sửa thành viên hộ' : 'Thêm thành viên trong hộ'}
              description="Nhập số CCCD để hệ thống tự động bóc tách giới tính, năm sinh và nơi cấp."
            />

            <DrawerBody className="space-y-4">
              <FormTextField
                control={control}
                name="fullName"
                label="Họ và tên thành viên"
                placeholder="Ví dụ: NGUYỄN VĂN AN"
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormTextField
                  control={control}
                  name="idNumber"
                  label="Số CCCD / Căn cước"
                  placeholder="12 chữ số"
                  required
                  digitsOnly
                  maxLength={12}
                />

                <FormSelectField
                  control={control}
                  name="idType"
                  label="Loại giấy tờ"
                  options={ID_DOCUMENT_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormNumberField
                  control={control}
                  name="yearOfBirth"
                  label="Năm sinh"
                  placeholder="VD: 1985"
                  disabled
                />

                <FormSelectField
                  control={control}
                  name="gender"
                  label="Giới tính"
                  options={GENDER_OPTIONS}
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormDateField
                  control={control}
                  name="idIssueDate"
                  label="Ngày cấp"
                />

                <FormTextField
                  control={control}
                  name="idIssuePlace"
                  label="Nơi cấp"
                  disabled
                  placeholder="Cục CSQLHC về TTXH"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Địa chỉ thường trú
                  </label>
                  {borrowerAddress && (
                    <button
                      type="button"
                      onClick={handleCopyBorrowerAddress}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-800 hover:underline"
                      title={borrowerAddress}
                    >
                      <Copy className="h-3 w-3" />
                      Lấy địa chỉ người vay
                    </button>
                  )}
                </div>
                <FormTextField
                  control={control}
                  name="address"
                  placeholder="Ví dụ: Ấp Nô Lựa, Xã Nhị Trường, Cầu Ngang, Trà Vinh"
                />
              </div>
            </DrawerBody>

            <DrawerFooter className="border-t border-slate-100 bg-slate-50/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isSubmitting ? 'Đang lưu...' : editingIndex !== null ? 'Cập nhật' : 'Thêm thành viên'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Modal xác nhận xóa */}
      <ConfirmDialog
        open={deletingIndex !== null}
        onOpenChange={(open) => !open && setDeletingIndex(null)}
        title="Xóa thành viên hộ gia đình"
        description={`Bạn có chắc chắn muốn xóa thành viên "${deletingIndex !== null ? currentMembers[deletingIndex]?.fullName : ''}" khỏi danh sách hộ?`}
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={updateLoanMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
