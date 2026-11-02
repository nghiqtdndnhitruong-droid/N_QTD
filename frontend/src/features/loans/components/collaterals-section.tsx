import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, LandPlot, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  CollateralAssetType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  LoanType,
  ValuationMethod,
} from '@/shared/types';
import {
  BUSINESS_LIMITS,
  COLLATERAL_ASSET_TYPE_LABELS,
  COLLATERAL_OWNER_TYPE_LABELS,
  GENDER_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  VALUATION_METHOD_LABELS,
} from '@/shared/constants';
import { formatArea, formatVND } from '@/shared/format';
import {
  calculateFlooredValuationAmount,
  getCanonicalIdIssuePlace,
  parseCitizenIdInfo,
  resolveEffectiveCollateralArea,
} from '@/shared/utils/identity-document';
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
  FormAreaCascadeFields,
  FormCurrencyField,
  FormDateField,
  FormNumberField,
  FormSelectField,
  FormTextField,
  SelectInput,
} from '@/components/form';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  notifyApiError,
  notifySuccess,
} from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import { useAreaTree } from '@/features/areas/hooks/use-areas';
import { assetPricingApi } from '@/features/asset-pricing/api/asset-pricing.api';
import { useAssetPricingList } from '@/features/asset-pricing/hooks/use-asset-pricing';
import {
  useAddCollateral,
  useDeleteCollateral,
  useUpdateCollateral,
} from '../hooks/use-loans';
import {
  createCollateralFormSchema,
  type CollateralFormValues,
} from '../schemas/loan.schema';
import type { Collateral } from '../types/loan.types';

export interface CollateralsSectionProps {
  loanId: string;
  loanType?: LoanType;
  loanAmount: number;
  collaterals: Collateral[];
  readOnly?: boolean;
}

