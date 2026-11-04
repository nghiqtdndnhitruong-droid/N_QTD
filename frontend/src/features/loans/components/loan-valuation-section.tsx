import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Calculator, CheckCircle2, DollarSign, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDateVN, formatVND } from '@/shared/format';
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
  FormCurrencyField,
  FormDateField,
  FormNumberField,
  FormSelectField,
  FormTextField,
  FormTextareaField,
  SelectInput,
} from '@/components/form';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import { useAssetPricingList } from '@/features/asset-pricing/hooks/use-asset-pricing';
import {
  useAddLoanValuation,
  useDeleteLoanValuation,
  useLoanValuations,
  useUpdateLoanValuation,
} from '../hooks/use-loans';
import {
  VALUATION_TYPE_LABELS,
  ValuationType,
  type Collateral,
  type CreateLoanValuationPayload,
  type LoanValuation,
} from '../types/loan.types';

interface LoanValuationSectionProps {
  loanId: string;
  collaterals?: Collateral[];
  readOnly?: boolean;
}

interface ValuationFormValues {
  collateralId: string;
  valuationType: ValuationType;
  valuationDate: string | null;
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea: number | null;
  pricePerSqMeter: number;
  totalPrice: number;
  notes: string;
}

const VALUATION_TYPE_OPTIONS: { value: ValuationType; label: string }[] = [
  { value: ValuationType.THEO_NGHI_DINH_QUY, label: 'Theo nghị định Quỹ' },
  { value: ValuationType.THEO_NGHI_DINH_QUY_CU, label: 'Theo nghị định Quỹ (Cũ)' },
  { value: ValuationType.THEO_GIA_THI_TRUONG, label: 'Theo giá thị trường' },
  { value: ValuationType.THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY, label: 'Theo giá thị trường và theo nghị định Quỹ' },
];

