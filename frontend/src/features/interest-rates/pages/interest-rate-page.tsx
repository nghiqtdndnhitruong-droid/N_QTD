import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, Layers, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { LoanTermType, LoanType } from '@/shared/types';
import { LOAN_TERM_TYPE_LABELS, LOAN_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND, toApiDate } from '@/shared/format';
import { apiDateStringSchema, nonNegativeVndSchema, positiveVndSchema } from '@/shared/validation';
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
  FormCurrencyField,
  FormDateField,
  FormNumberField,
  FormSelectField,
  FormTextareaField,
} from '@/components/form';
import { Alert, ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import {
  useCreateInterestRate,
  useCurrentInterestRate,
  useDeleteInterestRate,
  useInterestRatesList,
  useUpdateInterestRate,
} from '../hooks/use-interest-rates';
import type { InterestRateConfig } from '../types/interest-rate.types';

const tierSchema = z
  .object({
    minAmount: nonNegativeVndSchema('Mức vay tối thiểu'),
    maxAmount: positiveVndSchema('Mức vay tối đa'),
    annualRate: z
      .number({ required_error: 'Lãi suất là bắt buộc' })
      .positive('Lãi suất phải > 0')
      .max(100, 'Lãi suất không vượt quá 100%/năm'),
  })
  .refine((t) => t.maxAmount > t.minAmount, {
    path: ['maxAmount'],
    message: 'Mức tối đa phải lớn hơn mức tối thiểu',
  });

const rateConfigFormSchema = z
  .object({
    loanType: z.nativeEnum(LoanType),
    termType: z.nativeEnum(LoanTermType).optional(),
    effectiveDate: apiDateStringSchema('Ngày bắt đầu hiệu lực'),
    note: z.string().trim().optional(),
    unsecuredRate: z.coerce
      .number({ invalid_type_error: 'Vui lòng nhập lãi suất hợp lệ' })
      .positive('Lãi suất phải > 0')
      .max(100, 'Lãi suất không vượt quá 100%/năm')
      .optional(),
    tiers: z.array(tierSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.loanType === LoanType.THE_CHAP) {
      if (!val.termType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['termType'],
          message: 'Vui lòng chọn kỳ hạn áp dụng cho vay thế chấp',
        });
      }
      if (!val.tiers || val.tiers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers'],
          message: 'Cần ít nhất 1 bậc lãi suất cho vay thế chấp',
        });
      }
    } else if (val.loanType === LoanType.TIN_CHAP) {
      if (
        val.unsecuredRate === undefined ||
        val.unsecuredRate === null ||
        Number.isNaN(val.unsecuredRate)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['unsecuredRate'],
          message: 'Vui lòng nhập mức lãi suất năm cho vay tín chấp',
        });
      }
    }
  });

type RateConfigFormValues = z.infer<typeof rateConfigFormSchema>;

