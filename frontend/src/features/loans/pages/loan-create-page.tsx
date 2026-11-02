import { useEffect, useMemo, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Home,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Gender,
  IdDocumentType,
  LoanStatus,
  LoanTermType,
  LoanType,
} from '@/shared/types';
import {
  BUSINESS_LIMITS,
  GENDER_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  LOAN_TERM_TYPE_LABELS,
  LOAN_TYPE_LABELS,
} from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND, toApiDate } from '@/shared/format';
import {
  getCanonicalIdIssuePlace,
  isLoanEligibleForRelatedPerson,
  parseCitizenIdInfo,
} from '@/shared/utils/identity-document';
import { applyServerErrorsToForm } from '@/lib/http';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DescriptionItem,
  DescriptionList,
  Stepper,
  type StepItem,
} from '@/components/ui';
import {
  FormCurrencyField,
  FormDateField,
  FormNumberField,
  FormRadioCardGroup,
  FormSelectField,
  FormTextareaField,
  FormTextField,
} from '@/components/form';
import {
  Alert,
  ConfirmDialog,
  notifyApiError,
  notifySuccess,
  notifyWarning,
} from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { MemberLookupField } from '@/features/members/components/member-lookup-field';
import { useMemberDetail } from '@/features/members/hooks/use-members';
import { useCurrentInterestRate } from '@/features/interest-rates/hooks/use-interest-rates';
import { CollateralsSection } from '../components/collaterals-section';
import { RelatedPersonsSection } from '../components/related-persons-section';
import {
  useCreateLoan,
  useLoanDetail,
  useUpdateLoan,
  useUpdateLoanStatus,
} from '../hooks/use-loans';
import {
  heirFormSchema,
  loanPlanFormSchema,
  loanTermsStepSchema,
  mortgageContractFormSchema,
  type HeirFormValues,
  type LoanPlanFormValues,
  type LoanTermsStepValues,
  type MortgageContractFormValues,
} from '../schemas/loan.schema';
import {
  calculateLoanPlanTemplate,
  buildInterestExpenseItemName,
  LOAN_PLAN_TEMPLATE_META,
  type LoanPlanTemplateCode,
} from '../utils/loan-plan-templates';

const WIZARD_STEPS: readonly StepItem[] = [
  { id: 'member', title: '1. Chọn thành viên', description: 'Người đứng tên vay' },
  { id: 'terms', title: '2. Thông tin khoản vay', description: 'Loại vay, kỳ hạn, số tiền' },
  { id: 'heir', title: '3. Người thừa kế', description: 'Tùy chọn' },
  { id: 'plan', title: '4. Phương án vay', description: 'Chi phí, nguồn thu, lợi nhuận' },
  { id: 'collateral', title: '5. Kê khai tài sản', description: 'Tài sản & HĐ thế chấp' },
  { id: 'review', title: '6. Xác nhận hồ sơ', description: 'Hoàn thành hồ sơ vay' },
];

/**
 * Component con tính toán Tổng chi phí / Tổng nguồn thu / Lợi nhuận dự kiến bằng `useWatch`.
 * Việc tách riêng giúp khi người dùng gõ vào từng dòng thu/chi không làm toàn bộ Form Phương án vay re-render.
 */