export function LoanValuationSection({
  loanId,
  collaterals = [],
  readOnly = false,
}: LoanValuationSectionProps) {
  const { data: valuations = [], isLoading } = useLoanValuations(loanId);
  const addValuationMutation = useAddLoanValuation(loanId);
  const updateValuationMutation = useUpdateLoanValuation(loanId);
  const deleteValuationMutation = useDeleteLoanValuation(loanId);

  // Tra cứu bảng giá đất của Quỹ để áp nhanh
  const { data: pricingRules } = useAssetPricingList({ page: 1, limit: 100, isActive: true });
  const [selectedLandCategory, setSelectedLandCategory] = useState('');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LoanValuation | null>(null);
  const [deletingItem, setDeletingItem] = useState<LoanValuation | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<ValuationFormValues>({
    defaultValues: {
      collateralId: '',
      valuationType: ValuationType.THEO_NGHI_DINH_QUY,
      valuationDate: null,
      sheetNumber: '',
      plotNumber: '',
      area: 0,
      actualArea: null,
      pricePerSqMeter: 0,
      totalPrice: 0,
      notes: '',
    },
  });

  const watchedArea = useWatch({ control, name: 'area' });
  const watchedActualArea = useWatch({ control, name: 'actualArea' });
  const watchedPricePerSqMeter = useWatch({ control, name: 'pricePerSqMeter' });

  // Tự động tính giá tiền khi diện tích hoặc đơn giá thay đổi
  useEffect(() => {
    const effArea = watchedActualArea && watchedActualArea > 0 ? watchedActualArea : watchedArea;
    if (effArea > 0 && watchedPricePerSqMeter > 0) {
      setValue('totalPrice', Math.round(Number(effArea) * Number(watchedPricePerSqMeter)));
    }
  }, [watchedArea, watchedActualArea, watchedPricePerSqMeter, setValue]);

  // Tùy chọn liên kết tài sản
  const collateralOptions = useMemo(() => {
    return [
      { value: '', label: '-- Không liên kết tài sản cụ thể --' },
      ...collaterals.map((c) => ({
        value: c.id,
        label: `${c.assetCode} (Tờ ${c.sheetNumber}, Thửa ${c.plotNumber} - ${c.area} m²)`,
      })),
    ];
  }, [collaterals]);

  // Tổng hợp giá trị định giá
  const summary = useMemo(() => {
    const totalLines = valuations.length;
    const totalPrice = valuations.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    return {
      totalLines,
      totalPrice,
    };
  }, [valuations]);

  // Mở Drawer thêm mới
  const handleOpenCreate = () => {
    setEditingItem(null);
    setSelectedLandCategory('');
    reset({
      collateralId: '',
      valuationType: ValuationType.THEO_NGHI_DINH_QUY,
      valuationDate: null,
      sheetNumber: '',
      plotNumber: '',
      area: 0,
      actualArea: null,
      pricePerSqMeter: 0,
      totalPrice: 0,
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  // Mở Drawer chỉnh sửa
  const handleOpenEdit = (item: LoanValuation) => {
    setEditingItem(item);
    setSelectedLandCategory('');
    reset({
      collateralId: item.collateralId || '',
      valuationType: item.valuationType,
      valuationDate: item.valuationDate ? item.valuationDate.slice(0, 10) : null,
      sheetNumber: String(item.sheetNumber ?? ''),
      plotNumber: String(item.plotNumber ?? ''),
      area: item.area,
      actualArea: item.actualArea ?? null,
      pricePerSqMeter: item.pricePerSqMeter,
      totalPrice: item.totalPrice,
      notes: item.notes || '',
    });
    setIsDrawerOpen(true);
  };

  // Khi người dùng chọn tài sản -> tự động điền gợi ý thông số tài sản đó
  const handleCollateralChange = (selectedId: string) => {
    setValue('collateralId', selectedId);
    if (!selectedId) return;

    const matched = collaterals.find((c) => c.id === selectedId);
    if (matched) {
      if (matched.sheetNumber) setValue('sheetNumber', String(matched.sheetNumber));
      if (matched.plotNumber) setValue('plotNumber', String(matched.plotNumber));
      if (matched.area) setValue('area', matched.area);
      if (matched.actualArea) setValue('actualArea', matched.actualArea);
      if (matched.pricePerSqMeter && matched.pricePerSqMeter > 0) {
        setValue('pricePerSqMeter', matched.pricePerSqMeter);
        const effArea = matched.actualArea || matched.area;
        setValue('totalPrice', Math.round(effArea * matched.pricePerSqMeter));
      }
    }
  };

  // Tính nhanh giá trị từ Bảng giá đất Quỹ
  const handleApplyPricingRule = () => {
    if (!selectedLandCategory) return;
    const rule = pricingRules?.items?.find((r: any) => r.landCategory === selectedLandCategory);
    if (!rule) return;

    setValue('pricePerSqMeter', rule.pricePerSqMeter, { shouldValidate: true });
    const effectiveArea = watchedActualArea && watchedActualArea > 0 ? watchedActualArea : watchedArea;
    const calculatedPrice = Math.round((Number(effectiveArea) || 0) * rule.pricePerSqMeter);
    setValue('totalPrice', calculatedPrice, { shouldValidate: true });
  };

  // Tính lại Giá tiền thủ công theo nút bấm
  const handleRecalculatePrice = () => {
    const effectiveArea = watchedActualArea && watchedActualArea > 0 ? watchedActualArea : watchedArea;
    const price = Math.round((Number(effectiveArea) || 0) * (Number(watchedPricePerSqMeter) || 0));
    setValue('totalPrice', price, { shouldValidate: true });
  };

  // Lưu dữ liệu form
  const onSubmit = async (values: ValuationFormValues) => {
    if (!values.sheetNumber || !values.sheetNumber.trim()) {
      notifyApiError(new Error('Vui lòng nhập Số tờ'));
      return;
    }
    if (!values.plotNumber || !values.plotNumber.trim()) {
      notifyApiError(new Error('Vui lòng nhập Số thửa'));
      return;
    }
    if (!values.area || values.area <= 0) {
      notifyApiError(new Error('Diện tích phải lớn hơn 0'));
      return;
    }

    const payload: CreateLoanValuationPayload = {
      collateralId: values.collateralId || null,
      valuationType: values.valuationType,
      valuationDate: values.valuationDate || null,
      sheetNumber: String(values.sheetNumber).trim(),
      plotNumber: String(values.plotNumber).trim(),
      area: Number(values.area),
      actualArea: values.actualArea !== null && values.actualArea !== undefined && values.actualArea > 0
        ? Number(values.actualArea)
        : null,
      pricePerSqMeter: Number(values.pricePerSqMeter) || 0,
      totalPrice: Number(values.totalPrice) || 0,
      notes: values.notes ? values.notes.trim() : null,
    };

    try {
      if (editingItem) {
        await updateValuationMutation.mutateAsync({
          id: editingItem.id,
          payload,
        });
        notifySuccess('Cập nhật dòng định giá thành công');
      } else {
        await addValuationMutation.mutateAsync(payload);
        notifySuccess('Thêm dòng định giá mới thành công');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      notifyApiError(err);
    }
  };

  // Xóa dòng định giá
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await deleteValuationMutation.mutateAsync(deletingItem.id);
      notifySuccess('Xóa dòng định giá thành công');
      setDeletingItem(null);
    } catch (err: any) {
      notifyApiError(err);
    }
  };

  const getValuationBadge = (type: ValuationType) => {
    switch (type) {
      case ValuationType.THEO_NGHI_DINH_QUY:
        return <Badge tone="primary">{VALUATION_TYPE_LABELS[type]}</Badge>;
      case ValuationType.THEO_NGHI_DINH_QUY_CU:
        return <Badge tone="neutral">{VALUATION_TYPE_LABELS[type]}</Badge>;
      case ValuationType.THEO_GIA_THI_TRUONG:
        return <Badge tone="success">{VALUATION_TYPE_LABELS[type]}</Badge>;
      case ValuationType.THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY:
        return <Badge tone="warning">{VALUATION_TYPE_LABELS[type]}</Badge>;
      default:
        return <Badge tone="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Thanh thông tin tóm tắt & nút thao tác */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary-100 bg-primary-50/30">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng số dòng định giá</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {summary.totalLines} <span className="text-xs font-normal text-slate-500">dòng</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success-100 bg-success-50/30">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success-100 text-success-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng giá trị định giá</p>
              <p className="text-xl font-bold text-success-700 tabular-nums">
                {formatVND(summary.totalPrice)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end sm:col-span-2 lg:col-span-1">
          {!readOnly && (
            <Can perm="loan:update">
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
                className="w-full sm:w-auto"
              >
                Thêm dòng định giá
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* Bảng danh sách nhiều dòng định giá */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Danh sách các lần định giá tài sản</CardTitle>
            <CardDescription className="text-xs">
              Quản lý độc lập nhiều dòng định giá, nhiều loại định giá và các thời điểm khác nhau của hồ sơ vay
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-3 text-center">STT</th>
                  <th className="px-3.5 py-3">Loại định giá</th>
                  <th className="px-3.5 py-3">Ngày định giá</th>
                  <th className="px-3.5 py-3">Số tờ / thửa</th>
                  <th className="px-3.5 py-3 text-right">Diện tích (m²)</th>
                  <th className="px-3.5 py-3 text-right">Đơn giá (VNĐ/m²)</th>
                  <th className="px-3.5 py-3 text-right">Giá tiền (VNĐ)</th>
                  <th className="px-3.5 py-3">Ghi chú</th>
                  {!readOnly && <th className="px-3.5 py-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={readOnly ? 8 : 9} className="p-8 text-center text-slate-400">
                      Đang tải danh sách định giá...
                    </td>
                  </tr>
                ) : valuations.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 8 : 9} className="p-8 text-center text-slate-400">
                      Chưa có dòng định giá nào cho hồ sơ vay này.
                      {!readOnly && (
                        <div className="mt-2">
                          <Button variant="secondary" size="sm" onClick={handleOpenCreate}>
                            + Thêm dòng định giá đầu tiên
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  valuations.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 font-medium">
                        {getValuationBadge(item.valuationType)}
                        {item.collateral && (
                          <div className="mt-1 text-xs text-slate-500">
                            Liên kết: <span className="font-semibold text-slate-700">{item.collateral.assetCode}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 tabular-nums">
                        {item.valuationDate ? formatDateVN(item.valuationDate) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3.5 py-3 font-medium text-slate-900 tabular-nums">
                        Tờ: <span className="font-bold">{item.sheetNumber}</span> | Thửa: <span className="font-bold">{item.plotNumber}</span>
                      </td>
                      <td className="px-3.5 py-3 text-right tabular-nums">
                        <div className="font-medium text-slate-900">
                          {Number(item.area).toLocaleString('vi-VN')} m²
                        </div>
                        {item.actualArea && item.actualArea > 0 ? (
                          <div className="text-[11px] text-slate-500">
                            Thực tế: {Number(item.actualArea).toLocaleString('vi-VN')} m²
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-3 text-right font-medium text-slate-700 tabular-nums">
                        {Number(item.pricePerSqMeter).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatVND(item.totalPrice)}
                      </td>
                      <td className="px-3.5 py-3 max-w-xs text-xs text-slate-600 truncate" title={item.notes || ''}>
                        {item.notes || <span className="text-slate-400">—</span>}
                      </td>
                      {!readOnly && (
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Can perm="loan:update">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(item)}
                                title="Chỉnh sửa dòng định giá"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                                onClick={() => setDeletingItem(item)}
                                title="Xóa dòng định giá"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </Can>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer Thêm / Sửa dòng định giá */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) setIsDrawerOpen(false);
        }}
      >
        <DrawerContent size="xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DrawerHeader
              title={editingItem ? 'Chỉnh sửa dòng định giá' : 'Thêm dòng định giá mới'}
              description="Nhập đầy đủ thông tin định giá độc lập, có thể chọn 1 trong 4 loại quy chuẩn và liên kết tài sản"
            />

            <DrawerBody className="space-y-4">
              {/* Lựa chọn loại định giá & Liên kết tài sản */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectField
                  control={control}
                  name="valuationType"
                  label="Loại định giá"
                  required
                  options={VALUATION_TYPE_OPTIONS}
                />

                <SelectInput
                  label="Tài sản liên kết (tùy chọn)"
                  value={control._formValues.collateralId || ''}
                  onChange={(e) => handleCollateralChange(e.target.value)}
                  options={collateralOptions}
                  hint="Chọn để tự động điền gợi ý Số tờ, Số thửa, Diện tích"
                />
              </div>

              {/* Ngày định giá */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormDateField
                  control={control}
                  name="valuationDate"
                  label="Ngày định giá (tùy chọn)"
                  hint="Không tự động gán ngày hiện tại nếu chưa nhập"
                />
              </div>

              {/* Số tờ & Số thửa */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormTextField
                  control={control}
                  name="sheetNumber"
                  label="Số tờ"
                  required
                  placeholder="Ví dụ: 01, 005"
                  hint="Chuỗi văn bản bảo toàn số 0 ở đầu"
                />
                <FormTextField
                  control={control}
                  name="plotNumber"
                  label="Số thửa"
                  required
                  placeholder="Ví dụ: 08, 012"
                  hint="Chuỗi văn bản bảo toàn số 0 ở đầu"
                />
              </div>

              {/* Diện tích & Diện tích thực tế */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormNumberField
                  control={control}
                  name="area"
                  label="Diện tích trên giấy (m²)"
                  required
                  min={0.01}
                  step={0.01}
                />
                <FormNumberField
                  control={control}
                  name="actualArea"
                  label="Diện tích thực tế thẩm định (m²)"
                  min={0.01}
                  step={0.01}
                  placeholder="Để trống nếu trùng với diện tích trên giấy"
                />
              </div>

              {/* Tra cứu nhanh theo bảng giá đất của Quỹ */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Tra cứu nhanh Bảng giá đất Quỹ</p>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                  <SelectInput
                    value={selectedLandCategory}
                    onChange={(e) => setSelectedLandCategory(e.target.value)}
                    placeholder="-- Chọn loại đất để tự động áp đơn giá --"
                    options={(pricingRules?.items ?? []).map((r: any) => ({
                      value: r.landCategory,
                      label: `${r.landCategory} (${formatVND(r.pricePerSqMeter)}/m²)`,
                    }))}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={!selectedLandCategory}
                    leftIcon={<Calculator className="h-4 w-4" />}
                    onClick={handleApplyPricingRule}
                  >
                    Áp đơn giá
                  </Button>
                </div>
              </div>

              {/* Đơn giá & Giá tiền */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormCurrencyField
                  control={control}
                  name="pricePerSqMeter"
                  label="Đơn giá (VNĐ/m²)"
                  required
                />
                <div>
                  <FormCurrencyField
                    control={control}
                    name="totalPrice"
                    label="Giá tiền / Thành tiền (VNĐ)"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleRecalculatePrice}
                    className="mt-1 text-xs text-primary-600 hover:underline"
                  >
                    ↻ Tự động tính lại = (Diện tích × Đơn giá)
                  </button>
                </div>
              </div>

              {/* Ghi chú */}
              <FormTextareaField
                control={control}
                name="notes"
                label="Ghi chú (tùy chọn)"
                rows={2}
                placeholder="Nhập ghi chú thêm cho dòng định giá này..."
              />
            </DrawerBody>

            <DrawerFooter>
              <Button type="button" variant="secondary" onClick={() => setIsDrawerOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                {editingItem ? 'Lưu thay đổi' : 'Thêm dòng định giá'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Hộp thoại xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title="Xác nhận xóa dòng định giá"
        description={
          deletingItem
            ? `Bạn có chắc chắn muốn xóa dòng định giá "${VALUATION_TYPE_LABELS[deletingItem.valuationType]}" (Tờ ${deletingItem.sheetNumber}, Thửa ${deletingItem.plotNumber} - Giá: ${formatVND(deletingItem.totalPrice)})? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteValuationMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