export function CollateralsSection({
  loanId,
  loanType = LoanType.THE_CHAP,
  loanAmount,
  collaterals,
  readOnly = false,
}: CollateralsSectionProps) {
  const isUnsecured = loanType === LoanType.TIN_CHAP;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Collateral | null>(null);
  const [deletingItem, setDeletingItem] = useState<Collateral | null>(null);
  const [selectedLandCategory, setSelectedLandCategory] = useState('');
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // Bộ lọc và tìm kiếm tài sản theo Mã TS / Số GCN / Xã / Ấp
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCommuneId, setFilterCommuneId] = useState('');
  const [filterHamletId, setFilterHamletId] = useState('');

  const addMutation = useAddCollateral(loanId);
  const updateMutation = useUpdateCollateral(loanId);
  const deleteMutation = useDeleteCollateral(loanId);
  const { data: pricingRules } = useAssetPricingList({ page: 1, limit: 50, isActive: true });
  const { data: areaTree = [] } = useAreaTree();

  const communes = useMemo(() => areaTree[0]?.communes ?? [], [areaTree]);
  const filterHamlets = useMemo(
    () => communes.find((c) => c.id === filterCommuneId)?.hamlets ?? [],
    [communes, filterCommuneId],
  );

  const filteredCollaterals = useMemo(() => {
    return collaterals.filter((item) => {
      if (filterCommuneId && item.communeId !== filterCommuneId) return false;
      if (filterHamletId && item.hamletId !== filterHamletId) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchCode = (item.assetCode || '').toLowerCase().includes(kw);
        const matchGcn = item.certificateNumber.toLowerCase().includes(kw);
        const matchPlot = `${item.sheetNumber}/${item.plotNumber}`.toLowerCase().includes(kw);
        const matchAddress = (item.address || '').toLowerCase().includes(kw);
        if (!matchCode && !matchGcn && !matchPlot && !matchAddress) return false;
      }
      return true;
    });
  }, [collaterals, filterCommuneId, filterHamletId, searchKeyword]);

  const totalValuation = collaterals.reduce(
    (sum, item) => sum + (Number(item.valuationAmount) || 0),
    0,
  );
  const maxAllowedLoan = Math.floor(totalValuation * BUSINESS_LIMITS.MAX_LTV_RATIO);
  const minRequiredValuation = Math.ceil(loanAmount / BUSINESS_LIMITS.MAX_LTV_RATIO);
  const isLtvSatisfied = totalValuation >= minRequiredValuation;

  const schema = useMemo(() => createCollateralFormSchema(loanType), [loanType]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
  } = useForm<CollateralFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: '',
      certificateNumber: '',
      sheetNumber: '',
      plotNumber: '',
      area: 1000,
      actualArea: null,
      pricePerSqMeter: null,
      origin: 'Nhà nước công nhận quyền sử dụng đất',
      usagePurpose: 'Đất chuyên trồng lúa nước',
      usageDuration: 'Lâu dài',
      useRestrictions: 'Không',
      issuePlace: 'Sở Tài nguyên và Môi trường',
      issueDate: '',
      provinceId: areaTree[0]?.id ?? '',
      communeId: '',
      hamletId: '',
      addressDetail: '',
      address: '',
      valuationMethod: isUnsecured ? null : ValuationMethod.BANG_GIA_QUY,
      valuationAmount: 0,
      ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
    },
  });

  const watchedOwnerType = useWatch({ control, name: 'ownerType' });
  const watchedArea = useWatch({ control, name: 'area' });
  const watchedActualArea = useWatch({ control, name: 'actualArea' });
  const watchedThirdPartyIdNumber = useWatch({ control, name: 'thirdPartyInfo.idNumber' });
  const watchedThirdPartyIdType = useWatch({ control, name: 'thirdPartyInfo.idType' });
  const isThirdParty = watchedOwnerType === CollateralOwnerType.BAO_LANH;

  // Tự động nhận diện giới tính và năm sinh từ số CCCD người bảo lãnh (Mục 3.1)
  useEffect(() => {
    if (watchedThirdPartyIdNumber) {
      const parsed = parseCitizenIdInfo(watchedThirdPartyIdNumber);
      if (parsed) {
        setValue('thirdPartyInfo.gender', parsed.gender, { shouldValidate: true, shouldDirty: true });
        setValue('thirdPartyInfo.yearOfBirth', parsed.yearOfBirth, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedThirdPartyIdNumber, setValue]);

  // Tự động điền nơi cấp theo loại giấy tờ của người bảo lãnh (Mục 3.5)
  useEffect(() => {
    if (watchedThirdPartyIdType) {
      setValue('thirdPartyInfo.idIssuePlace', getCanonicalIdIssuePlace(watchedThirdPartyIdType), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedThirdPartyIdType, setValue]);

  const openCreate = () => {
    setEditingItem(null);
    // Địa bàn tài sản hoàn toàn độc lập với địa bàn người vay: người dùng tự chọn Tỉnh -> Xã -> Ấp riêng
    reset({
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: `TS-${Date.now().toString().slice(-5)}`,
      certificateNumber: '',
      sheetNumber: '',
      plotNumber: '',
      area: 1000,
      actualArea: null,
      pricePerSqMeter: null,
      origin: 'Nhà nước công nhận quyền sử dụng đất',
      usagePurpose: 'Đất trồng cây lâu năm',
      usageDuration: 'Lâu dài',
      useRestrictions: 'Không',
      issuePlace: 'Sở Tài nguyên và Môi trường',
      issueDate: '',
      provinceId: areaTree[0]?.id ?? '',
      communeId: '',
      hamletId: '',
      addressDetail: '',
      address: '',
      valuationMethod: isUnsecured ? null : ValuationMethod.BANG_GIA_QUY,
      valuationAmount: 0,
      ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
    });
    setDrawerOpen(true);
  };

  const openEdit = (item: Collateral) => {
    setEditingItem(item);
    reset({
      assetType: item.assetType,
      assetCode: item.assetCode ?? '',
      certificateNumber: item.certificateNumber,
      sheetNumber: item.sheetNumber,
      plotNumber: item.plotNumber,
      area: item.area,
      actualArea: item.actualArea ?? null,
      pricePerSqMeter: item.pricePerSqMeter ?? null,
      origin: item.origin ?? '',
      usagePurpose: item.usagePurpose ?? '',
      usageDuration: item.usageDuration ?? '',
      useRestrictions: item.useRestrictions ?? '',
      issuePlace: item.issuePlace ?? '',
      issueDate: item.issueDate ? item.issueDate.slice(0, 10) : '',
      provinceId: item.provinceId ?? areaTree[0]?.id ?? '',
      communeId: item.communeId ?? '',
      hamletId: item.hamletId ?? '',
      addressDetail: item.addressDetail ?? '',
      address: item.address ?? '',
      valuationMethod: item.valuationMethod ?? (isUnsecured ? null : ValuationMethod.BANG_GIA_QUY),
      valuationAmount: item.valuationAmount ?? 0,
      ownerType: item.ownerType,
      thirdPartyInfo: item.thirdPartyInfo ?? undefined,
    });
    setDrawerOpen(true);
  };

  const handleCalculateFundPricing = async () => {
    if (!selectedLandCategory || !watchedArea || watchedArea <= 0) return;
    setIsCalculatingPrice(true);
    try {
      const { effectiveArea, areaSource } = resolveEffectiveCollateralArea(
        watchedArea,
        watchedActualArea
      );
      const calc = await assetPricingApi.calculate({
        landCategory: selectedLandCategory,
        area: effectiveArea,
      });
      const floored = calculateFlooredValuationAmount(effectiveArea, calc.pricePerSqMeter);
      setValue('valuationMethod', ValuationMethod.BANG_GIA_QUY, { shouldValidate: true });
      setValue('valuationAmount', floored, { shouldValidate: true });
      setValue('pricePerSqMeter', calc.pricePerSqMeter, { shouldValidate: true });
      const areaSourceText =
        areaSource === 'ACTUAL_AREA'
          ? `Diện tích thực (${formatArea(effectiveArea)})`
          : `Diện tích GCN (${formatArea(effectiveArea)})`;
      notifySuccess(
        `Định giá tự động: ${formatVND(floored)}`,
        `${areaSourceText} × ${formatVND(calc.pricePerSqMeter)}/m² (${calc.landCategory})`,
      );
    } catch (err) {
      notifyApiError(err);
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  const onSubmit = async (values: CollateralFormValues) => {
    const payload = {
      ...values,
      assetCode: values.assetCode.trim(),
      certificateNumber: values.certificateNumber.trim(),
      issueDate: values.issueDate || undefined,
      valuationMethod: isUnsecured ? null : values.valuationMethod,
      valuationAmount: isUnsecured ? 0 : (values.valuationAmount ?? 0),
      thirdPartyInfo: isThirdParty ? values.thirdPartyInfo : undefined,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, payload });
        notifySuccess(`Đã cập nhật tài sản ${values.assetCode}`);
      } else {
        await addMutation.mutateAsync(payload);
        notifySuccess(
          isUnsecured
            ? `Đã thêm tài sản kê khai ${values.assetCode}`
            : `Đã thêm tài sản thế chấp ${values.assetCode}`,
        );
      }
      setDrawerOpen(false);
    } catch (err) {
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            {isUnsecured
              ? `Tài sản kê khai (${collaterals.length})`
              : `Tài sản thế chấp (${collaterals.length})`}
          </CardTitle>
          <CardDescription>
            {isUnsecured ? (
              <>
                Khoản vay tín chấp bắt buộc phải kê khai thông tin tài sản (QSDĐ), nhưng{' '}
                <strong>không yêu cầu định giá tài sản</strong> và{' '}
                <strong>không cần Hợp đồng thế chấp</strong>.
              </>
            ) : (
              <>
                Tổng giá trị định giá tối thiểu phải đạt{' '}
                <strong className="text-slate-800 tabular-nums">
                  {formatVND(minRequiredValuation)}
                </strong>{' '}
                (tỷ lệ cho vay tối đa 70% giá trị tài sản). Mỗi tài sản có{' '}
                <strong>Mã tài sản duy nhất</strong> và <strong>Địa bàn riêng</strong>.
              </>
            )}
          </CardDescription>
        </div>

        {!readOnly && (
          <Can perm="collateral:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Thêm tài sản (Sổ đỏ)
            </Button>
          </Can>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Thanh kiểm tra điều kiện tài sản theo loại khoản vay */}
        {isUnsecured ? (
          <Alert
            tone={collaterals.length > 0 ? 'success' : 'warning'}
            title={
              collaterals.length > 0
                ? `Đã kê khai ${collaterals.length} tài sản cho hồ sơ vay tín chấp`
                : 'Chưa kê khai thông tin tài sản cho hồ sơ vay tín chấp'
            }
          >
            Hồ sơ vay tín chấp bắt buộc phải kê khai ít nhất 01 tài sản (Giấy chứng nhận QSDĐ) trước khi hoàn thành hồ sơ, không yêu cầu định giá và không cần lập Hợp đồng thế chấp.
          </Alert>
        ) : (
          <Alert
            tone={isLtvSatisfied ? 'success' : 'warning'}
            title={
              isLtvSatisfied
                ? `Đạt điều kiện thế chấp: Tổng định giá ${formatVND(totalValuation)} (Cho vay tối đa 70% = ${formatVND(maxAllowedLoan)})`
                : `Chưa đủ giá trị tài sản đảm bảo: Hiện có ${formatVND(totalValuation)} / Cần tối thiểu ${formatVND(minRequiredValuation)}`
            }
          >
            Số tiền vay đề nghị: <strong className="tabular-nums">{formatVND(loanAmount)}</strong>.
            {!isLtvSatisfied &&
              ` Còn thiếu định giá tối thiểu ${formatVND(minRequiredValuation - totalValuation)} để hoàn thành hồ sơ thế chấp.`}
          </Alert>
        )}

        {/* Thanh tìm kiếm & lọc tài sản theo Mã TS, Số GCN, Xã, Ấp */}
        {collaterals.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo Mã tài sản, Số GCN, Tờ/Thửa hoặc địa chỉ..."
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none"
              />
            </div>

            <select
              aria-label="Lọc tài sản theo Xã"
              value={filterCommuneId}
              onChange={(e) => {
                setFilterCommuneId(e.target.value);
                setFilterHamletId('');
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
            >
              <option value="">Tất cả Xã có tài sản</option>
              {communes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc tài sản theo Ấp"
              disabled={!filterCommuneId}
              value={filterHamletId}
              onChange={(e) => setFilterHamletId(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 focus:border-primary-600 focus:outline-none"
            >
              <option value="">
                {filterCommuneId ? 'Tất cả Ấp trong xã' : 'Chọn Xã để lọc Ấp'}
              </option>
              {filterHamlets.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {collaterals.length === 0 ? (
          <EmptyState
            title="Chưa có tài sản thế chấp nào"
            description="Thêm Giấy chứng nhận quyền sử dụng đất (Sổ đỏ) kèm địa bàn Tỉnh → Xã → Ấp riêng của từng tài sản."
            icon={<LandPlot className="h-6 w-6" />}
            action={
              !readOnly ? (
                <Can perm="collateral:create">
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={openCreate}
                  >
                    Thêm tài sản thế chấp
                  </Button>
                </Can>
              ) : undefined
            }
          />
        ) : filteredCollaterals.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài sản khớp bộ lọc"
            description="Thử xóa từ khóa tìm kiếm hoặc chọn lại bộ lọc Xã / Ấp."
            icon={<LandPlot className="h-6 w-6" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Mã TS (Duy nhất) / Số GCN</th>
                  <th className="px-3.5 py-2.5">Loại tài sản & Thửa đất</th>
                  <th className="px-3.5 py-2.5">Địa bàn tài sản (Ấp → Xã → Tỉnh)</th>
                  <th className="px-3.5 py-2.5 text-right">Diện tích</th>
                  <th className="px-3.5 py-2.5">Chủ sở hữu</th>
                  <th className="px-3.5 py-2.5 text-right">Giá trị định giá</th>
                  {!readOnly && <th className="px-3.5 py-2.5 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCollaterals.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-semibold text-primary-700">
                        {item.assetCode || '—'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Số GCN: {item.certificateNumber}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-medium text-slate-900">
                        {COLLATERAL_ASSET_TYPE_LABELS[item.assetType]}
                      </div>
                      <div className="text-xs text-slate-500">
                        Tờ: <strong>{item.sheetNumber}</strong> · Thửa:{' '}
                        <strong>{item.plotNumber}</strong>
                        {item.usagePurpose ? ` · ${item.usagePurpose}` : ''}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      {item.hamletName || item.communeName ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>
                              {[item.hamletName, item.communeName].filter(Boolean).join(', ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.address || item.provinceName || 'Tỉnh Vĩnh Long'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {item.address || 'Chưa cập nhật địa bàn'}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="font-medium tabular-nums text-slate-900">
                        {formatArea(item.area)}
                      </div>
                      {item.actualArea ? (
                        <div className="text-[11px] font-medium text-primary-700">
                          Thực tế: {formatArea(item.actualArea)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-3">
                      <Badge tone="neutral">{COLLATERAL_OWNER_TYPE_LABELS[item.ownerType]}</Badge>
                      {item.thirdPartyInfo && (
                        <div className="mt-1 text-xs text-slate-500">
                          BL: {item.thirdPartyInfo.fullName} ({item.thirdPartyInfo.idNumber})
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      {isUnsecured && (!item.valuationAmount || item.valuationAmount <= 0) ? (
                        <span className="text-xs italic text-slate-500">
                          Không định giá (Tín chấp)
                        </span>
                      ) : (
                        <>
                          <div className="font-bold text-slate-900 tabular-nums">
                            {formatVND(item.valuationAmount ?? 0)}
                          </div>
                          {item.valuationMethod && (
                            <div className="text-[11px] text-slate-500">
                              {VALUATION_METHOD_LABELS[item.valuationMethod]}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-3.5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Can perm="collateral:update">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Pencil className="h-3.5 w-3.5" />}
                              onClick={() => openEdit(item)}
                            >
                              Sửa
                            </Button>
                          </Can>
                          <Can perm="collateral:delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger-600"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeletingItem(item)}
                            >
                              Xóa
                            </Button>
                          </Can>
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

      {/* Drawer thêm / sửa TSTC */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="xl">
          <DrawerHeader
            title={
              editingItem
                ? `Chỉnh sửa tài sản thế chấp (${editingItem.assetCode})`
                : 'Thêm tài sản thế chấp (Giấy chứng nhận QSDĐ)'
            }
            description="Mã số tài sản phải duy nhất toàn hệ thống; Số GCN được phép trùng khi nhiều thửa đất chung 1 sổ đỏ. Địa bàn tài sản chọn độc lập theo Tỉnh → Xã → Ấp."
          />
          <DrawerBody>
            <form
              id="collateral-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectField
                  control={control}
                  name="assetType"
                  label="Loại tài sản thế chấp"
                  required
                  options={Object.entries(COLLATERAL_ASSET_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  wrapperClassName="sm:col-span-2"
                />
                <FormTextField
                  control={control}
                  name="assetCode"
                  label="Mã số tài sản (Duy nhất)"
                  required
                  placeholder="VD: TS-2026-001"
                  hint="Bắt buộc duy nhất trên toàn hệ thống, không được trùng với tài sản khác"
                />
                <FormTextField
                  control={control}
                  name="certificateNumber"
                  label="Số phát hành GCN (Sổ đỏ)"
                  required
                  placeholder="VD: CS 012345"
                  hint="Cho phép nhiều tài sản có cùng Số GCN"
                />
                <FormTextField
                  control={control}
                  name="sheetNumber"
                  label="Số tờ bản đồ"
                  required
                  placeholder="VD: 12"
                />
                <FormTextField
                  control={control}
                  name="plotNumber"
                  label="Số thửa đất"
                  required
                  placeholder="VD: 345"
                />
                <FormNumberField
                  control={control}
                  name="area"
                  label="Diện tích trên GCN"
                  required
                  allowDecimal
                  unit="m²"
                  hint="Diện tích pháp lý trên sổ đỏ"
                />
                <FormNumberField
                  control={control}
                  name="actualArea"
                  label="Diện tích thực tế (Thẩm định)"
                  allowDecimal
                  unit="m²"
                  hint="Tùy chọn. Ưu tiên dùng để tính giá trị định giá"
                />
                <FormDateField
                  control={control}
                  name="issueDate"
                  label="Ngày cấp GCN"
                />
                <FormTextField
                  control={control}
                  name="issuePlace"
                  label="Nơi cấp GCN"
                  wrapperClassName="sm:col-span-2"
                />
                <FormTextField
                  control={control}
                  name="usagePurpose"
                  label="Mục đích sử dụng đất"
                  placeholder="VD: Đất chuyên trồng lúa nước"
                />
                <FormTextField
                  control={control}
                  name="usageDuration"
                  label="Thời hạn sử dụng"
                  placeholder="VD: Lâu dài / Đến năm 2070"
                />
              </div>

              {/* Địa bàn riêng của tài sản thế chấp */}
              <FormAreaCascadeFields
                control={control}
                setValue={setValue}
                provinceField="provinceId"
                communeField="communeId"
                hamletField="hamletId"
                addressDetailField="addressDetail"
                fullAddressField="address"
                sectionTitle="Địa bàn nơi có tài sản thế chấp (Tỉnh → Xã → Ấp)"
                sectionHint="Độc lập với địa chỉ người vay. Cấp Ấp có thể bỏ trống nếu không rõ."
                required={false}
                hamletRequired={false}
              />

              {/* Khối định giá tài sản (chỉ bắt buộc với Vay thế chấp) */}
              {isUnsecured ? (
                <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-3.5 text-xs text-primary-900">
                  <strong>Khoản vay tín chấp:</strong> Chỉ kê khai thông tin Giấy chứng nhận QSDĐ và địa bàn tài sản, không yêu cầu định giá tài sản.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <SelectInput
                      label="Tra cứu nhanh theo Bảng giá đất của Quỹ"
                      value={selectedLandCategory}
                      onChange={(e) => setSelectedLandCategory(e.target.value)}
                      placeholder="-- Chọn loại đất để tự động nhân với diện tích --"
                      options={(pricingRules?.items ?? []).map((r) => ({
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
                      isLoading={isCalculatingPrice}
                      leftIcon={<Calculator className="h-4 w-4" />}
                      onClick={handleCalculateFundPricing}
                    >
                      Tính theo bảng giá
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormSelectField
                      control={control}
                      name="valuationMethod"
                      label="Phương pháp định giá"
                      required
                      options={Object.entries(VALUATION_METHOD_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                    <FormCurrencyField
                      control={control}
                      name="valuationAmount"
                      label="Giá trị định giá tài sản"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Chủ sở hữu & Bên thứ ba bảo lãnh */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <FormSelectField
                  control={control}
                  name="ownerType"
                  label="Tư cách chủ sở hữu đứng tên trên GCN"
                  required
                  options={Object.entries(COLLATERAL_OWNER_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />

                {isThirdParty && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                      Thông tin bên thứ ba bảo lãnh (bắt buộc)
                    </h5>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormTextField
                        control={control}
                        name="thirdPartyInfo.fullName"
                        label="Họ tên người bảo lãnh"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <FormNumberField
                          control={control}
                          name="thirdPartyInfo.yearOfBirth"
                          label="Năm sinh"
                          disabled
                          hint="Tự động từ CCCD"
                        />
                        <FormSelectField
                          control={control}
                          name="thirdPartyInfo.gender"
                          label="Giới tính"
                          disabled
                          hint="Tự động từ CCCD"
                          options={[
                            { value: Gender.NAM, label: GENDER_LABELS.NAM },
                            { value: Gender.NU, label: GENDER_LABELS.NU },
                          ]}
                        />
                      </div>
                      <FormSelectField
                        control={control}
                        name="thirdPartyInfo.idType"
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
                        name="thirdPartyInfo.idNumber"
                        label="Số CCCD"
                        required
                        digitsOnly
                        maxLength={12}
                        hint="Tự động tính giới tính & năm sinh"
                      />
                      <FormTextField
                        control={control}
                        name="thirdPartyInfo.idIssuePlace"
                        label="Nơi cấp"
                        disabled
                        hint="Tự động theo loại giấy tờ"
                      />
                      <FormTextField
                        control={control}
                        name="thirdPartyInfo.address"
                        label="Địa chỉ thường trú"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="collateral-form"
              isLoading={addMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? 'Cập nhật tài sản' : 'Lưu tài sản thế chấp'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Xác nhận xóa TSTC */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title={`Xóa tài sản thế chấp ${deletingItem?.assetCode ?? ''}?`}
        description={
          deletingItem
            ? `Giấy chứng nhận số ${deletingItem.certificateNumber}${deletingItem.valuationAmount && deletingItem.valuationAmount > 0
              ? ` (định giá ${formatVND(deletingItem.valuationAmount)})`
              : ''
            } sẽ bị gỡ khỏi hồ sơ vay này.`
            : undefined
        }
        confirmText="Xóa tài sản"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
            notifySuccess(`Đã xóa tài sản ${deletingItem.assetCode}`);
            setDeletingItem(null);
          } catch (err) {
            setDeletingItem(null);
            notifyApiError(err);
          }
        }}
      />
    </Card>
  );
}
