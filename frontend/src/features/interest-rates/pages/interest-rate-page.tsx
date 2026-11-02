import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { LoanTermType } from '@/shared/types';
import { LOAN_TERM_TYPE_LABELS } from '@/shared/constants';
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
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import {
  useCreateInterestRate,
  useCurrentInterestRate,
  useInterestRatesList,
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

const createRateSchema = z.object({
  termType: z.nativeEnum(LoanTermType),
  effectiveDate: apiDateStringSchema('Ngày bắt đầu hiệu lực'),
  note: z.string().trim().optional(),
  tiers: z.array(tierSchema).min(1, 'Cần ít nhất 1 bậc lãi suất'),
});

type CreateRateValues = z.infer<typeof createRateSchema>;

function CurrentRateCard({
  termType,
  config,
}: {
  termType: LoanTermType;
  config?: InterestRateConfig;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{LOAN_TERM_TYPE_LABELS[termType]}</CardTitle>
          <CardDescription>
            {config
              ? `Áp dụng từ ngày ${formatDateVN(config.effectiveDate)}`
              : 'Chưa có cấu hình lãi suất đang hiệu lực'}
          </CardDescription>
        </div>
        <Badge tone={config ? 'success' : 'warning'} dot>
          {config ? 'Đang hiệu lực' : 'Chưa cấu hình'}
        </Badge>
      </CardHeader>
      <CardContent>
        {!config ? (
          <p className="text-xs text-slate-500">
            Vui lòng tạo bảng lãi suất cho kỳ hạn này để hệ thống tự động chốt lãi suất khi lập hồ
            sơ vay.
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
    </Card>
  );
}

export function InterestRatePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateRateValues | null>(null);

  const { data: shortTerm } = useCurrentInterestRate(LoanTermType.NGAN_HAN);
  const { data: mediumTerm } = useCurrentInterestRate(LoanTermType.TRUNG_HAN);
  const { data: historyList, isLoading } = useInterestRatesList({ page: 1, limit: 20 });
  const createMutation = useCreateInterestRate();

  const { control, handleSubmit, reset, setError } = useForm<CreateRateValues>({
    resolver: zodResolver(createRateSchema),
    mode: 'onTouched',
    defaultValues: {
      termType: LoanTermType.NGAN_HAN,
      effectiveDate: toApiDate(new Date()),
      note: '',
      tiers: [
        { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
        { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tiers',
  });

  const handleConfirmCreate = async () => {
    if (!pendingValues) return;
    try {
      await createMutation.mutateAsync({
        ...pendingValues,
        isActive: true,
      });
      notifySuccess('Đã ban hành bảng lãi suất mới');
      setPendingValues(null);
      setDrawerOpen(false);
      reset();
    } catch (err) {
      setPendingValues(null);
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Bảng lãi suất"
        description="Cấu hình bậc lãi suất theo hạn mức tiền vay và kỳ hạn. Các khoản vay đã tạo sẽ giữ nguyên lãi suất tại thời điểm ký."
        actions={
          <Can perm="interest-rate:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setDrawerOpen(true)}
            >
              Ban hành bảng lãi suất mới
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CurrentRateCard termType={LoanTermType.NGAN_HAN} config={shortTerm} />
        <CurrentRateCard termType={LoanTermType.TRUNG_HAN} config={mediumTerm} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lịch sử các bảng lãi suất đã ban hành</CardTitle>
            <CardDescription>
              Bảng lãi suất không chỉnh sửa trực tiếp để đảm bảo tính toàn vẹn đối soát lịch sử
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
                    <th className="px-4 py-2.5">Kỳ hạn áp dụng</th>
                    <th className="px-4 py-2.5">Các bậc lãi suất</th>
                    <th className="px-4 py-2.5">Ghi chú</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(historyList?.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatDateVN(item.effectiveDate)}
                      </td>
                      <td className="px-4 py-3">{LOAN_TERM_TYPE_LABELS[item.termType]}</td>
                      <td className="px-4 py-3 text-xs">
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
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.note || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.isActive ? 'success' : 'neutral'} dot>
                          {item.isActive ? 'Hiệu lực' : 'Ngưng áp dụng'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer tạo bảng lãi suất mới */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="xl">
          <DrawerHeader
            title="Ban hành cấu hình Bảng lãi suất mới"
            description="Thiết lập các bậc tiền vay và lãi suất năm tương ứng."
          />
          <DrawerBody>
            <form
              id="create-rate-form"
              onSubmit={handleSubmit((vals) => setPendingValues(vals))}
              noValidate
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <FormDateField
                  control={control}
                  name="effectiveDate"
                  label="Ngày bắt đầu hiệu lực"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Danh sách bậc lãi suất ({fields.length})
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
                    className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-7"
                  >
                    <div className="sm:col-span-3">
                      <FormCurrencyField
                        control={control}
                        name={`tiers.${index}.minAmount`}
                        label={`Bậc #${index + 1}: Từ mức (VNĐ)`}
                        required
                        showWords={false}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FormCurrencyField
                        control={control}
                        name={`tiers.${index}.maxAmount`}
                        label="Đến mức (VNĐ)"
                        required
                        showWords={false}
                      />
                    </div>
                    <div className="flex items-end gap-1.5 sm:col-span-1">
                      <FormNumberField
                        control={control}
                        name={`tiers.${index}.annualRate`}
                        label="%/năm"
                        required
                        allowDecimal
                        wrapperClassName="flex-1"
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Xóa bậc lãi suất"
                          onClick={() => remove(index)}
                          className="text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <FormTextareaField
                control={control}
                name="note"
                label="Căn cứ quyết định / Ghi chú"
                placeholder="VD: Theo Quyết định số 12/QĐ-HĐQT ngày..."
              />
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="create-rate-form">
              Tiếp tục xác nhận
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Xác nhận ban hành bảng lãi suất mới?"
        description={
          pendingValues
            ? `Bảng lãi suất cho ${LOAN_TERM_TYPE_LABELS[pendingValues.termType]} sẽ có hiệu lực từ ngày ${formatDateVN(pendingValues.effectiveDate)} cho các khoản vay tạo mới.`
            : undefined
        }
        confirmText="Xác nhận ban hành"
        isLoading={createMutation.isPending}
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
}