function LoanPlanTotalsPreview({ control }: { control: Control<LoanPlanFormValues> }) {
  const expenses = useWatch({ control, name: 'expenses' }) ?? [];
  const revenues = useWatch({ control, name: 'revenues' }) ?? [];

  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const totalRevenues = revenues.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
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

export function LoanCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftLoanId = searchParams.get('draft') || undefined;
  const preselectedMemberId = searchParams.get('memberId') || '';

  const [stepIndex, setStepIndex] = useState<number>(draftLoanId ? 2 : 0);
  const [memberId, setMemberId] = useState<string>(preselectedMemberId);
  const [memberError, setMemberError] = useState<string | undefined>();
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  // State quản lý Mẫu phương án vay (Mẫu sửa nhà / Mẫu chăn nuôi)
  const [activeTemplate, setActiveTemplate] = useState<LoanPlanTemplateCode | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<LoanPlanTemplateCode | null>(null);
  const [isTemplateManuallyEdited, setIsTemplateManuallyEdited] = useState(false);

  const { data: draftLoan } = useLoanDetail(draftLoanId);
  const { data: selectedMember } = useMemberDetail(memberId || draftLoan?.memberId);
  const createLoanMutation = useCreateLoan();
  const updateLoanMutation = useUpdateLoan(draftLoanId ?? '');
  const updateStatusMutation = useUpdateLoanStatus(draftLoanId ?? '');

  // Form Bước 2: Thông tin khoản vay
  const termsForm = useForm<LoanTermsStepValues>({
    resolver: zodResolver(loanTermsStepSchema),
    mode: 'onTouched',
    defaultValues: {
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      loanAmount: 100_000_000,
      contractNumber: `KU-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      contractDate: toApiDate(new Date()),
    },
  });

  const watchedTermType = useWatch({ control: termsForm.control, name: 'termType' });
  const watchedLoanAmount = useWatch({ control: termsForm.control, name: 'loanAmount' });
  const { data: currentRateConfig } = useCurrentInterestRate(
    watchedTermType ?? LoanTermType.NGAN_HAN,
  );

  // Tìm bậc lãi suất gợi ý tương ứng với số tiền vay
  const matchedRateTier = currentRateConfig?.tiers.find(
    (t) => watchedLoanAmount >= t.minAmount && watchedLoanAmount <= t.maxAmount,
  );

  // Các thông số khoản vay hiệu lực để đồng bộ sang Phương án vay (Bước 4)
  const effectiveLoanAmount = draftLoan?.loanAmount ?? watchedLoanAmount ?? 0;
  const effectiveTermType = draftLoan?.termType ?? watchedTermType ?? LoanTermType.NGAN_HAN;
  const effectiveInterestRate =
    draftLoan?.interestRate ?? matchedRateTier?.annualRate ?? 10.2;

  // Form Bước 3: Người thừa kế
  const heirForm = useForm<HeirFormValues>({
    resolver: zodResolver(heirFormSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      yearOfBirth: 1995,
      gender: Gender.NAM,
      phoneNumber: '',
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '',
      idIssueDate: '',
      idIssuePlace: 'Cục Cảnh Sát QLHC về TTXH',
      idExpiry: '',
      address: '',
      relationship: 'Con ruột',
    },
  });

  const watchedHeirIdNumber = useWatch({ control: heirForm.control, name: 'idNumber' });
  const watchedHeirIdType = useWatch({ control: heirForm.control, name: 'idType' });

  // Tự động xác định giới tính & năm sinh từ số CCCD Người thừa kế (Mục 3.1)
  useEffect(() => {
    const parsed = parseCitizenIdInfo(watchedHeirIdNumber);
    if (parsed) {
      heirForm.setValue('gender', parsed.gender, { shouldValidate: true, shouldDirty: true });
      heirForm.setValue('yearOfBirth', parsed.yearOfBirth, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedHeirIdNumber, heirForm]);

  // Tự động điền nơi cấp theo loại giấy tờ Người thừa kế (Mục 3.5)
  useEffect(() => {
    if (watchedHeirIdType) {
      heirForm.setValue('idIssuePlace', getCanonicalIdIssuePlace(watchedHeirIdType), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedHeirIdType, heirForm]);

  // Form Bước 4: Phương án vay vốn
  const planForm = useForm<LoanPlanFormValues>({
    resolver: zodResolver(loanPlanFormSchema),
    mode: 'onTouched',
    defaultValues: {
      purpose: 'Đầu tư sản xuất nông nghiệp và mua vật tư phân bón',
      loanAmount: 150_000_000,
      ownCapital: 50_000_000,
      borrowedCapital: 100_000_000,
      expenses: [{ name: 'Chi phí giống và phân bón', amount: 150_000_000 }],
      revenues: [{ name: 'Thu hoạch nông sản cuối vụ', amount: 200_000_000 }],
    },
  });

  const expensesArray = useFieldArray({ control: planForm.control, name: 'expenses' });
  const revenuesArray = useFieldArray({ control: planForm.control, name: 'revenues' });

  const watchedTotalCapitalDemand =
    useWatch({ control: planForm.control, name: 'loanAmount' }) ?? 0;
  const watchedBorrowedCapital =
    useWatch({ control: planForm.control, name: 'borrowedCapital' }) ?? 0;

  const isCapitalInvalid = watchedTotalCapitalDemand < watchedBorrowedCapital;

  // Form Bước 5: Hợp đồng thế chấp (đã loại bỏ trường Thời hạn thế chấp theo Mục 3.5)
  const mortgageForm = useForm<MortgageContractFormValues>({
    resolver: zodResolver(mortgageContractFormSchema),
    mode: 'onTouched',
    defaultValues: {
      contractNumber: `HĐTC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      contractDuration: '',
      contractExpiryDate: '',
      committeeAuthDate: toApiDate(new Date()),
    },
  });

  const watchedMortgageExpiry = useWatch({
    control: mortgageForm.control,
    name: 'contractExpiryDate',
  });

  const expectedMaturityDate = useMemo(() => {
    if (!draftLoan) return null;
    const base = draftLoan.loanStartDate || draftLoan.contractDate || new Date();
    const d = new Date(base);
    d.setMonth(d.getMonth() + draftLoan.termMonths);
    return d;
  }, [draftLoan]);

  const isMortgageExpiryShort = useMemo(() => {
    if (!watchedMortgageExpiry || !expectedMaturityDate) return false;
    const exp = new Date(watchedMortgageExpiry);
    return !Number.isNaN(exp.getTime()) && exp.getTime() < expectedMaturityDate.getTime();
  }, [watchedMortgageExpiry, expectedMaturityDate]);

  // Đồng bộ dữ liệu khi mở lại bản nháp (DANG_TAO)
  useEffect(() => {
    if (!draftLoan) return;
    setMemberId(draftLoan.memberId);
    termsForm.reset({
      loanType: draftLoan.loanType,
      termType: draftLoan.termType,
      loanAmount: draftLoan.loanAmount,
      contractNumber: draftLoan.contractNumber ?? '',
      contractDate: draftLoan.contractDate ? draftLoan.contractDate.slice(0, 10) : '',
    });
    if (draftLoan.heir) {
      heirForm.reset({
        ...draftLoan.heir,
        idIssueDate: draftLoan.heir.idIssueDate.slice(0, 10),
        idExpiry: draftLoan.heir.idExpiry ? draftLoan.heir.idExpiry.slice(0, 10) : '',
      });
    }
    if (draftLoan.loanPlan) {
      const syncedTotalDemand = Math.max(draftLoan.loanPlan.loanAmount, draftLoan.loanAmount);
      const syncedOwnCapital = Math.max(0, syncedTotalDemand - draftLoan.loanAmount);
      planForm.reset({
        purpose: draftLoan.loanPlan.purpose,
        loanAmount: syncedTotalDemand,
        ownCapital: syncedOwnCapital,
        borrowedCapital: draftLoan.loanAmount,
        expenses: draftLoan.loanPlan.expenses,
        revenues: draftLoan.loanPlan.revenues,
      });
    } else {
      const defaultTotalDemand = Math.round(draftLoan.loanAmount * 1.2);
      planForm.setValue('loanAmount', defaultTotalDemand);
      planForm.setValue('borrowedCapital', draftLoan.loanAmount);
      planForm.setValue('ownCapital', Math.max(0, defaultTotalDemand - draftLoan.loanAmount));
    }
    if (draftLoan.mortgageContract) {
      mortgageForm.reset({
        contractNumber: draftLoan.mortgageContract.contractNumber,
        contractDuration: draftLoan.mortgageContract.contractDuration ?? '',
        contractExpiryDate: draftLoan.mortgageContract.contractExpiryDate
          ? draftLoan.mortgageContract.contractExpiryDate.slice(0, 10)
          : '',
        committeeAuthDate: draftLoan.mortgageContract.committeeAuthDate
          ? draftLoan.mortgageContract.committeeAuthDate.slice(0, 10)
          : '',
      });
    }
  }, [draftLoan, termsForm, heirForm, planForm, mortgageForm]);

  // Mục 3.2.A: Tự động đồng bộ Số tiền vay (borrowedCapital) từ Bước 2 sang Phương án vay (Bước 4)
  useEffect(() => {
    if (effectiveLoanAmount > 0) {
      planForm.setValue('borrowedCapital', effectiveLoanAmount, { shouldValidate: true });
    }
  }, [effectiveLoanAmount, planForm]);

  // Mục 3.2.B: Tự động tính Vốn tự có = Tổng nhu cầu vốn - Số tiền vay (không âm)
  useEffect(() => {
    const calculatedOwnCapital = Math.max(0, watchedTotalCapitalDemand - watchedBorrowedCapital);
    planForm.setValue('ownCapital', calculatedOwnCapital, { shouldValidate: true });
  }, [watchedTotalCapitalDemand, watchedBorrowedCapital, planForm]);

  // Mục 3.3: Tự động tính lại chi phí & nguồn thu khi đã áp dụng Mẫu phương án và chưa bị sửa tay
  useEffect(() => {
    if (!activeTemplate || isTemplateManuallyEdited) return;
    if (watchedTotalCapitalDemand <= 0 || effectiveLoanAmount <= 0) return;

    const calculated = calculateLoanPlanTemplate({
      templateCode: activeTemplate,
      totalCapitalDemand: watchedTotalCapitalDemand,
      loanAmount: effectiveLoanAmount,
      interestRate: effectiveInterestRate,
      termType: effectiveTermType,
    });

    planForm.setValue('expenses', calculated.expenses, { shouldValidate: true });
    planForm.setValue('revenues', calculated.revenues, { shouldValidate: true });
  }, [
    activeTemplate,
    isTemplateManuallyEdited,
    watchedTotalCapitalDemand,
    effectiveLoanAmount,
    effectiveInterestRate,
    effectiveTermType,
    planForm,
  ]);

  // Tự động cập nhật dòng chi phí trả lãi tiền vay theo số tiền, lãi suất, kỳ hạn thực tế khi thay đổi thông số vay
  useEffect(() => {
    if (effectiveLoanAmount <= 0) return;
    const currentExpenses = planForm.getValues('expenses') || [];
    const interestIdx = currentExpenses.findIndex((ex) =>
      /Chi phí trả lãi|Trả lãi tiền vay/i.test(ex.name),
    );
    if (interestIdx >= 0) {
      const termFactor = effectiveTermType === LoanTermType.TRUNG_HAN ? 2 : 1;
      const interestExpense = Math.round(
        effectiveLoanAmount * (effectiveInterestRate / 100) * termFactor,
      );
      const newName = buildInterestExpenseItemName(
        effectiveLoanAmount,
        effectiveInterestRate,
        termFactor,
        interestExpense,
      );

      const targetItem = currentExpenses[interestIdx];
      if (
        targetItem &&
        (targetItem.name !== newName || targetItem.amount !== interestExpense)
      ) {
        planForm.setValue(`expenses.${interestIdx}.name`, newName, { shouldDirty: true });
        planForm.setValue(`expenses.${interestIdx}.amount`, interestExpense, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }, [effectiveLoanAmount, effectiveInterestRate, effectiveTermType, planForm]);

  // Mục 3.1: Sao chép địa chỉ hiện tại của người vay sang người thừa kế
  const handleCopyBorrowerAddress = () => {
    const borrowerAddress = (
      draftLoan?.member?.address ||
      selectedMember?.address ||
      ''
    ).trim();

    if (!borrowerAddress) {
      notifyWarning(
        'Chưa có địa chỉ người vay để sao chép',
        'Hồ sơ thành viên vay vốn hiện chưa có dữ liệu địa chỉ thường trú. Vui lòng nhập địa chỉ thủ công hoặc cập nhật thông tin thành viên.',
      );
      return;
    }

    heirForm.setValue('address', borrowerAddress, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    notifySuccess(
      'Đã sao chép địa chỉ người vay',
      `Đã điền: "${borrowerAddress}". Bạn vẫn có thể chỉnh sửa độc lập nếu cần.`,
    );
  };

  // Mục 3.3: Áp dụng Mẫu phương án vay (Mẫu sửa nhà / Mẫu chăn nuôi)
  const applyLoanPlanTemplate = (templateCode: LoanPlanTemplateCode) => {
    const baseTotalDemand =
      watchedTotalCapitalDemand >= effectiveLoanAmount && watchedTotalCapitalDemand > 0
        ? watchedTotalCapitalDemand
        : effectiveLoanAmount;

    if (watchedTotalCapitalDemand < effectiveLoanAmount) {
      planForm.setValue('loanAmount', baseTotalDemand, { shouldValidate: true });
    }

    const calculated = calculateLoanPlanTemplate({
      templateCode,
      totalCapitalDemand: baseTotalDemand,
      loanAmount: effectiveLoanAmount,
      interestRate: effectiveInterestRate,
      termType: effectiveTermType,
    });

    const currentPurpose = (planForm.getValues('purpose') || '').trim();
    const isDefaultOrEmptyPurpose =
      !currentPurpose ||
      currentPurpose === 'Đầu tư sản xuất nông nghiệp và mua vật tư phân bón' ||
      currentPurpose === LOAN_PLAN_TEMPLATE_META.SUA_NHA.defaultPurpose ||
      currentPurpose === LOAN_PLAN_TEMPLATE_META.CHAN_NUOI.defaultPurpose;

    if (isDefaultOrEmptyPurpose) {
      planForm.setValue('purpose', calculated.defaultPurpose, { shouldValidate: true });
    }

    planForm.setValue('borrowedCapital', calculated.borrowedCapital, { shouldValidate: true });
    planForm.setValue('ownCapital', calculated.ownCapital, { shouldValidate: true });
    planForm.setValue('expenses', calculated.expenses, { shouldValidate: true });
    planForm.setValue('revenues', calculated.revenues, { shouldValidate: true });

    setActiveTemplate(templateCode);
    setIsTemplateManuallyEdited(false);
    setPendingTemplate(null);

    notifySuccess(
      `Đã tải "${calculated.templateLabel}"`,
      `Đã tự động phân bổ ${calculated.expenses.length} khoản chi (${formatVND(calculated.totalExpenses)}) và ${calculated.revenues.length} nguồn thu (${formatVND(calculated.totalRevenues)}).`,
    );
  };

  const handleRequestTemplate = (templateCode: LoanPlanTemplateCode) => {
    const currentExpenses = planForm.getValues('expenses') ?? [];
    const currentRevenues = planForm.getValues('revenues') ?? [];
    const hasExistingData =
      currentExpenses.some((e) => (e.name || '').trim() !== '' || (e.amount ?? 0) > 0) ||
      currentRevenues.some((r) => (r.name || '').trim() !== '' || (r.amount ?? 0) > 0);

    if (hasExistingData) {
      setPendingTemplate(templateCode);
    } else {
      applyLoanPlanTemplate(templateCode);
    }
  };

  const handleStep1Next = () => {
    if (!memberId) {
      setMemberError('Vui lòng chọn thành viên vay vốn trước khi sang bước tiếp theo.');
      return;
    }
    setMemberError(undefined);
    setStepIndex(1);
  };

  const handleStep2Submit = async (values: LoanTermsStepValues) => {
    try {
      if (!draftLoanId) {
        const created = await createLoanMutation.mutateAsync({
          memberId,
          loanType: values.loanType,
          termType: values.termType,
          loanAmount: values.loanAmount,
          contractNumber: values.contractNumber || undefined,
          contractDate: values.contractDate || undefined,
        });
        notifySuccess(
          'Đã khởi tạo hồ sơ vay nháp (Đang tạo)',
          `Lãi suất chốt tự động: ${formatInterestRate(created.interestRate)}`,
        );
        setSearchParams({ draft: created.id }, { replace: true });
      } else {
        await updateLoanMutation.mutateAsync({
          loanAmount: values.loanAmount,
          contractNumber: values.contractNumber || undefined,
          contractDate: values.contractDate || undefined,
        });
        notifySuccess('Đã lưu thông tin khoản vay');
      }
      setStepIndex(2);
    } catch (err) {
      const mapped = applyServerErrorsToForm(err, termsForm.setError);
      if (mapped) {
        notifyApiError(err);
      } else {
        notifyApiError(err);
      }
    }
  };

  const handleStep3Submit = async (values: HeirFormValues) => {
    if (!draftLoanId) return;
    try {
      await updateLoanMutation.mutateAsync({ heir: values });
      notifySuccess('Đã lưu thông tin người thừa kế');
      setStepIndex(3);
    } catch (err) {
      if (!applyServerErrorsToForm(err, heirForm.setError)) {
        notifyApiError(err);
      }
    }
  };

  const handleStep4Submit = async (values: LoanPlanFormValues) => {
    if (!draftLoanId) return;
    if (values.loanAmount < values.borrowedCapital) {
      planForm.setError('loanAmount', {
        type: 'manual',
        message:
          'Tổng nhu cầu vốn không được nhỏ hơn số tiền vay đề nghị (Vốn tự có không được âm)',
      });
      return;
    }
    try {
      const normalizedPlan: LoanPlanFormValues = {
        ...values,
        borrowedCapital: effectiveLoanAmount,
        ownCapital: Math.max(0, values.loanAmount - effectiveLoanAmount),
      };
      await updateLoanMutation.mutateAsync({ loanPlan: normalizedPlan });
      notifySuccess('Đã lưu phương án vay vốn');
      // Mục 3.7: Cả Vay thế chấp VÀ Vay tín chấp đều chuyển sang Bước 5 để kê khai tài sản
      setStepIndex(4);
    } catch (err) {
      if (!applyServerErrorsToForm(err, planForm.setError)) {
        notifyApiError(err);
      }
    }
  };

  const handleStep5Submit = async (values: MortgageContractFormValues) => {
    if (!draftLoanId) return;
    try {
      await updateLoanMutation.mutateAsync({ mortgageContract: values });
      notifySuccess('Đã lưu thông tin hợp đồng thế chấp');
      setStepIndex(5);
    } catch (err) {
      if (!applyServerErrorsToForm(err, mortgageForm.setError)) {
        notifyApiError(err);
      }
    }
  };

  // Kiểm tra các điều kiện tiên quyết trước khi hoàn thành hồ sơ (Mục 3.7)
  const collaterals = draftLoan?.collaterals ?? [];
  const hasRequiredAssets = collaterals.length > 0;
  const totalCollateralValuation = collaterals.reduce(
    (s, c) => s + (Number(c.valuationAmount) || 0),
    0,
  );
  const minRequiredValuation = draftLoan
    ? Math.ceil(draftLoan.loanAmount / BUSINESS_LIMITS.MAX_LTV_RATIO)
    : 0;
  const isRelatedEligible = draftLoan
    ? isLoanEligibleForRelatedPerson(draftLoan.loanType, draftLoan.loanAmount)
    : false;

  const isDossierReady =
    draftLoan?.loanType === LoanType.TIN_CHAP
      ? hasRequiredAssets
      : hasRequiredAssets &&
        totalCollateralValuation >= minRequiredValuation &&
        Boolean(draftLoan?.mortgageContract);

  const handleCompleteDossier = async () => {
    if (!draftLoanId) return;
    try {
      await updateStatusMutation.mutateAsync(LoanStatus.DA_HOAN_THANH_HO_SO);
      notifySuccess(
        'Đã hoàn thành hồ sơ khoản vay!',
        'Hồ sơ đã sẵn sàng để thực hiện giải ngân.',
      );
      setConfirmCompleteOpen(false);
      navigate(`/loans/${draftLoanId}`);
    } catch (err) {
      setConfirmCompleteOpen(false);
      notifyApiError(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={
          <Link
            to="/loans"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Danh sách khoản vay</span>
          </Link>
        }
        title={
          draftLoan
            ? `Lập hồ sơ khoản vay (${draftLoan.contractNumber || `#${draftLoan.id.slice(-6)}`})`
            : 'Lập hồ sơ khoản vay mới'
        }
        badge={
          draftLoan ? (
            <Badge tone="neutral" dot>
              Đã lưu nháp trên máy chủ
            </Badge>
          ) : undefined
        }
        description="Quy trình lập hồ sơ gồm 6 bước. Từ bước 2 trở đi, hồ sơ được lưu tự động ở trạng thái Đang tạo để bạn có thể tiếp tục bất cứ lúc nào."
      />

      <Stepper
        steps={WIZARD_STEPS}
        currentIndex={stepIndex}
        maxReachableIndex={draftLoanId ? 5 : 1}
        onStepClick={(idx) => setStepIndex(idx)}
      />

      {/* BƯỚC 1: CHỌN THÀNH VIÊN */}
      {stepIndex === 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bước 1: Chọn thành viên vay vốn</CardTitle>
              <CardDescription>
                Tra cứu thành viên hiện có hoặc tạo nhanh hồ sơ thành viên mới
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MemberLookupField
              value={memberId}
              error={memberError}
              onChange={(id) => {
                setMemberId(id);
                setMemberError(undefined);
              }}
            />
          </CardContent>
          <CardFooter>
            <Button
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={handleStep1Next}
            >
              Tiếp tục: Thông tin khoản vay
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* BƯỚC 2: THÔNG TIN KHOẢN VAY */}
      {stepIndex === 1 && (
        <Card>
          <form onSubmit={termsForm.handleSubmit(handleStep2Submit)} noValidate>
            <CardHeader>
              <div>
                <CardTitle>Bước 2: Thông tin khoản vay & Lãi suất</CardTitle>
                <CardDescription>
                  Chọn hình thức vay, kỳ hạn và số tiền đề nghị. Hệ thống sẽ tự động tra cứu và chốt
                  lãi suất theo bảng lãi suất hiện hành.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormRadioCardGroup
                control={termsForm.control}
                name="loanType"
                label="Hình thức vay vốn"
                required
                disabled={Boolean(draftLoanId)}
                options={[
                  {
                    value: LoanType.THE_CHAP,
                    title: LOAN_TYPE_LABELS.THE_CHAP,
                    description:
                      'Có tài sản đảm bảo (QSDĐ) và lập Hợp đồng thế chấp. Số tiền vay tối đa bằng 70% tổng giá trị định giá tài sản.',
                    badge: <Badge tone="primary">Phổ biến</Badge>,
                  },
                  {
                    value: LoanType.TIN_CHAP,
                    title: LOAN_TYPE_LABELS.TIN_CHAP,
                    description:
                      'Vẫn kê khai thông tin tài sản nhưng không yêu cầu định giá và không cần Hợp đồng thế chấp. Hạn mức tối đa 100.000.000 ₫.',
                    badge: <Badge tone="neutral">≤ 100 triệu</Badge>,
                  },
                ]}
              />

              <FormRadioCardGroup
                control={termsForm.control}
                name="termType"
                label="Kỳ hạn khoản vay"
                required
                disabled={Boolean(draftLoanId)}
                options={[
                  {
                    value: LoanTermType.NGAN_HAN,
                    title: LOAN_TERM_TYPE_LABELS.NGAN_HAN,
                    description: 'Thời hạn vay 12 tháng kể từ ngày giải ngân đầu tiên.',
                  },
                  {
                    value: LoanTermType.TRUNG_HAN,
                    title: LOAN_TERM_TYPE_LABELS.TRUNG_HAN,
                    description: 'Thời hạn vay 24 tháng kể từ ngày giải ngân đầu tiên.',
                  },
                ]}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormCurrencyField
                  control={termsForm.control}
                  name="loanAmount"
                  label="Số tiền vay đề nghị"
                  required
                />
                <FormTextField
                  control={termsForm.control}
                  name="contractNumber"
                  label="Số khế ước nhận nợ (Duy nhất)"
                  placeholder="VD: 26.11.021"
                  hint="Mỗi hồ sơ vay bắt buộc có Số khế ước không trùng lặp"
                />
                <FormDateField
                  control={termsForm.control}
                  name="contractDate"
                  label="Ngày lập khế ước"
                />
              </div>

              <Alert
                tone={matchedRateTier ? 'info' : 'warning'}
                title={
                  matchedRateTier
                    ? `Lãi suất dự kiến áp dụng: ${formatInterestRate(matchedRateTier.annualRate)}`
                    : 'Gợi ý lãi suất tự động theo Bảng lãi suất hiện hành'
                }
              >
                {matchedRateTier
                  ? `Khớp bậc tiền vay từ ${formatVND(matchedRateTier.minAmount)} đến ${formatVND(matchedRateTier.maxAmount)}. Lãi suất chính thức sẽ được máy chủ khóa cố định ngay khi khởi tạo khoản vay.`
                  : 'Máy chủ sẽ tự động tra cứu bậc lãi suất hiệu lực ứng với số tiền và kỳ hạn vay.'}
              </Alert>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStepIndex(0)}>
                Quay lại
              </Button>
              <Button
                type="submit"
                isLoading={createLoanMutation.isPending || updateLoanMutation.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Lưu & Tiếp tục
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* BƯỚC 3: NGƯỜI THỪA KẾ (TÙY CHỌN) */}
      {stepIndex === 2 && (
        <Card>
          <form onSubmit={heirForm.handleSubmit(handleStep3Submit)} noValidate>
            <CardHeader>
              <div>
                <CardTitle>Bước 3: Thông tin Người thừa kế / Đồng trách nhiệm</CardTitle>
                <CardDescription>
                  Bước này là tùy chọn. Bạn có thể nhập ngay hoặc bấm &ldquo;Bỏ qua bước này&rdquo;
                  để sang Phương án vay.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormTextField
                control={heirForm.control}
                name="fullName"
                label="Họ và tên người thừa kế"
                required
              />
              <FormTextField
                control={heirForm.control}
                name="relationship"
                label="Quan hệ với người vay"
                required
                placeholder="VD: Vợ, Chồng, Con trai..."
              />
              <FormTextField
                control={heirForm.control}
                name="phoneNumber"
                label="Số điện thoại"
                placeholder="VD: 0912345678 (tùy chọn)"
              />
              <div className="grid grid-cols-2 gap-2">
                <FormNumberField
                  control={heirForm.control}
                  name="yearOfBirth"
                  label="Năm sinh"
                  disabled
                  hint="Tự động từ CCCD"
                  placeholder="Tự động"
                />
                <FormSelectField
                  control={heirForm.control}
                  name="gender"
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
                control={heirForm.control}
                name="idType"
                label="Loại giấy tờ"
                required
                options={[
                  {
                    value: IdDocumentType.CAN_CUOC_CONG_DAN,
                    label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC_CONG_DAN,
                  },
                  { value: IdDocumentType.CAN_CUOC, label: ID_DOCUMENT_TYPE_LABELS.CAN_CUOC },
                ]}
              />
              <FormTextField
                control={heirForm.control}
                name="idNumber"
                label="Số CCCD"
                required
                digitsOnly
                maxLength={12}
                hint="Tự động tính giới tính & năm sinh"
              />
              <FormDateField
                control={heirForm.control}
                name="idIssueDate"
                label="Ngày cấp"
                required
              />
              <FormTextField
                control={heirForm.control}
                name="idIssuePlace"
                label="Nơi cấp"
                disabled
                hint="Tự động theo loại giấy tờ"
              />
              <FormTextField
                control={heirForm.control}
                name="address"
                label="Địa chỉ thường trú"
                required
                placeholder="Nhập địa chỉ hoặc bấm Sao chép địa chỉ người vay"
                wrapperClassName="sm:col-span-2"
                extraRight={
                  <button
                    type="button"
                    onClick={handleCopyBorrowerAddress}
                    className="inline-flex items-center gap-1 rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Sao chép địa chỉ người vay</span>
                  </button>
                }
              />
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStepIndex(1)}>
                Quay lại
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStepIndex(3)}>
                  Bỏ qua bước này
                </Button>
                <Button
                  type="submit"
                  isLoading={updateLoanMutation.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Lưu người thừa kế & Tiếp tục
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* BƯỚC 4: PHƯƠNG ÁN VAY VỐN */}
      {stepIndex === 3 && (
        <Card>
          <form onSubmit={planForm.handleSubmit(handleStep4Submit)} noValidate>
            <CardHeader>
              <div>
                <CardTitle>Bước 4: Phương án sử dụng vốn vay</CardTitle>
                <CardDescription>
                  Số tiền vay tự động đồng bộ từ Bước 2; Vốn tự có tự động tính theo công thức{' '}
                  <strong>Vốn tự có = Tổng nhu cầu vốn − Số tiền vay</strong>.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Thanh công cụ Tải mẫu phương án vay (Mục 3.3) */}
              <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-900">
                      <Sparkles className="h-4 w-4 text-primary-600" />
                      <span>Tải mẫu phương án vay chuẩn của Quỹ</span>
                      {activeTemplate && (
                        <Badge tone={isTemplateManuallyEdited ? 'warning' : 'primary'}>
                          {LOAN_PLAN_TEMPLATE_META[activeTemplate].label}
                          {isTemplateManuallyEdited ? ' (Đã chỉnh sửa tay)' : ' (Tự động đồng bộ)'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Tự động phân bổ các khoản mục Chi phí đầu tư, Chi phí trả lãi tiền vay (Số tiền
                      vay × Lãi suất {formatInterestRate(effectiveInterestRate)} × Hệ số năm{' '}
                      {effectiveTermType === LoanTermType.TRUNG_HAN ? '2' : '1'}) và Nguồn thu trả
                      nợ.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={activeTemplate === 'SUA_NHA' ? 'primary' : 'outline'}
                      size="sm"
                      leftIcon={<Home className="h-3.5 w-3.5" />}
                      onClick={() => handleRequestTemplate('SUA_NHA')}
                    >
                      Tải mẫu: Mẫu sửa nhà
                    </Button>
                    <Button
                      type="button"
                      variant={activeTemplate === 'CHAN_NUOI' ? 'primary' : 'outline'}
                      size="sm"
                      leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                      onClick={() => handleRequestTemplate('CHAN_NUOI')}
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
                  label="Tổng nhu cầu vốn vay"
                  required
                  hint="Nhập tổng nhu cầu vốn của phương án (≥ Số tiền vay)"
                />
                <FormCurrencyField
                  control={planForm.control}
                  name="borrowedCapital"
                  label="Số tiền vay (Tự động từ Bước 2)"
                  required
                  readOnly
                  disabled
                  hint="Tự động đồng bộ từ Số tiền vay đề nghị"
                />
                <FormCurrencyField
                  control={planForm.control}
                  name="ownCapital"
                  label="Vốn tự có (= Tổng nhu cầu − Số tiền vay)"
                  required
                  readOnly
                  disabled
                  hint="Tự động tính, không nhập thủ công"
                />
              </div>

              {isCapitalInvalid && (
                <Alert
                  tone="danger"
                  title="Cảnh báo: Tổng nhu cầu vốn đang nhỏ hơn Số tiền vay đề nghị!"
                >
                  Tổng nhu cầu vốn ({formatVND(watchedTotalCapitalDemand)}) không được nhỏ hơn Số
                  tiền vay ({formatVND(watchedBorrowedCapital)}). Vốn tự có không được phép âm — vui
                  lòng tăng <strong>Tổng nhu cầu vốn vay</strong> tối thiểu bằng{' '}
                  <strong>{formatVND(watchedBorrowedCapital)}</strong> hoặc quay lại Bước 2 điều
                  chỉnh Số tiền vay.
                </Alert>
              )}

              {/* Danh sách Chi phí */}
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
                    <div className="flex items-end gap-2 sm:col-span-5">
                      <FormCurrencyField
                        control={planForm.control}
                        name={`expenses.${index}.amount`}
                        label="Số tiền chi"
                        required
                        showWords={false}
                        wrapperClassName="flex-1"
                      />
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
                          className="text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Danh sách Nguồn thu */}
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
                    <div className="flex items-end gap-2 sm:col-span-5">
                      <FormCurrencyField
                        control={planForm.control}
                        name={`revenues.${index}.amount`}
                        label="Số tiền thu dự kiến"
                        required
                        showWords={false}
                        wrapperClassName="flex-1"
                      />
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
                          className="text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <LoanPlanTotalsPreview control={planForm.control} />
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStepIndex(2)}>
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={isCapitalInvalid}
                isLoading={updateLoanMutation.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Lưu phương án & Tiếp tục
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* BƯỚC 5: KÊ KHAI TÀI SẢN & HỢP ĐỒNG THẾ CHẤP (Mục 3.5 & 3.7) */}
      {stepIndex === 4 && draftLoan && (
        <div className="space-y-6">
          <CollateralsSection
            loanId={draftLoan.id}
            loanType={draftLoan.loanType}
            loanAmount={draftLoan.loanAmount}
            collaterals={draftLoan.collaterals ?? []}
          />

          {isLoanEligibleForRelatedPerson(draftLoan.loanType, draftLoan.loanAmount) && (
            <RelatedPersonsSection
              loanId={draftLoan.id}
              loanType={draftLoan.loanType}
              loanAmount={draftLoan.loanAmount}
              borrowerAddress={draftLoan.member?.address}
            />
          )}

          {draftLoan.loanType === LoanType.THE_CHAP ? (
            <Card>
              <form onSubmit={mortgageForm.handleSubmit(handleStep5Submit)} noValidate>
                <CardHeader>
                  <div>
                    <CardTitle>Thông tin Hợp đồng thế chấp</CardTitle>
                    <CardDescription>
                      Bắt buộc phải có thông tin Hợp đồng thế chấp trước khi hoàn thành hồ sơ vay
                      thế chấp
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormTextField
                      control={mortgageForm.control}
                      name="contractNumber"
                      label="Số hợp đồng thế chấp"
                      required
                      placeholder="VD: HĐTC-2026/001"
                    />
                    <FormDateField
                      control={mortgageForm.control}
                      name="contractExpiryDate"
                      label="Ngày hết hạn HĐTC"
                    />
                    <FormDateField
                      control={mortgageForm.control}
                      name="committeeAuthDate"
                      label="Ngày chứng thực UBND"
                    />
                  </div>

                  {isMortgageExpiryShort && expectedMaturityDate && (
                    <Alert
                      tone="warning"
                      title="Thời hạn hợp đồng thế chấp ngắn hơn thời hạn vay dự kiến"
                    >
                      Hợp đồng thế chấp hết hạn ngày{' '}
                      <strong>{formatDateVN(watchedMortgageExpiry)}</strong>, ngắn hơn thời hạn vay
                      dự kiến ({draftLoan.termMonths} tháng — đến ngày{' '}
                      <strong>{formatDateVN(expectedMaturityDate)}</strong>). Ngày đáo hạn thực tế
                      của khoản vay sẽ được điều chỉnh theo ngày hết hạn HĐ thế chấp. Hồ sơ vẫn được
                      phép lưu và tiếp tục bình thường.
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" onClick={() => setStepIndex(3)}>
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    isLoading={updateLoanMutation.isPending}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Lưu HĐ thế chấp & Sang bước Xác nhận
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setStepIndex(3)}>
                  Quay lại
                </Button>
                <Button
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => setStepIndex(5)}
                >
                  Tiếp tục: Kiểm tra & Xác nhận hồ sơ
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {/* BƯỚC 6: XÁC NHẬN & HOÀN THÀNH HỒ SƠ */}
      {stepIndex === 5 && draftLoan && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bước 6: Kiểm tra điều kiện & Hoàn thành hồ sơ</CardTitle>
              <CardDescription>
                Đối chiếu toàn bộ thông tin trước khi chuyển hồ sơ sang trạng thái &ldquo;Đã hoàn
                thành hồ sơ&rdquo;
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <DescriptionList columns={3}>
              <DescriptionItem
                label="Thành viên vay vốn"
                value={`${draftLoan.member?.fullName ?? '—'} (${draftLoan.member?.memberCode ?? ''})`}
              />
              <DescriptionItem
                label="Hình thức & Kỳ hạn"
                value={`${LOAN_TYPE_LABELS[draftLoan.loanType]} · ${LOAN_TERM_TYPE_LABELS[draftLoan.termType]}`}
              />
              <DescriptionItem
                label="Số khế ước"
                value={draftLoan.contractNumber || '—'}
                mono
              />
              <DescriptionItem
                label="Số tiền vay đề nghị"
                value={
                  <span className="text-base font-bold text-primary-700">
                    {formatVND(draftLoan.loanAmount)}
                  </span>
                }
                mono
              />
              <DescriptionItem
                label="Lãi suất chốt"
                value={formatInterestRate(draftLoan.interestRate)}
                mono
              />
              <DescriptionItem
                label="Mục đích vay"
                value={draftLoan.loanPlan?.purpose ?? 'Chưa nhập phương án vay'}
              />
            </DescriptionList>

            {/* Checklist điều kiện nghiệp vụ */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
              <div className="font-semibold uppercase tracking-wider text-slate-600">
                Kiểm tra điều kiện nghiệp vụ tự động:
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-600" />
                <span>Đã gắn thành viên và chốt lãi suất theo quy định hiện hành.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${hasRequiredAssets ? 'text-success-600' : 'text-amber-600'}`}
                />
                <span>
                  Thông tin tài sản kê khai:{' '}
                  <strong>
                    {hasRequiredAssets
                      ? `Đã kê khai ${collaterals.length} tài sản`
                      : 'Chưa kê khai tài sản (Bắt buộc khai báo ít nhất 01 tài sản ở Bước 5)'}
                  </strong>
                  {draftLoan.loanType === LoanType.TIN_CHAP &&
                    ' (Vay tín chấp không yêu cầu định giá tài sản và không cần Hợp đồng thế chấp)'}
                </span>
              </div>
              {draftLoan.loanType === LoanType.THE_CHAP && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        totalCollateralValuation >= minRequiredValuation
                          ? 'text-success-600'
                          : 'text-amber-600'
                      }`}
                    />
                    <span>
                      Tổng định giá TSTC: <strong>{formatVND(totalCollateralValuation)}</strong> /
                      Yêu cầu tối thiểu:{' '}
                      <strong>{formatVND(minRequiredValuation)}</strong> (tỷ lệ vay ≤ 70%).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        draftLoan.mortgageContract ? 'text-success-600' : 'text-amber-600'
                      }`}
                    />
                    <span>
                      Hợp đồng thế chấp:{' '}
                      <strong>
                        {draftLoan.mortgageContract?.contractNumber || 'Chưa lưu hợp đồng thế chấp'}
                      </strong>
                    </span>
                  </div>
                  {isRelatedEligible && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          (draftLoan.relatedPersons?.length ?? 0) > 0
                            ? 'text-success-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>
                        Người liên quan (vay thế chấp ≥ 140tr):{' '}
                        <strong>
                          {(draftLoan.relatedPersons?.length ?? 0) > 0
                            ? `Đã khai báo ${draftLoan.relatedPersons?.length} người liên quan`
                            : 'Chưa bổ sung (không bắt buộc khi lập hồ sơ, có thể bổ sung sau)'}
                        </strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStepIndex(4)}>
              Quay lại
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(`/loans/${draftLoan.id}`)}>
                Giữ ở trạng thái Đang tạo (Lưu nháp)
              </Button>
              <Button
                disabled={!isDossierReady}
                onClick={() => setConfirmCompleteOpen(true)}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Hoàn thành hồ sơ khoản vay
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Hộp thoại xác nhận ghi đè khi Tải mẫu phương án vay */}
      <ConfirmDialog
        open={Boolean(pendingTemplate)}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
        title={
          pendingTemplate
            ? `Áp dụng "${LOAN_PLAN_TEMPLATE_META[pendingTemplate].label}"?`
            : 'Áp dụng mẫu phương án vay?'
        }
        description={
          pendingTemplate
            ? `Hệ thống sẽ thay thế các dòng Chi phí đầu tư và Nguồn thu trả nợ hiện tại bằng công thức chuẩn của "${LOAN_PLAN_TEMPLATE_META[pendingTemplate].label}" (${LOAN_PLAN_TEMPLATE_META[pendingTemplate].description}). Sau khi tải mẫu, bạn vẫn có thể chỉnh sửa lại từng khoản mục.`
            : undefined
        }
        confirmText="Xác nhận tải mẫu"
        onConfirm={() => {
          if (pendingTemplate) {
            applyLoanPlanTemplate(pendingTemplate);
          }
        }}
      />

      <ConfirmDialog
        open={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        title="Xác nhận Hoàn thành hồ sơ khoản vay?"
        description="Sau khi chuyển sang trạng thái Đã hoàn thành hồ sơ, khoản vay sẽ đủ điều kiện để thực hiện Giải ngân."
        confirmText="Xác nhận hoàn thành"
        isLoading={updateStatusMutation.isPending}
        onConfirm={handleCompleteDossier}
      />
    </div>
  );
}
