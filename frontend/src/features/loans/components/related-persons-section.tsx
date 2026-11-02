import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Gender, IdDocumentType, LoanType } from '@/shared/types';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS } from '@/shared/constants';
import { applyServerErrorsToForm } from '@/lib/http';
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
import {
  ConfirmDialog,
  notifyApiError,
  notifySuccess,
  notifyWarning,
} from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import {
  getCanonicalIdIssuePlace,
  isLoanEligibleForRelatedPerson,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';
import {
  useAddRelatedPerson,
  useDeleteRelatedPerson,
  useRelatedPersons,
  useUpdateRelatedPerson,
} from '../hooks/use-loans';
import {
  relatedPersonFormSchema,
  type RelatedPersonFormValues,
} from '../schemas/loan.schema';
import type { RelatedPerson } from '../types/loan.types';

// Danh sách lựa chọn cố định theo Task A: Quan hệ người vay (5 lựa chọn)
export const BORROWER_RELATIONSHIP_OPTIONS = [
  { value: 'Chồng', label: 'Chồng' },
  { value: 'Vợ', label: 'Vợ' },
  { value: 'Con', label: 'Con' },
  { value: 'Mẹ', label: 'Mẹ' },
  { value: 'Cha', label: 'Cha' },
];

// Danh sách lựa chọn cố định theo Task B: Quan hệ người liên quan (9 lựa chọn)
export const RELATED_PERSON_RELATIONSHIP_OPTIONS = [
  { value: 'Cha', label: 'Cha' },
  { value: 'Mẹ', label: 'Mẹ' },
  { value: 'Con', label: 'Con' },
  { value: 'Anh', label: 'Anh' },
  { value: 'Chị', label: 'Chị' },
  { value: 'Em', label: 'Em' },
  { value: 'Cô', label: 'Cô' },
  { value: 'Cậu', label: 'Cậu' },
  { value: 'Dì', label: 'Dì' },
];

export interface RelatedPersonsSectionProps {
  loanId: string;
  loanType: LoanType;
  loanAmount: number;
  readOnly?: boolean;
  borrowerAddress?: string;
}

export function RelatedPersonsSection({
  loanId,
  loanType,
  loanAmount,
  readOnly = false,
  borrowerAddress = '',
}: RelatedPersonsSectionProps) {
  const isEligible = isLoanEligibleForRelatedPerson(loanType, loanAmount);

  const { data: relatedPersons = [] } = useRelatedPersons(loanId, isEligible);
  const addMutation = useAddRelatedPerson(loanId);
  const updateMutation = useUpdateRelatedPerson(loanId);
  const deleteMutation = useDeleteRelatedPerson(loanId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RelatedPerson | null>(null);
  const [deletingItem, setDeletingItem] = useState<RelatedPerson | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<RelatedPersonFormValues>({
    resolver: zodResolver(relatedPersonFormSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      relationship: '',
      borrowerRelationship: '',
      relatedPersonRelationship: '',
      phoneNumber: '',
      yearOfBirth: 1990,
      gender: Gender.NAM,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '',
      idIssueDate: '',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      idExpiry: '',
      provinceId: '',
      communeId: '',
      hamletId: '',
      addressDetail: '',
      address: '',
    },
  });

  const watchedIdNumber = useWatch({ control, name: 'idNumber' });
  const watchedIdType = useWatch({ control, name: 'idType' });

  // Tự động giải mã giới tính & năm sinh từ số CCCD 12 số (Mục 3.1)
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

  // Options tương thích ngược nếu bản ghi cũ có giá trị quan hệ chưa có trong danh sách
  const borrowerOptions = useMemo(() => {
    const currentVal = editingItem?.borrowerRelationship || editingItem?.relationship;
    if (currentVal && !BORROWER_RELATIONSHIP_OPTIONS.some((o) => o.value === currentVal)) {
      return [{ value: currentVal, label: `${currentVal} (Cũ)` }, ...BORROWER_RELATIONSHIP_OPTIONS];
    }
    return BORROWER_RELATIONSHIP_OPTIONS;
  }, [editingItem]);

  const relatedPersonOptions = useMemo(() => {
    const currentVal = editingItem?.relatedPersonRelationship;
    if (currentVal && !RELATED_PERSON_RELATIONSHIP_OPTIONS.some((o) => o.value === currentVal)) {
      return [{ value: currentVal, label: `${currentVal} (Cũ)` }, ...RELATED_PERSON_RELATIONSHIP_OPTIONS];
    }
    return RELATED_PERSON_RELATIONSHIP_OPTIONS;
  }, [editingItem]);

  if (!isEligible) {
    return null;
  }

  const handleCopyBorrowerAddress = () => {
    if (!borrowerAddress || borrowerAddress.trim() === '') {
      notifyWarning('Chưa có địa chỉ người vay để sao chép.');
      return;
    }
    setValue('address', borrowerAddress.trim(), {
      shouldDirty: true,
      shouldValidate: true,
    });
    notifySuccess('Đã sao chép địa chỉ của người vay');
  };

  const openCreate = () => {
    setEditingItem(null);
    reset({
      fullName: '',
      relationship: '',
      borrowerRelationship: '',
      relatedPersonRelationship: '',
      phoneNumber: '',
      yearOfBirth: 1990,
      gender: Gender.NAM,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '',
      idIssueDate: '',
      idIssuePlace: getCanonicalIdIssuePlace(IdDocumentType.CAN_CUOC_CONG_DAN),
      idExpiry: '',
      provinceId: '',
      communeId: '',
      hamletId: '',
      addressDetail: '',
      address: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (item: RelatedPerson) => {
    setEditingItem(item);
    const existingBorrowerRel = item.borrowerRelationship ?? item.relationship ?? '';
    const existingRelatedRel = item.relatedPersonRelationship ?? '';

    reset({
      fullName: item.fullName,
      relationship: existingBorrowerRel,
      borrowerRelationship: existingBorrowerRel,
      relatedPersonRelationship: existingRelatedRel,
      phoneNumber: item.phoneNumber ?? '',
      yearOfBirth: item.yearOfBirth,
      gender: item.gender,
      idType: item.idType,
      idNumber: item.idNumber,
      idIssueDate: item.idIssueDate ? item.idIssueDate.slice(0, 10) : '',
      idIssuePlace: item.idIssuePlace,
      idExpiry: item.idExpiry ? item.idExpiry.slice(0, 10) : '',
      provinceId: item.provinceId ?? '',
      communeId: item.communeId ?? '',
      hamletId: item.hamletId ?? '',
      addressDetail: item.addressDetail ?? '',
      address: item.address,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: RelatedPersonFormValues) => {
    try {
      const payload = {
        ...values,
        relationship: values.borrowerRelationship || values.relationship || undefined,
        borrowerRelationship: values.borrowerRelationship || values.relationship || undefined,
        relatedPersonRelationship: values.relatedPersonRelationship || undefined,
      };

      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          payload,
        });
        notifySuccess(`Đã cập nhật thông tin người liên quan: ${values.fullName}`);
      } else {
        await addMutation.mutateAsync(payload);
        notifySuccess(`Đã thêm người liên quan: ${values.fullName}`);
      }
      setDrawerOpen(false);
    } catch (err) {
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingItem.id });
      notifySuccess(`Đã xóa người liên quan: ${deletingItem.fullName}`);
      setDeletingItem(null);
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <span>Thông tin người liên quan ({relatedPersons.length})</span>
            {relatedPersons.length === 0 && (
              <Badge tone="neutral" className="text-[11px]">
                Chưa bổ sung
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Áp dụng cho khoản vay thế chấp từ 140.000.000 ₫ trở lên. Không bắt buộc khi lập hồ sơ, có thể bổ sung hoặc chỉnh sửa bất kỳ lúc nào.
          </CardDescription>
        </div>

        {!readOnly && (
          <Can perm="loan:update">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Thêm người liên quan
            </Button>
          </Can>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {relatedPersons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
            <Users className="mx-auto h-7 w-7 text-slate-400" />
            <h4 className="mt-2 text-xs font-semibold text-slate-700">Chưa bổ sung người liên quan</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Khoản vay thế chấp này thuộc diện được phép khai báo Người liên quan (≥ 140 triệu). Bạn có thể bấm &ldquo;Thêm người liên quan&rdquo; để bổ sung khi cần.
            </p>
          </div>
        ) : null}

        {relatedPersons.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3.5 py-2.5">Họ và tên</th>
                  <th className="px-3.5 py-2.5">Quan hệ người vay</th>
                  <th className="px-3.5 py-2.5">Quan hệ người liên quan</th>
                  <th className="px-3.5 py-2.5">Năm sinh / Giới tính</th>
                  <th className="px-3.5 py-2.5">Số CCCD / Nơi cấp</th>
                  <th className="px-3.5 py-2.5">Số điện thoại</th>
                  <th className="px-3.5 py-2.5">Địa chỉ</th>
                  {!readOnly && <th className="px-3.5 py-2.5 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {relatedPersons.map((person) => {
                  const borrowerRel = person.borrowerRelationship || person.relationship;
                  const relatedRel = person.relatedPersonRelationship;
                  return (
                    <tr key={person.id} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-3 font-medium text-slate-900">
                        {person.fullName}
                      </td>
                      <td className="px-3.5 py-3">
                        {borrowerRel ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                            {borrowerRel}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {relatedRel ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
                            {relatedRel}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="tabular-nums font-medium text-slate-800">
                          {person.yearOfBirth}
                        </div>
                        <Badge tone={person.gender === Gender.NAM ? 'primary' : 'info'} className="mt-0.5">
                          {GENDER_LABELS[person.gender]}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-mono font-medium text-slate-900">
                          {person.idNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ID_DOCUMENT_TYPE_LABELS[person.idType]} · {person.idIssuePlace}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        {person.phoneNumber ? (
                          <span className="font-mono text-slate-800">{person.phoneNumber}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="max-w-xs line-clamp-2 text-slate-600">
                          {person.address}
                        </div>
                      </td>
                      {!readOnly && (
                        <td className="px-3.5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Can perm="loan:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => openEdit(person)}
                              >
                                Sửa
                              </Button>
                            </Can>
                            <Can perm="loan:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600 hover:bg-danger-50"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => setDeletingItem(person)}
                              >
                                Xóa
                              </Button>
                            </Can>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Drawer Thêm / Sửa Người liên quan */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="lg">
          <DrawerHeader
            title={
              editingItem
                ? `Chỉnh sửa thông tin người liên quan (${editingItem.fullName})`
                : 'Thêm thông tin người liên quan'
            }
            description="Bắt buộc đối với khoản vay thế chấp từ 140.000.000 ₫ trở lên. Giới tính, năm sinh và nơi cấp được tự động xác định."
          />
          <DrawerBody>
            <form
              id="related-person-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormTextField
                  control={control}
                  name="fullName"
                  label="Họ và tên người liên quan"
                  required
                  placeholder="VD: Nguyễn Thị Mai"
                />
                <FormTextField
                  control={control}
                  name="phoneNumber"
                  label="Số điện thoại"
                  placeholder="VD: 0912345678 (tùy chọn)"
                />
                <FormSelectField
                  control={control}
                  name="borrowerRelationship"
                  label="Quan hệ người vay"
                  options={borrowerOptions}
                  placeholder="-- Chọn quan hệ người vay --"
                />
                <FormSelectField
                  control={control}
                  name="relatedPersonRelationship"
                  label="Quan hệ người liên quan"
                  options={relatedPersonOptions}
                  placeholder="-- Chọn quan hệ người liên quan --"
                />
                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <FormNumberField
                    control={control}
                    name="yearOfBirth"
                    label="Năm sinh"
                    disabled
                    hint="Tự động từ số CCCD (ký tự 4-6)"
                    placeholder="Tự động"
                  />
                  <FormSelectField
                    control={control}
                    name="gender"
                    label="Giới tính"
                    disabled
                    hint="Tự động từ số CCCD (ký tự 4)"
                    options={[
                      { value: Gender.NAM, label: GENDER_LABELS.NAM },
                      { value: Gender.NU, label: GENDER_LABELS.NU },
                    ]}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Giấy tờ tùy thân
                </h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSelectField
                    control={control}
                    name="idType"
                    label="Loại giấy tờ"
                    required
                    options={[
                      {
                        value: IdDocumentType.CAN_CUOC_CONG_DAN,
                        label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC_CONG_DAN,
                      },
                      {
                        value: IdDocumentType.CAN_CUOC,
                        label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC,
                      },
                    ]}
                  />
                  <FormTextField
                    control={control}
                    name="idNumber"
                    label="Số Căn cước / CCCD"
                    required
                    digitsOnly
                    maxLength={12}
                    placeholder="Nhập 12 chữ số"
                    hint="Tự động tính giới tính & năm sinh"
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
                  />
                  <FormDateField
                    control={control}
                    name="idExpiry"
                    label="Ngày hết hạn (nếu có)"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Địa chỉ thường trú người liên quan <span className="text-danger-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyBorrowerAddress}
                    className="inline-flex items-center gap-1 rounded border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Sao chép địa chỉ người vay</span>
                  </button>
                </div>

                <FormTextField
                  control={control}
                  name="address"
                  label=""
                  required
                  placeholder="Nhập địa chỉ của người liên quan hoặc bấm Sao chép địa chỉ người vay"
                />
              </div>
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="related-person-form"
              isLoading={isSubmitting}
              loadingText="Đang lưu..."
            >
              {editingItem ? 'Lưu thay đổi' : 'Thêm người liên quan'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Xác nhận xóa mềm người liên quan */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title={`Xóa người liên quan "${deletingItem?.fullName}"?`}
        description="Thông tin này sẽ được xóa khỏi hồ sơ vay. Bản ghi sẽ được lưu lại trong cơ sở dữ liệu để phục vụ kiểm toán."
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
