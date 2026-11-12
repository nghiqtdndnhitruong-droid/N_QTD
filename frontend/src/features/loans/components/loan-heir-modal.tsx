import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import {
  FormDateField,
  FormSelectField,
  FormTextField,
} from '@/components/form';
import { Gender, IdDocumentType } from '@/shared/types';
import { GENDER_LABELS } from '@/shared/constants';
import { notifySuccess, notifyApiError } from '@/components/feedback';
import {
  getCanonicalIdIssuePlace,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';
import { useUpdateLoan } from '../hooks/use-loans';
import type { Loan } from '../types/loan.types';

const ID_TYPE_OPTIONS = [
  { value: IdDocumentType.CAN_CUOC_CONG_DAN, label: 'Căn cước công dân (12 số)' },
  { value: IdDocumentType.CAN_CUOC, label: 'Thẻ Căn cước (Mẫu mới theo Luật Căn cước)' },
];

const heirDocumentSchema = z.object({
  idType: z.nativeEnum(IdDocumentType),
  idNumber: z
    .string()
    .trim()
    .length(12, 'Số Căn cước phải đúng 12 chữ số')
    .regex(/^\d+$/, 'Số Căn cước chỉ chứa các chữ số'),
  idIssueDate: z.string().min(1, 'Ngày cấp là bắt buộc'),
  idExpiry: z.string().optional(),
});

type HeirDocumentFormValues = z.infer<typeof heirDocumentSchema>;

export interface LoanHeirModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  onSuccess?: () => void;
}

export function LoanHeirModal({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: LoanHeirModalProps) {
  const heir = loan.heir;
  const updateMutation = useUpdateLoan(loan.id);

  const [isNoExpiry, setIsNoExpiry] = useState<boolean>(() => {
    return heir ? !heir.idExpiry : false;
  });

  const {
    control,
    handleSubmit,
    setValue,
    reset,
  } = useForm<HeirDocumentFormValues>({
    resolver: zodResolver(heirDocumentSchema),
    mode: 'onTouched',
    defaultValues: {
      idType: heir?.idType ?? IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: heir?.idNumber ?? '',
      idIssueDate: heir?.idIssueDate ? heir.idIssueDate.slice(0, 10) : '',
      idExpiry: heir?.idExpiry ? heir.idExpiry.slice(0, 10) : '',
    },
  });

  const watchedIdNumber = useWatch({ control, name: 'idNumber' });
  const watchedIdType = useWatch({ control, name: 'idType' });
  const watchedIdExpiry = useWatch({ control, name: 'idExpiry' });

  // Tự động giải mã giới tính & năm sinh từ số CCCD
  const parsedCccd = parseCitizenIdInfo(watchedIdNumber);

  useEffect(() => {
    if (!open) return;
    if (heir) {
      reset({
        idType: heir.idType ?? IdDocumentType.CAN_CUOC_CONG_DAN,
        idNumber: heir.idNumber ?? '',
        idIssueDate: heir.idIssueDate ? heir.idIssueDate.slice(0, 10) : '',
        idExpiry: heir.idExpiry ? heir.idExpiry.slice(0, 10) : '',
      });
      setIsNoExpiry(!heir.idExpiry);
    }
  }, [open, heir, reset]);

  // Tự động gợi ý Không thời hạn nếu >= 60 tuổi
  useEffect(() => {
    if (parsedCccd && new Date().getFullYear() - parsedCccd.yearOfBirth >= 60 && !watchedIdExpiry) {
      setIsNoExpiry(true);
    }
  }, [parsedCccd, watchedIdExpiry]);

  if (!heir) return null;

  const onSubmit = async (values: HeirDocumentFormValues) => {
    try {
      const cccdInfo = parseCitizenIdInfo(values.idNumber);
      const gender = cccdInfo?.gender ?? heir.gender ?? Gender.NAM;
      const yearOfBirth = cccdInfo?.yearOfBirth ?? heir.yearOfBirth ?? 1990;
      const idIssuePlace = getCanonicalIdIssuePlace(values.idType);

      const payload = {
        heir: {
          fullName: heir.fullName,
          relationship: heir.relationship,
          phoneNumber: heir.phoneNumber || null,
          address: heir.address,
          idType: values.idType,
          idNumber: values.idNumber.trim(),
          idIssueDate: values.idIssueDate,
          idIssuePlace,
          idExpiry: isNoExpiry ? null : (values.idExpiry ? values.idExpiry : null),
          gender,
          yearOfBirth,
        },
      };

      await updateMutation.mutateAsync(payload);
      notifySuccess('Đã cập nhật giấy tờ người thừa kế thành công');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      notifyApiError(err, 'Không thể cập nhật giấy tờ người thừa kế');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Cập nhật giấy tờ Người thừa kế</DialogTitle>
            <DialogDescription>
              Cập nhật loại giấy tờ, số định danh, ngày cấp, nơi cấp và thời hạn giấy tờ của người thừa kế.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5 py-4">
            {/* Thông tin cố định của Người thừa kế */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thông tin người thừa kế (Cố định)
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Họ và tên: </span>
                  <span className="font-semibold text-slate-900">{heir.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Quan hệ với người vay: </span>
                  <span className="font-semibold text-slate-900">{heir.relationship}</span>
                </div>
                <div>
                  <span className="text-slate-500">Số điện thoại: </span>
                  <span className="font-mono text-slate-700">{heir.phoneNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Địa chỉ: </span>
                  <span className="text-slate-700">{heir.address}</span>
                </div>
              </div>
            </div>

            {/* Các trường giấy tờ được phép cập nhật */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                placeholder="Nhập 12 chữ số CCCD"
                hint={
                  parsedCccd
                    ? `Năm sinh: ${parsedCccd.yearOfBirth} · Giới tính: ${GENDER_LABELS[parsedCccd.gender]}`
                    : 'Tự động tính năm sinh & giới tính từ 12 số'
                }
              />

              <FormDateField
                control={control}
                name="idIssueDate"
                label="Ngày cấp"
                required
              />

              <FormDateField
                control={control}
                name="idExpiry"
                label="Thời hạn giấy tờ"
                disabled={isNoExpiry}
                placeholder={isNoExpiry ? 'Không thời hạn' : 'dd/mm/yyyy'}
                hint={isNoExpiry ? 'Giấy tờ có giá trị vô thời hạn' : 'Để trống hoặc chọn Không thời hạn'}
                extraRight={
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isNoExpiry}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsNoExpiry(checked);
                        if (checked) {
                          setValue('idExpiry', '', { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Không thời hạn</span>
                  </label>
                }
              />

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nơi cấp giấy tờ
                </label>
                <div className="flex h-9 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700">
                  {getCanonicalIdIssuePlace(watchedIdType) || 'Cục Cảnh Sát QLHC về TTXH'}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tự động điền theo loại giấy tờ được chọn
                </p>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
