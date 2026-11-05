import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Calculator,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatArea, formatDateVN, formatVND } from '@/shared/format';
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
  DateInput,
  FormNumberField,
  FormTextField,
  FormTextareaField,
  SelectInput,
} from '@/components/form';
import { Alert, ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import { useAssetPricingList } from '@/features/asset-pricing/hooks/use-asset-pricing';
import {
  useAddLoanValuation,
  useDeleteLoanValuation,
  useLoanValuations,
  useUpdateCommonValuation,
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

interface ValuationGroupFormValues {
  collateralIds: string[];
  valuationType: ValuationType;
  valuationDate: string | null;
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea: number | null;
  pricePerSqMeter: number;
  totalPriceBeforeRound: number;
  totalPrice: number;
  notes: string;
}

const VALUATION_TYPE_OPTIONS: { value: ValuationType; label: string }[] = [
  { value: ValuationType.THEO_NGHI_DINH_QUY, label: 'Theo nghị định Quỹ' },
  { value: ValuationType.THEO_NGHI_DINH_QUY_CU, label: 'Theo nghị định Quỹ (Cũ)' },
  { value: ValuationType.THEO_GIA_THI_TRUONG, label: 'Theo giá thị trường' },
  {
    value: ValuationType.THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY,
    label: 'Theo giá thị trường và theo nghị định Quỹ',
  },
];

/**
 * Hàm tính toán tổng hợp dữ liệu nhóm tài sản trên Frontend (realtime feedback)
 */
function computeGroupAggregation(
  selectedIds: string[],
  allCollaterals: Collateral[],
  pricePerSqMeter: number,
) {
  const selectedCollaterals = selectedIds
    .map((id) => allCollaterals.find((c) => c.id === id))
    .filter((c): c is Collateral => Boolean(c));

  // A. Số tờ: Deduplicate, giữ nguyên thứ tự ban đầu
  const rawSheets = selectedCollaterals
    .map((c) => String(c.sheetNumber ?? '').trim())
    .filter(Boolean);
  const uniqueSheets = Array.from(new Set(rawSheets));
  const sheetNumber = uniqueSheets.join(', ');

  // B. Số thửa: Giữ nguyên thứ tự, không tự ý bỏ trùng
  const plotNumbers = selectedCollaterals
    .map((c) => String(c.plotNumber ?? '').trim())
    .filter(Boolean);
  const plotNumber = plotNumbers.join(', ');

  // C. Tổng diện tích pháp lý (chỉ tính mỗi tài sản 1 lần)
  const area = selectedCollaterals.reduce((sum, c) => sum + (Number(c.area) || 0), 0);

  // D. Tổng diện tích thực tế (chỉ cộng các tài sản có actualArea > 0)
  const validActualAreas = selectedCollaterals.filter(
    (c) => c.actualArea !== null && c.actualArea !== undefined && c.actualArea > 0,
  );
  const actualArea =
    validActualAreas.length > 0
      ? validActualAreas.reduce((sum, c) => sum + Number(c.actualArea), 0)
      : null;

  // Diện tích hiệu dụng để tính tiền
  const effectiveArea = selectedCollaterals.reduce((sum, c) => {
    const eff = c.actualArea && c.actualArea > 0 ? Number(c.actualArea) : Number(c.area || 0);
    return sum + eff;
  }, 0);

  const price = Number(pricePerSqMeter) || 0;
  const totalPriceBeforeRound = Math.round(effectiveArea * price);

  // Quy tắc làm tròn xuống hàng triệu: FLOOR(totalPriceBeforeRound / 1.000.000) * 1.000.000
  const totalPrice = Math.floor(totalPriceBeforeRound / 1_000_000) * 1_000_000;

  return {
    sheetNumber,
    plotNumber,
    area,
    actualArea,
    effectiveArea,
    pricePerSqMeter: price,
    totalPriceBeforeRound,
    totalPrice,
    collateralCount: selectedCollaterals.length,
  };
}

export function LoanValuationSection({
  loanId,
  collaterals = [],
  readOnly = false,
}: LoanValuationSectionProps) {
  const { data: valuations = [], isLoading } = useLoanValuations(loanId);
  const addValuationMutation = useAddLoanValuation(loanId);
  const updateValuationMutation = useUpdateLoanValuation(loanId);
  const deleteValuationMutation = useDeleteLoanValuation(loanId);
  const updateCommonMutation = useUpdateCommonValuation(loanId);

  // Thông tin chung của biên bản định giá
  const [commonValuationType, setCommonValuationType] = useState<ValuationType>(
    valuations[0]?.valuationType ?? ValuationType.THEO_NGHI_DINH_QUY,
  );
  const [commonValuationDate, setCommonValuationDate] = useState<string>(
    valuations[0]?.valuationDate ? valuations[0].valuationDate.slice(0, 10) : '',
  );

  useEffect(() => {
    if (valuations.length > 0) {
      if (valuations[0]?.valuationType) {
        setCommonValuationType(valuations[0].valuationType);
      }
      if (valuations[0]?.valuationDate) {
        setCommonValuationDate(valuations[0].valuationDate.slice(0, 10));
      }
    }
  }, [valuations]);

  const handleUpdateCommon = async (nextType: ValuationType, nextDate: string) => {
    setCommonValuationType(nextType);
    setCommonValuationDate(nextDate);
    if (valuations.length > 0) {
      try {
        await updateCommonMutation.mutateAsync({
          valuationType: nextType,
          valuationDate: nextDate || null,
        });
        notifySuccess('Đã cập nhật Loại & Ngày định giá chung cho tất cả các dòng');
      } catch (err: any) {
        notifyApiError(err);
      }
    }
  };

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
  } = useForm<ValuationGroupFormValues>({
    defaultValues: {
      collateralIds: [],
      valuationType: ValuationType.THEO_NGHI_DINH_QUY,
      valuationDate: null,
      sheetNumber: '',
      plotNumber: '',
      area: 0,
      actualArea: null,
      pricePerSqMeter: 0,
      totalPriceBeforeRound: 0,
      totalPrice: 0,
      notes: '',
    },
  });

  const watchedCollateralIds = useWatch({ control, name: 'collateralIds' }) || [];
  const watchedPricePerSqMeter = useWatch({ control, name: 'pricePerSqMeter' }) || 0;
  const watchedTotalPriceBeforeRound = useWatch({ control, name: 'totalPriceBeforeRound' }) || 0;
  const watchedTotalPrice = useWatch({ control, name: 'totalPrice' }) || 0;

  // Khi danh sách tài sản hoặc đơn giá thay đổi -> tự động cập nhật tổng hợp và làm tròn xuống
  const handleCollateralSelectionChange = (assetId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...watchedCollateralIds, assetId]))
      : watchedCollateralIds.filter((id) => id !== assetId);

    setValue('collateralIds', nextIds, { shouldValidate: true, shouldDirty: true });

    const agg = computeGroupAggregation(nextIds, collaterals, watchedPricePerSqMeter);
    setValue('sheetNumber', agg.sheetNumber, { shouldDirty: true });
    setValue('plotNumber', agg.plotNumber, { shouldDirty: true });
    setValue('area', agg.area, { shouldDirty: true });
    setValue('actualArea', agg.actualArea, { shouldDirty: true });
    setValue('totalPriceBeforeRound', agg.totalPriceBeforeRound, { shouldDirty: true });
    setValue('totalPrice', agg.totalPrice, { shouldDirty: true });
  };

  const handleSelectAllCollaterals = () => {
    const allIds = collaterals.map((c) => c.id);
    setValue('collateralIds', allIds, { shouldValidate: true, shouldDirty: true });

    const agg = computeGroupAggregation(allIds, collaterals, watchedPricePerSqMeter);
    setValue('sheetNumber', agg.sheetNumber, { shouldDirty: true });
    setValue('plotNumber', agg.plotNumber, { shouldDirty: true });
    setValue('area', agg.area, { shouldDirty: true });
    setValue('actualArea', agg.actualArea, { shouldDirty: true });
    setValue('totalPriceBeforeRound', agg.totalPriceBeforeRound, { shouldDirty: true });
    setValue('totalPrice', agg.totalPrice, { shouldDirty: true });
  };

  const handleDeselectAllCollaterals = () => {
    setValue('collateralIds', [], { shouldValidate: true, shouldDirty: true });
    setValue('sheetNumber', '', { shouldDirty: true });
    setValue('plotNumber', '', { shouldDirty: true });
    setValue('area', 0, { shouldDirty: true });
    setValue('actualArea', null, { shouldDirty: true });
    setValue('totalPriceBeforeRound', 0, { shouldDirty: true });
    setValue('totalPrice', 0, { shouldDirty: true });
  };

  const handlePricePerSqMeterChange = (newPrice: number) => {
    setValue('pricePerSqMeter', newPrice, { shouldDirty: true, shouldValidate: true });
    const agg = computeGroupAggregation(watchedCollateralIds, collaterals, newPrice);
    setValue('totalPriceBeforeRound', agg.totalPriceBeforeRound, { shouldDirty: true });
    setValue('totalPrice', agg.totalPrice, { shouldDirty: true });
  };

  // Áp nhanh đơn giá từ bảng giá đất
  const handleApplyPricingRule = () => {
    if (!selectedLandCategory) return;
    const rule = pricingRules?.items?.find((r: any) => r.landCategory === selectedLandCategory);
    if (!rule) return;

    handlePricePerSqMeterChange(rule.pricePerSqMeter);
  };

  // Mở Drawer thêm mới
  const handleOpenCreate = () => {
    setEditingItem(null);
    setSelectedLandCategory('');

    // Mặc định chọn toàn bộ tài sản nếu hồ sơ chỉ có 1 tài sản
    const defaultIds = collaterals.length === 1 && collaterals[0] ? [collaterals[0].id] : [];
    const initialPrice =
      collaterals.length === 1 && collaterals[0] && collaterals[0].pricePerSqMeter
        ? collaterals[0].pricePerSqMeter
        : 0;

    const agg = computeGroupAggregation(defaultIds, collaterals, initialPrice);

    reset({
      collateralIds: defaultIds,
      valuationType: commonValuationType,
      valuationDate: commonValuationDate || null,
      sheetNumber: agg.sheetNumber,
      plotNumber: agg.plotNumber,
      area: agg.area,
      actualArea: agg.actualArea,
      pricePerSqMeter: initialPrice,
      totalPriceBeforeRound: agg.totalPriceBeforeRound,
      totalPrice: agg.totalPrice,
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  // Mở Drawer chỉnh sửa
  const handleOpenEdit = (item: LoanValuation) => {
    setEditingItem(item);
    setSelectedLandCategory('');

    const itemCollateralIds = Array.isArray(item.collateralIds) && item.collateralIds.length > 0
      ? item.collateralIds
      : item.collateralId
      ? [item.collateralId]
      : [];

    const computedBefore =
      item.totalPriceBeforeRound ??
      Math.round(
        (item.actualArea && item.actualArea > 0 ? item.actualArea : item.area) *
          item.pricePerSqMeter,
      );

    reset({
      collateralIds: itemCollateralIds,
      valuationType: item.valuationType || commonValuationType,
      valuationDate: item.valuationDate
        ? item.valuationDate.slice(0, 10)
        : commonValuationDate || null,
      sheetNumber: item.sheetNumber,
      plotNumber: item.plotNumber,
      area: item.area,
      actualArea: item.actualArea ?? null,
      pricePerSqMeter: item.pricePerSqMeter,
      totalPriceBeforeRound: computedBefore,
      totalPrice: item.totalPrice,
      notes: item.notes || '',
    });
    setIsDrawerOpen(true);
  };

  // Lưu dữ liệu form
  const onSubmit = async (values: ValuationGroupFormValues) => {
    if (!values.collateralIds || values.collateralIds.length === 0) {
      notifyApiError(new Error('Vui lòng chọn ít nhất 1 tài sản vào nhóm định giá'));
      return;
    }
    if (!values.sheetNumber || !values.sheetNumber.trim()) {
      notifyApiError(new Error('Số tờ không được để trống'));
      return;
    }
    if (!values.plotNumber || !values.plotNumber.trim()) {
      notifyApiError(new Error('Số thửa không được để trống'));
      return;
    }
    if (!values.area || values.area <= 0) {
      notifyApiError(new Error('Diện tích phải lớn hơn 0'));
      return;
    }

    const dateToUse = commonValuationDate
      ? commonValuationDate
      : editingItem?.valuationDate
      ? editingItem.valuationDate.slice(0, 10)
      : null;

    const typeToUse = commonValuationType
      ? commonValuationType
      : editingItem?.valuationType || ValuationType.THEO_NGHI_DINH_QUY;

    const payload: CreateLoanValuationPayload = {
      collateralIds: values.collateralIds,
      valuationType: typeToUse,
      valuationDate: dateToUse,
      sheetNumber: values.sheetNumber.trim(),
      plotNumber: values.plotNumber.trim(),
      area: Number(values.area),
      actualArea: values.actualArea !== null ? Number(values.actualArea) : null,
      pricePerSqMeter: Number(values.pricePerSqMeter) || 0,
      totalPriceBeforeRound: Number(values.totalPriceBeforeRound) || 0,
      totalPrice: Number(values.totalPrice) || 0,
      notes: values.notes?.trim() || null,
    };

    try {
      if (editingItem) {
        await updateValuationMutation.mutateAsync({
          id: editingItem.id,
          payload,
        });
        notifySuccess('Cập nhật nhóm định giá thành công');
      } else {
        await addValuationMutation.mutateAsync(payload);
        notifySuccess('Tạo nhóm định giá thành công');
      }
      setIsDrawerOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      notifyApiError(err);
    }
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteValuationMutation.mutateAsync(deletingItem.id);
      notifySuccess('Xóa nhóm định giá thành công');
      setDeletingItem(null);
    } catch (err: any) {
      notifyApiError(err);
    }
  };

  // Tổng hợp giá trị
  const summary = useMemo(() => {
    const totalGroups = valuations.length;
    const totalPrice = valuations.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const totalArea = valuations.reduce((sum, item) => sum + (Number(item.area) || 0), 0);
    return {
      totalGroups,
      totalPrice,
      totalArea,
    };
  }, [valuations]);

  return (
    <div className="space-y-6">
      {/* 1. THẺ CÀI ĐẶT CHUNG VÀ TÓM TẮT ĐỊNH GIÁ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Quản lý Định giá Tài sản bảo đảm (Nhóm định giá)
              </CardTitle>
              <CardDescription>
                Mỗi dòng định giá đại diện cho một mức định giá chung của một nhóm tài sản (gộp số tờ, số thửa, diện tích và làm tròn xuống hàng triệu).
              </CardDescription>
            </div>
            {!readOnly && (
              <Can perm="loan:update">
                <Button
                  onClick={handleOpenCreate}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="shrink-0"
                >
                  Thêm dòng định giá
                </Button>
              </Can>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cài đặt chung Loại & Ngày định giá */}
          <div className="p-4 bg-muted/40 rounded-lg border flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Loại định giá áp dụng
              </label>
              <SelectInput
                value={commonValuationType}
                onChange={(e) => handleUpdateCommon(e.target.value as ValuationType, commonValuationDate)}
                disabled={readOnly}
                options={VALUATION_TYPE_OPTIONS}
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Ngày định giá chung
              </label>
              <DateInput
                value={commonValuationDate}
                onValueChange={(val) => handleUpdateCommon(commonValuationType, val)}
                disabled={readOnly}
                placeholder="Chọn ngày định giá"
              />
            </div>
          </div>

          {/* Các thẻ KPI tóm tắt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-xs font-medium text-muted-foreground">Tổng số nhóm định giá</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {summary.totalGroups} <span className="text-xs font-normal text-muted-foreground">nhóm</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="text-xs font-medium text-muted-foreground">
                Tổng giá trị định giá (sau làm tròn)
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatVND(summary.totalPrice)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="text-xs font-medium text-muted-foreground">Tổng diện tích các nhóm</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatArea(summary.totalArea)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. BẢNG DANH SÁCH CÁC DÒNG / NHÓM ĐỊNH GIÁ */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Danh sách các dòng định giá ({valuations.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Đang tải dữ liệu định giá...</div>
          ) : valuations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Chưa có dòng định giá nào. Nhấn <strong>"Thêm dòng định giá"</strong> để tạo nhóm định giá cho tài sản.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase border-y">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center">STT</th>
                    <th className="px-3 py-3">Loại định giá</th>
                    <th className="px-3 py-3">Ngày ĐG</th>
                    <th className="px-3 py-3">Số tờ</th>
                    <th className="px-3 py-3">Số thửa</th>
                    <th className="px-3 py-3 text-right">Tổng diện tích</th>
                    <th className="px-3 py-3 text-right">Đơn giá (đ/m²)</th>
                    <th className="px-3 py-3 text-right font-bold text-emerald-600">
                      Giá tiền định giá (VNĐ)
                    </th>
                    <th className="px-3 py-3 text-center">Tài sản trong nhóm</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    {!readOnly && <th className="px-3 py-3 text-right w-24">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {valuations.map((item, index) => {
                    const groupCollaterals = item.collaterals || [];
                    const collateralCount =
                      groupCollaterals.length > 0
                        ? groupCollaterals.length
                        : item.collateralIds?.length || (item.collateralId ? 1 : 0);

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 text-center font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 font-medium">
                          <Badge tone="neutral">
                            {VALUATION_TYPE_LABELS[item.valuationType] || item.valuationType}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {item.valuationDate ? formatDateVN(item.valuationDate) : '-'}
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-foreground">
                          {item.sheetNumber}
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-foreground">
                          {item.plotNumber}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {formatArea(item.area)}
                          {item.actualArea && item.actualArea > 0 && (
                            <div className="text-xs text-muted-foreground">
                              TT: {formatArea(item.actualArea)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {formatVND(item.pricePerSqMeter)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">
                          {formatVND(item.totalPrice)}
                          {item.totalPriceBeforeRound && item.totalPriceBeforeRound !== item.totalPrice && (
                            <div className="text-xs font-normal text-muted-foreground line-through">
                              {formatVND(item.totalPriceBeforeRound)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            title={
                              groupCollaterals.length > 0
                                ? groupCollaterals.map((c: any) => `${c.assetCode} (Tờ ${c.sheetNumber}, Thửa ${c.plotNumber})`).join('\n')
                                : undefined
                            }
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {collateralCount} tài sản
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Can perm="loan:update">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(item)}
                                  className="h-8 w-8 p-0"
                                  title="Chỉnh sửa nhóm định giá"
                                >
                                  <Pencil className="w-4 h-4 text-blue-600" />
                                </Button>
                              </Can>
                              <Can perm="loan:delete">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingItem(item)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Xóa nhóm định giá"
                                >
                                  <Trash2 className="w-4 h-4" />
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
      </Card>

      {/* 3. DRAWER THÊM MỚI / CHỈNH SỬA NHÓM ĐỊNH GIÁ */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDrawerOpen(false);
            setEditingItem(null);
          }
        }}
      >
        <DrawerContent size="xl">
          <DrawerHeader
            title={editingItem ? 'Chỉnh sửa nhóm định giá' : 'Thêm dòng định giá mới (Nhóm tài sản)'}
            description="Chọn các tài sản cùng mức định giá. Hệ thống sẽ tự động gộp số tờ, số thửa, tính tổng diện tích và làm tròn giá tiền xuống hàng triệu."
          />

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col min-h-0 overflow-hidden"
          >
            <DrawerBody className="flex-1 overflow-y-auto space-y-6">
              {/* THÔNG TIN CHUNG TỪ HỒ SƠ (LOẠI & NGÀY ĐỊNH GIÁ CHỌN Ở NGOÀI) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/40 rounded-lg border text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Loại định giá áp dụng:</span>
                  <Badge tone="neutral" className="font-medium">
                    {VALUATION_TYPE_LABELS[commonValuationType] || commonValuationType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ngày định giá:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {commonValuationDate ? formatDateVN(commonValuationDate) : '(Chưa chọn ở ngoài)'}
                  </span>
                </div>
              </div>

              {/* BƯỚC 1: CHỌN TÀI SẢN VÀO NHÓM */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>Bước 1: Chọn tài sản vào nhóm định giá</span>
                    <Badge tone="primary">
                      Đã chọn {watchedCollateralIds.length}/{collaterals.length} tài sản
                    </Badge>
                  </div>
                  {collaterals.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllCollaterals}
                        className="text-xs h-7"
                      >
                        Chọn tất cả
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllCollaterals}
                        className="text-xs h-7 text-muted-foreground"
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                  )}
                </div>

                {collaterals.length === 0 ? (
                  <Alert tone="warning" className="text-sm">
                    Hồ sơ vay chưa có tài sản bảo đảm nào. Vui lòng kê khai tài sản tại tab "Tài sản bảo đảm" trước khi thực hiện định giá.
                  </Alert>
                ) : (
                  <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold uppercase sticky top-0 border-b">
                        <tr>
                          <th className="p-2.5 w-10 text-center">Chọn</th>
                          <th className="p-2.5">Mã TS</th>
                          <th className="p-2.5">Số tờ</th>
                          <th className="p-2.5">Số thửa</th>
                          <th className="p-2.5 text-right">Diện tích</th>
                          <th className="p-2.5 text-right">DT thực tế</th>
                          <th className="p-2.5">Chủ sở hữu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {collaterals.map((c) => {
                          const isSelected = watchedCollateralIds.includes(c.id);
                          return (
                            <tr
                              key={c.id}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5 font-medium' : 'hover:bg-muted/30'
                              }`}
                              onClick={() => handleCollateralSelectionChange(c.id, !isSelected)}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleCollateralSelectionChange(c.id, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="p-2.5 font-mono">{c.assetCode}</td>
                              <td className="p-2.5 font-mono">{c.sheetNumber}</td>
                              <td className="p-2.5 font-mono">{c.plotNumber}</td>
                              <td className="p-2.5 text-right">{formatArea(c.area)}</td>
                              <td className="p-2.5 text-right text-muted-foreground">
                                {c.actualArea && c.actualArea > 0 ? formatArea(c.actualArea) : '-'}
                              </td>
                              <td className="p-2.5 truncate max-w-[140px]">
                                {c.ownerType === 'BAO_LANH' && c.thirdPartyInfo
                                  ? c.thirdPartyInfo.fullName
                                  : 'Người vay'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* BƯỚC 2: THÔNG TIN TỔNG HỢP (CHO PHÉP CHỈNH SỬA) */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Bước 2: Thông tin tổng hợp của nhóm (tự động gộp)</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Có thể điều chỉnh nếu cần thiết
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border">
                  <FormTextField
                    name="sheetNumber"
                    control={control}
                    label="Số tờ đã gộp (nối dấu phẩy, loại trùng)"
                    placeholder="vd: 12, 13"
                    required
                  />

                  <FormTextField
                    name="plotNumber"
                    control={control}
                    label="Số thửa đã gộp (nối dấu phẩy, giữ thứ tự)"
                    placeholder="vd: 100, 101, 200"
                    required
                  />

                  <FormNumberField
                    name="area"
                    control={control}
                    label="Tổng diện tích pháp lý (m²)"
                    placeholder="0"
                    min={0.1}
                    step={0.1}
                    required
                  />

                  <FormNumberField
                    name="actualArea"
                    control={control}
                    label="Tổng diện tích thực tế (m² - tùy chọn)"
                    placeholder="Để trống nếu không có"
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>

              {/* BƯỚC 3: ĐƠN GIÁ VÀ GIÁ TIỀN SAU LÀM TRÒN */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  Bước 3: Đơn giá và Giá tiền định giá (làm tròn xuống hàng triệu)
                </div>

                {/* Tra cứu nhanh giá đất */}
                {pricingRules?.items && pricingRules.items.length > 0 && (
                  <div className="flex gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                    <div className="flex-1">
                      <SelectInput
                        value={selectedLandCategory}
                        onChange={(e) => setSelectedLandCategory(e.target.value)}
                        options={[
                          { value: '', label: '-- Tra cứu nhanh đơn giá đất Quỹ --' },
                          ...pricingRules.items.map((r: any) => ({
                            value: r.landCategory,
                            label: `${r.landCategory} - ${r.locationDescription || ''} (${formatVND(r.pricePerSqMeter)}/m²)`,
                          })),
                        ]}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyPricingRule}
                      disabled={!selectedLandCategory}
                      leftIcon={<Calculator className="w-4 h-4" />}
                      className="shrink-0"
                    >
                      Áp giá đất
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground block">
                      Đơn giá áp dụng cho nhóm (VNĐ/m²) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={watchedPricePerSqMeter || ''}
                      onChange={(e) => handlePricePerSqMeterChange(Number(e.target.value))}
                      placeholder="0"
                      min={0}
                    />
                    <div className="text-xs text-muted-foreground">
                      Bằng số: {formatVND(watchedPricePerSqMeter)}/m²
                    </div>
                  </div>

                  {/* Khối hiển thị làm tròn xuống nổi bật */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Giá tiền trước làm tròn:</span>
                      <span className="font-mono text-muted-foreground line-through">
                        {formatVND(watchedTotalPriceBeforeRound)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-bold text-emerald-800 uppercase">
                        Giá tiền sau làm tròn:
                      </span>
                      <span className="text-xl font-extrabold text-emerald-600 font-mono">
                        {formatVND(watchedTotalPrice)}
                      </span>
                    </div>

                    <div className="text-[11px] text-emerald-700/80 italic">
                      Quy tắc: Làm tròn xuống đến hàng triệu (FLOOR)
                    </div>
                  </div>
                </div>

                <FormTextareaField
                  name="notes"
                  control={control}
                  label="Ghi chú (tùy chọn)"
                  placeholder="Ghi chú thêm về căn cứ định giá hoặc đặc điểm nhóm tài sản..."
                  rows={2}
                />
              </div>
            </DrawerBody>

            <DrawerFooter className="shrink-0 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingItem(null);
                }}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || watchedCollateralIds.length === 0}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {editingItem ? 'Lưu cập nhật' : 'Tạo nhóm định giá'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* 4. MODAL XÁC NHẬN XÓA */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Xác nhận xóa dòng định giá"
        description={`Bạn có chắc chắn muốn xóa nhóm định giá [Số tờ: ${deletingItem?.sheetNumber}, Số thửa: ${deletingItem?.plotNumber}] trị giá ${formatVND(deletingItem?.totalPrice ?? 0)}?`}
        confirmText="Xóa bản ghi"
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
