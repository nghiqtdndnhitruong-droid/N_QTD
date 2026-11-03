import { useEffect } from 'react';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { Gender, IdDocumentType } from '@/shared/types';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS } from '@/shared/constants';
import { toApiDate, toDate } from '@/shared/format';
import {
  getCanonicalIdIssuePlace,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';
import { Button } from '@/components/ui';
import {
  FormAreaCascadeFields,
  FormDateField,
  FormNumberField,
  FormSelectField,
  FormTextField,
} from '@/components/form';
import { memberFormSchema, type MemberFormValues } from '../schemas/member.schema';
import type { Member } from '../types/member.types';

const GENDER_OPTIONS = [
  { value: Gender.NAM, label: GENDER_LABELS.NAM },
  { value: Gender.NU, label: GENDER_LABELS.NU },
] as const;

const ID_TYPE_OPTIONS = [
  { value: IdDocumentType.CAN_CUOC_CONG_DAN, label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC_CONG_DAN },
  { value: IdDocumentType.CAN_CUOC, label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC },
] as const;

export interface MemberFormProps {
  initialData?: Member;
  isSubmitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onSubmit: (
    values: MemberFormValues,
    setError: UseFormSetError<MemberFormValues>,
  ) => Promise<void> | void;
}

function toInputDate(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? toApiDate(d) : '';
}

export function MemberForm({
  initialData,
  isSubmitting = false,
  submitLabel = 'Lưu hồ sơ thành viên',
  onCancel,
  onDirtyChange,
  onSubmit,
}: MemberFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { isDirty },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    mode: 'onTouched',
    defaultValues: {
      isNewMember: !initialData?.memberCode,
      memberCode: initialData?.memberCode ?? '',
      fullName: initialData?.fullName ?? '',
      yearOfBirth: initialData?.yearOfBirth ?? 1985,
      gender: initialData?.gender ?? Gender.NAM,
      phoneNumber: initialData?.phoneNumber ?? '',
      idType: initialData?.idType ?? IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: initialData?.idNumber ?? '',
      idIssueDate: toInputDate(initialData?.idIssueDate),
      idIssuePlace:
        initialData?.idIssuePlace ||
        getCanonicalIdIssuePlace(initialData?.idType ?? IdDocumentType.CAN_CUOC_CONG_DAN),
      idExpiry: toInputDate(initialData?.idExpiry),
      provinceId: initialData?.provinceId ?? '',
      communeId: initialData?.communeId ?? '',
      hamletId: initialData?.hamletId ?? '',
      addressDetail: initialData?.addressDetail ?? '',
      address: initialData?.address ?? '',
    },
  });

  const watchedIdNumber = useWatch({ control, name: 'idNumber' });
  const watchedIdType = useWatch({ control, name: 'idType' });
  const watchedMemberCode = useWatch({ control, name: 'memberCode' });
  const isBlankCode = !watchedMemberCode || watchedMemberCode.trim().length === 0;

  // Tự động xác định giới tính và năm sinh từ số CCCD 12 số (Mục 3.1)
  useEffect(() => {
    const parsed = parseCitizenIdInfo(watchedIdNumber);
    if (parsed) {
      setValue('gender', parsed.gender, { shouldValidate: true, shouldDirty: true });
      setValue('yearOfBirth', parsed.yearOfBirth, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedIdNumber, setValue]);

  // Tự động điền nơi cấp theo loại giấy tờ (Mục 3.5)
  useEffect(() => {
    if (watchedIdType) {
      setValue('idIssuePlace', getCanonicalIdIssuePlace(watchedIdType), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedIdType, setValue]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const cleanCode = values.memberCode?.trim() || '';
        const normalizedValues: MemberFormValues = {
          ...values,
          memberCode: cleanCode,
          isNewMember: !cleanCode,
        };
        return onSubmit(normalizedValues, setError);
      })}
      noValidate
      className="space-y-6"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            1. Thông tin định danh thành viên
          </h4>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormTextField
            control={control}
            name="memberCode"
            label="Mã thành viên"
            required={false}
            placeholder="Bỏ trống nếu là thành viên mới (hoặc VD: TV-2026-001)"
            hint={
              isBlankCode
                ? 'Để trống đối với thành viên mới chưa cấp mã (có thể bổ sung mã sau)'
                : 'Mã thành viên duy nhất trên toàn hệ thống'
            }
          />
          <FormTextField
            control={control}
            name="fullName"
            label="Họ và tên thành viên"
            required
            placeholder="VD: Nguyễn Văn An"
          />
          <FormTextField
            control={control}
            name="phoneNumber"
            label="Số điện thoại"
            placeholder="VD: 0912345678 (tùy chọn)"
            hint="Định dạng số điện thoại Việt Nam"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormNumberField
              control={control}
              name="yearOfBirth"
              label="Năm sinh"
              disabled
              hint="Tự động từ số CCCD (ký tự thứ 4-6)"
              placeholder="Tự động"
            />
            <FormSelectField
              control={control}
              name="gender"
              label="Giới tính"
              disabled
              hint="Tự động từ số CCCD (ký tự thứ 4)"
              options={GENDER_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          2. Giấy tờ tùy thân
        </h4>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormSelectField
            control={control}
            name="idType"
            label="Loại giấy tờ"
            required
            options={ID_TYPE_OPTIONS}
          />
          <FormTextField
            control={control}
            name="idNumber"
            label="Số Căn cước / CCCD"
            required
            digitsOnly
            maxLength={12}
            placeholder="Nhập 12 chữ số"
            hint="Tự động xác định giới tính & năm sinh"
          />
          <FormDateField
            control={control}
            name="idIssueDate"
            label="Ngày cấp"
            required
          />
          <FormTextField
            control={control}
            name="idIssuePlace"
            label="Nơi cấp"
            disabled
            hint="Tự động xác định theo loại giấy tờ"
            wrapperClassName="sm:col-span-2"
          />
          <FormDateField
            control={control}
            name="idExpiry"
            label="Ngày hết hạn (nếu có)"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <FormAreaCascadeFields
          control={control}
          setValue={setValue}
          provinceField="provinceId"
          communeField="communeId"
          hamletField="hamletId"
          fullAddressField="address"
          sectionTitle="3. Địa bàn thường trú của thành viên (Tỉnh → Xã → Ấp)"
          sectionHint="Chọn Tỉnh Vĩnh Long → Xã. Cấp Ấp có thể bỏ trống nếu không rõ hoặc tự thêm Ấp mới vào DB."
          required
          hamletRequired={false}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Đang lưu..."
          leftIcon={<Save className="h-4 w-4" />}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
