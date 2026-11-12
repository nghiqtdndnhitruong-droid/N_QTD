import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileSpreadsheet,
  Home,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
} from '@/components/ui';
import {
  FormCurrencyField,
  FormTextField,
  FormTextareaField,
} from '@/components/form';
import { formatInterestRate, formatVND } from '@/shared/format';
import { LoanTermType } from '@/shared/types';
import { Alert, notifySuccess, notifyApiError } from '@/components/feedback';
import {
  loanPlanFormSchema,
  type LoanPlanFormValues,
} from '../schemas/loan.schema';
import {
  calculateLoanPlanTemplate,
  LOAN_PLAN_TEMPLATE_META,
  type LoanPlanTemplateCode,
} from '../utils/loan-plan-templates';
import { useUpdateLoan } from '../hooks/use-loans';
import type { Loan } from '../types/loan.types';

function ModalLoanPlanTotalsPreview({ control }: { control: Control<LoanPlanFormValues> }) {
  const expenses = useWatch({ control, name: 'expenses' }) ?? [];
  const revenues = useWatch({ control, name: 'revenues' }) ?? [];

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
  const totalRevenues = revenues.reduce((sum, r) => sum + (Number(r?.amount) || 0), 0);
  const profit = totalRevenues - totalExpenses;

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
      <div>
        <div className="text-xs font-medium text-slate-500">Tổng chi phí dự kiến</div>
        <div className="mt-1 text-base font-bold text-slate-900 tabular-nums">
          {formatVND(totalExpenses)}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Tổng nguồn thu dự kiến</div>
        <div className="mt-1 text-base font-bold text-primary-700 tabular-nums">
          {formatVND(totalRevenues)}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Lợi nhuận ròng (Thu − Chi)</div>
        <div
          className={`mt-1 text-base font-bold tabular-nums ${
            profit >= 0 ? 'text-success-700' : 'text-danger-600'
          }`}
        >
          {formatVND(profit)}
        </div>
      </div>
    </div>
  );
}

export interface LoanPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  onSuccess?: () => void;
}