function CurrentSecuredRateCard({
  title,
  config,
}: {
  title: string;
  config?: InterestRateConfig;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                {config
                  ? `Áp dụng từ ${formatDateVN(config.effectiveDate)}`
                  : 'Chưa có cấu hình lãi suất đang hiệu lực'}
              </CardDescription>
            </div>
          </div>
          <Badge tone={config ? 'success' : 'warning'} dot>
            {config ? 'Đang hiệu lực' : 'Chưa cấu hình'}
          </Badge>
        </CardHeader>
        <CardContent>
          {!config ? (
            <p className="text-xs text-slate-500">
              Vui lòng tạo bảng lãi suất cho kỳ hạn này để hệ thống tự động gợi ý lãi suất khi lập hồ sơ vay.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-2">Mức tiền vay (VNĐ)</th>
                  <th className="pb-2 text-right">Lãi suất năm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {config.tiers.map((tier, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium text-slate-800 tabular-nums">
                      {formatVND(tier.minAmount)} – {formatVND(tier.maxAmount)}
                    </td>
                    <td className="py-2 text-right font-bold text-primary-700 tabular-nums">
                      {formatInterestRate(tier.annualRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

function CurrentUnsecuredRateCard({ config }: { config?: InterestRateConfig }) {
  const singleRate = config?.tiers?.[0]?.annualRate;

  return (
    <Card className="flex flex-col justify-between border-primary-200/70 bg-gradient-to-br from-primary-50/40 via-white to-white">
      <div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <div>
              <CardTitle className="text-base">Vay Tín chấp (Tất cả kỳ hạn)</CardTitle>
              <CardDescription>
                {config
                  ? `Áp dụng từ ${formatDateVN(config.effectiveDate)}`
                  : 'Chưa có cấu hình lãi suất tín chấp'}
              </CardDescription>
            </div>
          </div>
          <Badge tone={config ? 'success' : 'warning'} dot>
            {config ? 'Đang hiệu lực' : 'Chưa cấu hình'}
          </Badge>
        </CardHeader>
        <CardContent>
          {!config || singleRate === undefined ? (
            <p className="text-xs text-slate-500">
              Vui lòng ban hành mốc lãi suất tín chấp để áp dụng cho toàn bộ các khoản vay tín chấp.
            </p>
          ) : (
            <div className="space-y-2 rounded-lg border border-primary-100 bg-white p-3.5 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Mức lãi suất năm áp dụng:</div>
              <div className="text-3xl font-extrabold text-primary-700 tabular-nums">
                {formatInterestRate(singleRate)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="h-3.5 w-3.5 text-primary-500" />
                <span>Áp dụng chung cho toàn bộ khoản vay tín chấp (cả ngắn hạn & trung hạn).</span>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export function InterestRatePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<InterestRateConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<InterestRateConfig | null>(null);
  const [pendingValues, setPendingValues] = useState<RateConfigFormValues | null>(null);

  const { data: shortTerm } = useCurrentInterestRate({
    loanType: LoanType.THE_CHAP,
    termType: LoanTermType.NGAN_HAN,
  });
  const { data: mediumTerm } = useCurrentInterestRate({
    loanType: LoanType.THE_CHAP,
    termType: LoanTermType.TRUNG_HAN,
  });
  const { data: unsecuredRate } = useCurrentInterestRate({
    loanType: LoanType.TIN_CHAP,
  });

  const { data: historyList, isLoading } = useInterestRatesList({ page: 1, limit: 30 });
  const createMutation = useCreateInterestRate();
  const updateMutation = useUpdateInterestRate();
  const deleteMutation = useDeleteInterestRate();

  const { control, handleSubmit, reset, setError } = useForm<RateConfigFormValues>({
    resolver: zodResolver(rateConfigFormSchema),
    mode: 'onTouched',
    defaultValues: {
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      effectiveDate: toApiDate(new Date()),
      note: '',
      unsecuredRate: 12.0,
      tiers: [
        { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
        { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
      ],
    },
  });

  const watchedLoanType = useWatch({ control, name: 'loanType' });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tiers',
  });

  const handleOpenCreate = () => {
    setEditingConfig(null);
    reset({
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      effectiveDate: toApiDate(new Date()),
      note: '',
      unsecuredRate: 12.0,
      tiers: [
        { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
        { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
      ],
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (item: InterestRateConfig) => {
    setEditingConfig(item);
    const isUnsecured = item.loanType === LoanType.TIN_CHAP;
    reset({
      loanType: item.loanType || LoanType.THE_CHAP,
      termType: item.termType || LoanTermType.NGAN_HAN,
      effectiveDate: toApiDate(new Date(item.effectiveDate)),
      note: item.note || '',
      unsecuredRate: isUnsecured ? item.tiers[0]?.annualRate ?? 12.0 : 12.0,
      tiers:
        !isUnsecured && item.tiers && item.tiers.length > 0
          ? item.tiers
          : [
              { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
              { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
            ],
    });
    setDrawerOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) return;

    const isUnsecured = pendingValues.loanType === LoanType.TIN_CHAP;
    const tiersPayload = isUnsecured
      ? [
          {
            minAmount: 0,
            maxAmount: 999_999_999_999,
            annualRate: Number(pendingValues.unsecuredRate),
          },
        ]
      : pendingValues.tiers || [];

    const payload = {
      loanType: pendingValues.loanType,
      termType: isUnsecured ? null : pendingValues.termType || null,
      effectiveDate: pendingValues.effectiveDate,
      tiers: tiersPayload,
      note: pendingValues.note,
      isActive: true,
    };

    try {
      if (editingConfig) {
        await updateMutation.mutateAsync({
          id: editingConfig.id,
          payload,
        });
        notifySuccess('Đã cập nhật cấu hình bảng lãi suất thành công');
      } else {
        await createMutation.mutateAsync(payload);
        notifySuccess('Đã ban hành bảng lãi suất mới thành công');
      }
      setPendingValues(null);
      setDrawerOpen(false);
      setEditingConfig(null);
    } catch (err) {
      setPendingValues(null);
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingConfig) return;
    try {
      await deleteMutation.mutateAsync(deletingConfig.id);
      notifySuccess('Đã xóa mốc cấu hình lãi suất thành công');
      setDeletingConfig(null);
    } catch (err) {
      notifyApiError(err);
      setDeletingConfig(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Bảng lãi suất"
        description="Cấu hình lãi suất vay vốn: Cho vay Thế chấp theo bậc tiền vay & kỳ hạn; Cho vay Tín chấp áp dụng 1 mốc lãi suất duy nhất cho mọi kỳ hạn."
        actions={
          <Can perm="interest-rate:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Ban hành bảng lãi suất mới
            </Button>
          </Can>
        }
      />

      {/* Thẻ lãi suất hiện hành */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CurrentSecuredRateCard
          title="Thế chấp – Ngắn hạn (12 tháng)"
          config={shortTerm}
        />
        <CurrentSecuredRateCard
          title="Thế chấp – Trung hạn (24 tháng)"
          config={mediumTerm}
        />
        <CurrentUnsecuredRateCard config={unsecuredRate} />
      </div>

      {/* Bảng lịch sử & Quản lý */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Danh sách & Lịch sử các bảng lãi suất đã ban hành</CardTitle>
            <CardDescription>
              Xem, chỉnh sửa hoặc xóa các mốc lãi suất của Quỹ tín dụng.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-slate-500">Đang tải lịch sử lãi suất...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">Ngày hiệu lực</th>
                    <th className="px-4 py-2.5">Loại hình vay</th>
                    <th className="px-4 py-2.5">Kỳ hạn áp dụng</th>
                    <th className="px-4 py-2.5">Mức lãi suất / Các bậc</th>
                    <th className="px-4 py-2.5">Ghi chú</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(historyList?.items ?? []).map((item) => {
                    const isUnsecured = item.loanType === LoanType.TIN_CHAP;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {formatDateVN(item.effectiveDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={isUnsecured ? 'warning' : 'primary'}>
                            {LOAN_TYPE_LABELS[item.loanType || LoanType.THE_CHAP]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {isUnsecured ? (
                            <span className="font-medium text-slate-600">
                              Tất cả kỳ hạn (Ngắn & Trung hạn)
                            </span>
                          ) : item.termType ? (
                            LOAN_TERM_TYPE_LABELS[item.termType]
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {isUnsecured ? (
                            <div className="font-semibold text-primary-700">
                              Lãi suất duy nhất:{' '}
                              <span className="text-sm font-bold text-emerald-700">
                                {formatInterestRate(item.tiers[0]?.annualRate ?? 0)}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {item.tiers.map((t, idx) => (
                                <div key={idx} className="tabular-nums">
                                  {formatVND(t.minAmount)} → {formatVND(t.maxAmount)}:{' '}
                                  <strong className="text-primary-700">
                                    {formatInterestRate(t.annualRate)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.note || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={item.isActive ? 'success' : 'neutral'} dot>
                            {item.isActive ? 'Hiệu lực' : 'Ngưng áp dụng'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Can perm="interest-rate:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => handleOpenEdit(item)}
                              >
                                Sửa
                              </Button>
                            </Can>
                            <Can perm="interest-rate:delete">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => setDeletingConfig(item)}
                              >
                                Xóa
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer Tạo mới / Chỉnh sửa bảng lãi suất */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="xl">
          <DrawerHeader
            title={
              editingConfig
                ? 'Chỉnh sửa cấu hình Bảng lãi suất'
                : 'Ban hành cấu hình Bảng lãi suất mới'
            }
            description={
              watchedLoanType === LoanType.TIN_CHAP
                ? 'Vay tín chấp chỉ có 1 mốc lãi suất duy nhất, áp dụng chung cho toàn bộ các khoản vay tín chấp (cả ngắn hạn và trung hạn).'
                : 'Vay thế chấp thiết lập theo kỳ hạn và danh sách nhiều bậc tiền vay.'
            }
          />
          <DrawerBody>
            <form
              id="rate-config-form"
              onSubmit={handleSubmit((vals) => setPendingValues(vals))}
              noValidate
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormSelectField
                  control={control}
                  name="loanType"
                  label="Loại hình vay vốn"
                  required
                  options={[
                    { value: LoanType.THE_CHAP, label: LOAN_TYPE_LABELS.THE_CHAP },
                    { value: LoanType.TIN_CHAP, label: LOAN_TYPE_LABELS.TIN_CHAP },
                  ]}
                />
                {watchedLoanType === LoanType.THE_CHAP ? (
                  <FormSelectField
                    control={control}
                    name="termType"
                    label="Kỳ hạn áp dụng"
                    required
                    options={[
                      { value: LoanTermType.NGAN_HAN, label: LOAN_TERM_TYPE_LABELS.NGAN_HAN },
                      { value: LoanTermType.TRUNG_HAN, label: LOAN_TERM_TYPE_LABELS.TRUNG_HAN },
                    ]}
                  />
                ) : (
                  <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Kỳ hạn áp dụng:</span>
                    <span>Tất cả các kỳ hạn (Ngắn hạn & Trung hạn)</span>
                  </div>
                )}
                <FormDateField
                  control={control}
                  name="effectiveDate"
                  label="Ngày bắt đầu hiệu lực"
                  required
                />
              </div>

              {/* Nhập mốc lãi suất cho TÍN CHẤP */}
              {watchedLoanType === LoanType.TIN_CHAP ? (
                <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/40 p-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-900">
                      Mốc lãi suất cho vay Tín chấp
                    </span>
                  </div>
                  <Alert tone="info">
                    Khoản vay tín chấp chỉ có 1 mốc lãi suất duy nhất sẽ tự động áp dụng cho toàn bộ các khoản vay tín chấp của Quỹ (kể cả ngắn hạn hay trung hạn, không phân chia theo số tiền).
                  </Alert>
                  <div className="max-w-sm">
                    <FormNumberField
                      control={control}
                      name="unsecuredRate"
                      label="Mức lãi suất năm (%/năm)"
                      unit="%"
                      required
                      allowDecimal
                      placeholder="VD: 12.5"
                    />
                  </div>
                </div>
              ) : (
                /* Nhập các bậc lãi suất cho THẾ CHẤP */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Danh sách bậc lãi suất theo mức tiền vay ({fields.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() =>
                        append({
                          minAmount: 0,
                          maxAmount: 100_000_000,
                          annualRate: 10,
                        })
                      }
                    >
                      Thêm bậc
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-4">
                        <FormCurrencyField
                          control={control}
                          name={`tiers.${index}.minAmount`}
                          label={`Bậc #${index + 1}: Từ mức (VNĐ)`}
                          required
                          showWords={false}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <FormCurrencyField
                          control={control}
                          name={`tiers.${index}.maxAmount`}
                          label="Đến mức (VNĐ)"
                          required
                          showWords={false}
                        />
                      </div>
                      <div className="flex items-end gap-2 sm:col-span-4">
                        <div className="min-w-[130px] flex-1">
                          <FormNumberField
                            control={control}
                            name={`tiers.${index}.annualRate`}
                            label="Lãi suất (%/năm)"
                            unit="%"
                            required
                            allowDecimal
                            placeholder="VD: 10.2"
                            wrapperClassName="w-full"
                          />
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Xóa bậc lãi suất"
                            onClick={() => remove(index)}
                            className="mb-0.5 h-9 w-9 shrink-0 text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <FormTextareaField
                control={control}
                name="note"
                label="Căn cứ quyết định / Ghi chú"
                placeholder="VD: Theo Quyết định số 12/QĐ-HĐQT ngày..."
              />
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDrawerOpen(false);
                setEditingConfig(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" form="rate-config-form">
              {editingConfig ? 'Cập nhật mốc lãi suất' : 'Tiếp tục xác nhận'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Dialog xác nhận lưu */}
      <ConfirmDialog
        open={Boolean(pendingValues)}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title={
          editingConfig
            ? 'Xác nhận cập nhật cấu hình bảng lãi suất?'
            : 'Xác nhận ban hành bảng lãi suất mới?'
        }
        description={
          pendingValues
            ? pendingValues.loanType === LoanType.TIN_CHAP
              ? `Mốc lãi suất tín chấp ${formatInterestRate(pendingValues.unsecuredRate ?? 0)} sẽ có hiệu lực từ ngày ${formatDateVN(pendingValues.effectiveDate)} áp dụng cho toàn bộ các khoản vay tín chấp.`
              : `Bảng lãi suất thế chấp cho ${LOAN_TERM_TYPE_LABELS[pendingValues.termType || LoanTermType.NGAN_HAN]} sẽ có hiệu lực từ ngày ${formatDateVN(pendingValues.effectiveDate)}.`
            : undefined
        }
        confirmText={editingConfig ? 'Xác nhận cập nhật' : 'Xác nhận ban hành'}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onConfirm={handleConfirmSave}
      />

      {/* Dialog xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingConfig)}
        onOpenChange={(open) => !open && setDeletingConfig(null)}
        title="Xác nhận xóa cấu hình bảng lãi suất?"
        description={
          deletingConfig
            ? `Bạn có chắc chắn muốn xóa mốc lãi suất ${LOAN_TYPE_LABELS[deletingConfig.loanType || LoanType.THE_CHAP]} áp dụng từ ngày ${formatDateVN(deletingConfig.effectiveDate)}?`
            : undefined
        }
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