export function LoanPlanModal({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: LoanPlanModalProps) {
  const [activeTemplate, setActiveTemplate] = useState<LoanPlanTemplateCode | null>(null);
  const [isTemplateManuallyEdited, setIsTemplateManuallyEdited] = useState(false);

  const updateMutation = useUpdateLoan(loan.id);

  const planForm = useForm<LoanPlanFormValues>({
    resolver: zodResolver(loanPlanFormSchema),
    mode: 'onTouched',
    defaultValues: {
      purpose: '',
      loanAmount: loan.loanAmount,
      borrowedCapital: loan.loanAmount,
      ownCapital: 0,
      expenses: [{ name: '', amount: 0 }],
      revenues: [{ name: '', amount: 0 }],
    },
  });

  const expensesArray = useFieldArray({ control: planForm.control, name: 'expenses' });
  const revenuesArray = useFieldArray({ control: planForm.control, name: 'revenues' });

  const watchedTotalCapitalDemand = useWatch({ control: planForm.control, name: 'loanAmount' }) ?? 0;
  const watchedBorrowedCapital = useWatch({ control: planForm.control, name: 'borrowedCapital' }) ?? 0;
  const isCapitalInvalid = watchedTotalCapitalDemand < watchedBorrowedCapital;

  // Khởi tạo lại form mỗi khi mở modal
  useEffect(() => {
    if (!open) return;

    if (loan.loanPlan) {
      planForm.reset({
        purpose: loan.loanPlan.purpose || '',
        loanAmount: loan.loanPlan.loanAmount || loan.loanAmount,
        borrowedCapital: loan.loanAmount,
        ownCapital: Math.max(0, (loan.loanPlan.loanAmount || loan.loanAmount) - loan.loanAmount),
        expenses: loan.loanPlan.expenses && loan.loanPlan.expenses.length > 0
          ? loan.loanPlan.expenses.map((e) => ({ name: e.name, amount: e.amount }))
          : [{ name: '', amount: 0 }],
        revenues: loan.loanPlan.revenues && loan.loanPlan.revenues.length > 0
          ? loan.loanPlan.revenues.map((r) => ({ name: r.name, amount: r.amount }))
          : [{ name: '', amount: 0 }],
      });
      // Nhận diện mẫu trước đó nếu có
      if (loan.loanPlan.purpose.includes('sửa chữa nhà') || loan.loanPlan.purpose.includes('xây dựng')) {
        setActiveTemplate('SUA_NHA');
      } else if (loan.loanPlan.purpose.includes('chăn nuôi') || loan.loanPlan.purpose.includes('bò')) {
        setActiveTemplate('CHAN_NUOI');
      } else {
        setActiveTemplate(null);
      }
      setIsTemplateManuallyEdited(true);
    } else {
      planForm.reset({
        purpose: '',
        loanAmount: loan.loanAmount,
        borrowedCapital: loan.loanAmount,
        ownCapital: 0,
        expenses: [{ name: '', amount: 0 }],
        revenues: [{ name: '', amount: 0 }],
      });
      setActiveTemplate(null);
      setIsTemplateManuallyEdited(false);
    }
  }, [open, loan, planForm]);

  // Vốn tự có = Tổng nhu cầu vốn - Số tiền vay
  useEffect(() => {
    const calculatedOwnCapital = Math.max(0, watchedTotalCapitalDemand - watchedBorrowedCapital);
    planForm.setValue('ownCapital', calculatedOwnCapital, { shouldValidate: true });
  }, [watchedTotalCapitalDemand, watchedBorrowedCapital, planForm]);

  // Áp dụng mẫu phương án vay
  const applyLoanPlanTemplate = (templateCode: LoanPlanTemplateCode) => {
    setActiveTemplate(templateCode);
    setIsTemplateManuallyEdited(false);

    const baseTotalDemand =
      watchedTotalCapitalDemand > loan.loanAmount
        ? watchedTotalCapitalDemand
        : loan.loanAmount;

    const calculated = calculateLoanPlanTemplate({
      templateCode,
      totalCapitalDemand: baseTotalDemand,
      loanAmount: loan.loanAmount,
      interestRate: loan.interestRate || 0,
      termType: loan.termType,
    });

    planForm.setValue('loanAmount', baseTotalDemand, { shouldValidate: true });
    planForm.setValue('purpose', calculated.defaultPurpose, {
      shouldValidate: true,
      shouldDirty: true,
    });
    planForm.setValue('borrowedCapital', calculated.borrowedCapital, { shouldValidate: true });
    planForm.setValue('ownCapital', calculated.ownCapital, { shouldValidate: true });
    planForm.setValue('expenses', calculated.expenses, { shouldValidate: true });
    planForm.setValue('revenues', calculated.revenues, { shouldValidate: true });

    notifySuccess(
      `Đã áp dụng ${LOAN_PLAN_TEMPLATE_META[templateCode].label}`,
      'Các khoản mục chi phí và nguồn thu đã được tính toán tự động.',
    );
  };

  const onSubmit = async (values: LoanPlanFormValues) => {
    try {
      if (values.loanAmount < loan.loanAmount) {
        planForm.setError('loanAmount', {
          type: 'validate',
          message: `Tổng nhu cầu vốn (${formatVND(values.loanAmount)}) không được nhỏ hơn Số tiền vay (${formatVND(loan.loanAmount)})`,
        });
        return;
      }

      const totalExpenses = values.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalRevenues = values.revenues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      const payload = {
        loanPlan: {
          purpose: values.purpose.trim(),
          loanAmount: values.loanAmount,
          ownCapital: Math.max(0, values.loanAmount - loan.loanAmount),
          borrowedCapital: loan.loanAmount,
          totalExpenses,
          totalRevenues,
          profit: totalRevenues - totalExpenses,
          expenses: values.expenses.map((e) => ({
            name: e.name.trim(),
            amount: Number(e.amount) || 0,
          })),
          revenues: values.revenues.map((r) => ({
            name: r.name.trim(),
            amount: Number(r.amount) || 0,
          })),
        },
      };

      await updateMutation.mutateAsync(payload);
      notifySuccess('Đã cập nhật phương án sử dụng vốn vay');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      notifyApiError(err, 'Không thể cập nhật phương án sử dụng vốn');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={planForm.handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phương án sử dụng vốn vay</DialogTitle>
            <DialogDescription>
              Điều chỉnh mục đích vay, tổng nhu cầu vốn, danh mục chi phí đầu tư và nguồn thu trả nợ.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-6 py-4">
            {/* Thanh công cụ Tải mẫu phương án vay */}
            <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-900">
                    <Sparkles className="h-4 w-4 text-primary-600" />
                    <span>Tải mẫu phương án vay chuẩn của Quỹ</span>
                    {activeTemplate && (
                      <Badge tone={isTemplateManuallyEdited ? 'warning' : 'primary'}>
                        {LOAN_PLAN_TEMPLATE_META[activeTemplate].label}
                        {isTemplateManuallyEdited ? ' (Đã sửa tay)' : ' (Tự động đồng bộ)'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Tự động phân bổ Chi phí đầu tư, Chi phí trả lãi tiền vay (Lãi suất {formatInterestRate(loan.interestRate || 0)}, Hệ số năm {loan.termType === LoanTermType.TRUNG_HAN ? '2' : '1'}) và Nguồn thu trả nợ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={activeTemplate === 'SUA_NHA' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<Home className="h-3.5 w-3.5" />}
                    onClick={() => applyLoanPlanTemplate('SUA_NHA')}
                  >
                    Tải mẫu: Mẫu sửa nhà
                  </Button>
                  <Button
                    type="button"
                    variant={activeTemplate === 'CHAN_NUOI' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                    onClick={() => applyLoanPlanTemplate('CHAN_NUOI')}
                  >
                    Tải mẫu: Mẫu chăn nuôi
                  </Button>
                  {activeTemplate && isTemplateManuallyEdited && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={() => applyLoanPlanTemplate(activeTemplate)}
                    >
                      Tính lại theo mẫu
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormTextareaField
                control={planForm.control}
                name="purpose"
                label="Mục đích vay vốn"
                required
                rows={2}
                wrapperClassName="sm:col-span-3"
              />
              <FormCurrencyField
                control={planForm.control}
                name="loanAmount"
                label="Tổng nhu cầu vốn của phương án"
                required
                hint="Tổng nhu cầu vốn (≥ Số tiền vay)"
              />
              <FormCurrencyField
                control={planForm.control}
                name="borrowedCapital"
                label="Số tiền vay đề nghị"
                required
                readOnly
                disabled
                hint="Cố định theo số tiền khoản vay"
              />
              <FormCurrencyField
                control={planForm.control}
                name="ownCapital"
                label="Vốn tự có (= Nhu cầu − Vốn vay)"
                required
                readOnly
                disabled
                hint="Tự động tính, không nhập thủ công"
              />
            </div>

            {isCapitalInvalid && (
              <Alert
                tone="danger"
                title="Cảnh báo: Tổng nhu cầu vốn đang nhỏ hơn Số tiền vay!"
              >
                Tổng nhu cầu vốn ({formatVND(watchedTotalCapitalDemand)}) không được nhỏ hơn Số
                tiền vay ({formatVND(watchedBorrowedCapital)}). Vui lòng tăng{' '}
                <strong>Tổng nhu cầu vốn của phương án</strong> tối thiểu bằng{' '}
                <strong>{formatVND(watchedBorrowedCapital)}</strong>.
              </Alert>
            )}

            {/* Danh mục Chi phí */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Danh mục Chi phí đầu tư ({expensesArray.fields.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setIsTemplateManuallyEdited(true);
                    expensesArray.append({ name: '', amount: 0 });
                  }}
                >
                  Thêm khoản chi
                </Button>
              </div>
              {expensesArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                  onChangeCapture={() => setIsTemplateManuallyEdited(true)}
                >
                  <div className="sm:col-span-7">
                    <FormTextField
                      control={planForm.control}
                      name={`expenses.${index}.name`}
                      label={`Khoản mục chi #${index + 1}`}
                      required
                      placeholder="VD: Mua giống, phân bón, nhân công..."
                    />
                  </div>
                  <div className="flex items-end gap-1.5 sm:col-span-5">
                    <FormCurrencyField
                      control={planForm.control}
                      name={`expenses.${index}.amount`}
                      label="Số tiền chi"
                      required
                      showWords={false}
                      wrapperClassName="flex-1"
                    />
                    <div className="flex items-center rounded border border-slate-200 bg-white mb-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        title="Di chuyển lên trên"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          expensesArray.swap(index, index - 1);
                        }}
                        className="p-1.5 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-3.5 w-[1px] bg-slate-200" />
                      <button
                        type="button"
                        disabled={index === expensesArray.fields.length - 1}
                        title="Di chuyển xuống dưới"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          expensesArray.swap(index, index + 1);
                        }}
                        className="p-1.5 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {expensesArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Xóa khoản chi"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          expensesArray.remove(index);
                        }}
                        className="text-danger-600 mb-0.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Danh mục Nguồn thu */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Danh mục Nguồn thu trả nợ ({revenuesArray.fields.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setIsTemplateManuallyEdited(true);
                    revenuesArray.append({ name: '', amount: 0 });
                  }}
                >
                  Thêm nguồn thu
                </Button>
              </div>
              {revenuesArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                  onChangeCapture={() => setIsTemplateManuallyEdited(true)}
                >
                  <div className="sm:col-span-7">
                    <FormTextField
                      control={planForm.control}
                      name={`revenues.${index}.name`}
                      label={`Khoản mục thu #${index + 1}`}
                      required
                      placeholder="VD: Thu hoạch nông sản vụ 1..."
                    />
                  </div>
                  <div className="flex items-end gap-1.5 sm:col-span-5">
                    <FormCurrencyField
                      control={planForm.control}
                      name={`revenues.${index}.amount`}
                      label="Số tiền thu dự kiến"
                      required
                      showWords={false}
                      wrapperClassName="flex-1"
                    />
                    <div className="flex items-center rounded border border-slate-200 bg-white mb-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        title="Di chuyển lên trên"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          revenuesArray.swap(index, index - 1);
                        }}
                        className="p-1.5 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-3.5 w-[1px] bg-slate-200" />
                      <button
                        type="button"
                        disabled={index === revenuesArray.fields.length - 1}
                        title="Di chuyển xuống dưới"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          revenuesArray.swap(index, index + 1);
                        }}
                        className="p-1.5 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {revenuesArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Xóa nguồn thu"
                        onClick={() => {
                          setIsTemplateManuallyEdited(true);
                          revenuesArray.remove(index);
                        }}
                        className="text-danger-600 mb-0.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bảng tổng hợp Lợi nhuận ròng */}
            <ModalLoanPlanTotalsPreview control={planForm.control} />
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
              disabled={isCapitalInvalid}
            >
              Lưu phương án
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
