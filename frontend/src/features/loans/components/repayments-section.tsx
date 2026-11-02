import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Coins, Pencil, Plus, Trash2 } from 'lucide-react';
import { LoanStatus } from '@/shared/types';
import { formatDateVN, formatVND, toApiDate, vndToWords } from '@/shared/format';
import {
  calculateInterestEndDate,
  calculateMonthsPeriod,
  generateInterestRepaymentNote,
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
  DescriptionItem,
  DescriptionList,
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
  FormTextareaField,
} from '@/components/form';
import {
  ConfirmDialog,
  EmptyState,
  notifyApiError,
  notifySuccess,
} from '@/components/feedback';
import { Can } from '@/features/auth/components/can';
import {
  useCreateRepayment,
  useDeleteRepayment,
  useInterestEstimate,
  useNextInterestPeriod,
  useUpdateRepayment,
} from '../hooks/use-loans';
import { repaymentFormSchema, type RepaymentFormValues } from '../schemas/loan.schema';
import type { Repayment } from '../types/loan.types';

export interface RepaymentsSectionProps {
  loanId: string;
  contractNumber?: string | null;
  loanStatus: LoanStatus;
  currentPrincipalBalance: number;
  unpaidInterestDays: number;
  repayments: Repayment[];
}

export function RepaymentsSection({
  loanId,
  contractNumber,
  loanStatus,
  currentPrincipalBalance,
  unpaidInterestDays,
  repayments,
}: RepaymentsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Repayment | null>(null);
  const [editReason, setEditReason] = useState('');
  const [pendingValues, setPendingValues] = useState<RepaymentFormValues | null>(null);

  const [deletingItem, setDeletingItem] = useState<Repayment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const createMutation = useCreateRepayment(loanId);
  const updateMutation = useUpdateRepayment(loanId);
  const deleteMutation = useDeleteRepayment(loanId);

  const activeRepayments = repayments.filter((r) => !r.isDeleted);

  const canRepay =
    loanStatus === LoanStatus.DA_GIAI_NGAN || loanStatus === LoanStatus.QUA_HAN;

  const { data: nextPeriod } = useNextInterestPeriod(loanId, drawerOpen);

  const { control, handleSubmit, reset, setValue, setError, register } =
    useForm<RepaymentFormValues>({
      resolver: zodResolver(repaymentFormSchema),
      mode: 'onTouched',
      defaultValues: {
        repaymentDate: toApiDate(new Date()),
        principalAmount: 0,
        interestAmount: 0,
        interestDays: unpaidInterestDays > 0 ? unpaidInterestDays : 90,
        interestStartDate: toApiDate(new Date()),
        interestEndDate: toApiDate(calculateInterestEndDate(new Date(), unpaidInterestDays > 0 ? unpaidInterestDays : 90)),
        autoSettleIfPaidInFull: true,
        note: '',
      },
    });

  const watchedDays = useWatch({ control, name: 'interestDays' }) || 90;
  const watchedStartDate = useWatch({ control, name: 'interestStartDate' });
  const watchedEndDate = useWatch({ control, name: 'interestEndDate' });
  const watchedInterestAmount = useWatch({ control, name: 'interestAmount' }) || 0;

  const { data: estimate } = useInterestEstimate(
    drawerOpen ? loanId : undefined,
    watchedDays,
  );

  // Tự động tính lại Ngày thu lãi đến khi số ngày hoặc ngày bắt đầu thay đổi
  useEffect(() => {
    if (watchedStartDate && watchedDays > 0) {
      const calculatedEnd = calculateInterestEndDate(watchedStartDate, watchedDays);
      setValue('interestEndDate', toApiDate(calculatedEnd), { shouldValidate: true });
    }
  }, [watchedStartDate, watchedDays, setValue]);

  // Cập nhật ngày bắt đầu gợi ý từ backend khi mở drawer tạo mới
  useEffect(() => {
    if (drawerOpen && !editingItem && nextPeriod?.suggestedStartDate) {
      const startStr = nextPeriod.suggestedStartDate.slice(0, 10);
      setValue('interestStartDate', startStr, { shouldValidate: true });
      const initialDays = unpaidInterestDays > 0 ? unpaidInterestDays : 90;
      const end = calculateInterestEndDate(startStr, initialDays);
      setValue('interestEndDate', toApiDate(end), { shouldValidate: true });
    }
  }, [drawerOpen, editingItem, nextPeriod, unpaidInterestDays, setValue]);

  const handleQuickMonths = (months: number) => {
    const startStr = watchedStartDate || toApiDate(new Date());
    const { days, endDate } = calculateMonthsPeriod(startStr, months);
    setValue('interestDays', days, { shouldValidate: true, shouldDirty: true });
    setValue('interestEndDate', toApiDate(endDate), { shouldValidate: true, shouldDirty: true });

    if (nextPeriod && nextPeriod.currentPrincipalBalance > 0 && nextPeriod.annualInterestRate > 0) {
      const calcInterest = Math.round(
        (nextPeriod.currentPrincipalBalance * (nextPeriod.annualInterestRate / 100) * days) / 365
      );
      setValue('interestAmount', calcInterest, { shouldValidate: true, shouldDirty: true });
      const autoNote = generateInterestRepaymentNote({
        contractNumber,
        startDate: startStr,
        endDate,
        interestAmount: calcInterest,
      });
      setValue('note', autoNote, { shouldDirty: true });
    }
  };

  const handleAutoGenerateNote = () => {
    const note = generateInterestRepaymentNote({
      contractNumber,
      startDate: watchedStartDate,
      endDate: watchedEndDate,
      interestAmount: watchedInterestAmount,
    });
    setValue('note', note, { shouldDirty: true, shouldValidate: true });
  };

  const openCreateDrawer = () => {
    setEditingItem(null);
    setEditReason('');
    const start = nextPeriod?.suggestedStartDate
      ? nextPeriod.suggestedStartDate.slice(0, 10)
      : toApiDate(new Date());
    const days = unpaidInterestDays > 0 ? unpaidInterestDays : 90;
    const end = calculateInterestEndDate(start, days);
    reset({
      repaymentDate: toApiDate(new Date()),
      principalAmount: 0,
      interestAmount: 0,
      interestDays: days,
      interestStartDate: start,
      interestEndDate: toApiDate(end),
      autoSettleIfPaidInFull: true,
      note: generateInterestRepaymentNote({
        contractNumber,
        startDate: start,
        endDate: end,
        interestAmount: 0,
      }),
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Repayment) => {
    setEditingItem(item);
    setEditReason(item.updatedReason ?? '');
    reset({
      repaymentDate: item.repaymentDate ? item.repaymentDate.slice(0, 10) : toApiDate(new Date()),
      principalAmount: item.principalAmount,
      interestAmount: item.interestAmount,
      interestDays: item.interestDays,
      interestStartDate: item.interestStartDate ? item.interestStartDate.slice(0, 10) : '',
      interestEndDate: item.interestEndDate ? item.interestEndDate.slice(0, 10) : '',
      autoSettleIfPaidInFull: true,
      note: item.note ?? '',
    });
    setDrawerOpen(true);
  };

  const maxAllowedPrincipal = editingItem
    ? currentPrincipalBalance + editingItem.principalAmount
    : currentPrincipalBalance;

  const handleConfirm = async () => {
    if (!pendingValues) return;
    if (pendingValues.principalAmount > maxAllowedPrincipal) {
      setPendingValues(null);
      setError('principalAmount', {
        type: 'manual',
        message: `Số tiền gốc trả không được vượt quá dư nợ gốc cho phép (${formatVND(maxAllowedPrincipal)})`,
      });
      return;
    }

    try {
      if (editingItem) {
        const res = await updateMutation.mutateAsync({
          id: editingItem.id,
          payload: {
            repaymentDate: pendingValues.repaymentDate,
            principalAmount: pendingValues.principalAmount,
            interestAmount: pendingValues.interestAmount,
            interestDays: pendingValues.interestDays,
            interestStartDate: pendingValues.interestStartDate,
            interestEndDate: pendingValues.interestEndDate,
            note: pendingValues.note,
            reason: editReason.trim() || 'Điều chỉnh thông tin giao dịch thu nợ/trả lãi',
          },
        });
        notifySuccess(
          res.isFullySettled
            ? 'Đã cập nhật giao dịch và tất toán khoản vay!'
            : `Đã cập nhật giao dịch trả nợ (Dư nợ gốc còn lại: ${formatVND(res.remainingPrincipalBalance)})`,
        );
      } else {
        const res = await createMutation.mutateAsync(pendingValues);
        notifySuccess(
          res.isFullySettled
            ? 'Đã thu hết nợ gốc và tự động tất toán khoản vay!'
            : `Đã ghi nhận thu nợ ${formatVND(pendingValues.principalAmount + pendingValues.interestAmount)}`,
        );
      }
      setPendingValues(null);
      setEditingItem(null);
      setDrawerOpen(false);
    } catch (err) {
      setPendingValues(null);
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await deleteMutation.mutateAsync({
        id: deletingItem.id,
        reason: deleteReason.trim() || 'Hủy giao dịch thu nợ/trả lãi sai sót theo yêu cầu nghiệp vụ',
      });
      notifySuccess(
        'Đã hủy giao dịch thu nợ / trả lãi',
        `Dư nợ gốc hiện tại đã được cập nhật lại: ${formatVND(res.remainingPrincipalBalance)}.`,
      );
      setDeletingItem(null);
      setDeleteReason('');
    } catch (err) {
      setDeletingItem(null);
      notifyApiError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            Lịch sử Thu nợ gốc & lãi ({activeRepayments.length} hiệu lực / {repayments.length} tổng)
          </CardTitle>
          <CardDescription>
            Dư nợ gốc thực tế hiện tại:{' '}
            <strong className="text-slate-900 tabular-nums">
              {formatVND(currentPrincipalBalance)}
            </strong>
          </CardDescription>
        </div>

        {canRepay && (
          <Can perm="repayment:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateDrawer}
            >
              Ghi nhận thu nợ
            </Button>
          </Can>
        )}
      </CardHeader>

      <CardContent>
        {repayments.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch trả nợ nào"
            description="Các đợt thu tiền lãi định kỳ (3 tháng/lần) và thu nợ gốc sẽ được hiển thị tại đây."
            icon={<Coins className="h-6 w-6" />}
            action={
              canRepay ? (
                <Can perm="repayment:create">
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={openCreateDrawer}
                  >
                    Thu nợ kỳ đầu
                  </Button>
                </Can>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Ngày thu</th>
                  <th className="px-4 py-2.5 text-right">Thu nợ gốc</th>
                  <th className="px-4 py-2.5 text-right">Thu tiền lãi</th>
                  <th className="px-4 py-2.5 text-center">Số ngày tính lãi</th>
                  <th className="px-4 py-2.5 text-right">Tổng thu</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">Ghi chú & Lịch sử điều chỉnh</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repayments.map((r) => {
                  const isCancelled = Boolean(r.isDeleted);
                  return (
                    <tr
                      key={r.id}
                      className={isCancelled ? 'bg-slate-50/70 opacity-65' : undefined}
                    >
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatDateVN(r.repaymentDate)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {formatVND(r.principalAmount)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          isCancelled ? 'text-slate-400 line-through' : 'text-primary-700'
                        }`}
                      >
                        {formatVND(r.interestAmount)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.interestDays > 0 ? (
                          <div>
                            <div>{r.interestDays} ngày</div>
                            {r.interestStartDate && r.interestEndDate && (
                              <div className="text-[10px] text-slate-500 whitespace-nowrap">
                                {formatDateVN(r.interestStartDate)} - {formatDateVN(r.interestEndDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold tabular-nums ${
                          isCancelled ? 'text-slate-400 line-through' : 'text-success-700'
                        }`}
                      >
                        {formatVND(r.principalAmount + r.interestAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {isCancelled ? (
                          <Badge tone="danger">Đã hủy</Badge>
                        ) : (
                          <Badge tone="success">Đang hiệu lực</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5">
                        <div>{r.note || '—'}</div>
                        {r.updatedReason && !isCancelled && (
                          <div className="text-[11px] text-amber-700">
                            Đã điều chỉnh: {r.updatedReason}
                          </div>
                        )}
                        {isCancelled && r.deletedReason && (
                          <div className="text-[11px] text-danger-600">
                            Lý do hủy: {r.deletedReason}
                            {r.deletedAt ? ` (${formatDateVN(r.deletedAt)})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isCancelled ? (
                          <div className="inline-flex items-center gap-1">
                            <Can perm="repayment:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => openEditDrawer(r)}
                              >
                                Sửa
                              </Button>
                            </Can>
                            <Can perm="repayment:delete">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setDeletingItem(r);
                                  setDeleteReason('');
                                }}
                              >
                                Xóa / Hủy
                              </Button>
                            </Can>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Đã vô hiệu hóa</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Drawer ghi nhận / chỉnh sửa thu nợ */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="lg">
          <DrawerHeader
            title={
              editingItem
                ? 'Chỉnh sửa giao dịch Thu nợ gốc và lãi'
                : 'Ghi nhận Thu nợ gốc và lãi'
            }
            description={`Dư nợ gốc cho phép tối đa cho giao dịch này: ${formatVND(maxAllowedPrincipal)}`}
          />
          <DrawerBody>
            <form
              id="repayment-form"
              onSubmit={handleSubmit((vals) => setPendingValues(vals))}
              noValidate
              className="space-y-4"
            >
              {/* Nút thu lãi nhanh */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Chọn nhanh chu kỳ thu lãi:</span>
                  <span className="text-[11px] text-slate-500">
                    Tự động tính đúng số ngày theo lịch tháng
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white text-xs"
                    onClick={() => handleQuickMonths(3)}
                  >
                    Thu 3 tháng
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white text-xs"
                    onClick={() => handleQuickMonths(4)}
                  >
                    Thu 4 tháng
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white text-xs"
                    onClick={() => handleQuickMonths(5)}
                  >
                    Thu 5 tháng
                  </Button>
                </div>
              </div>

              {/* Thông tin chu kỳ tính lãi & Ngày thu nợ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormDateField
                  control={control}
                  name="interestStartDate"
                  label="Từ ngày tính lãi"
                  hint="Mặc định nối tiếp kỳ trước"
                />
                <FormNumberField
                  control={control}
                  name="interestDays"
                  label="Số ngày tính lãi"
                  required
                  unit="ngày"
                />
                <FormDateField
                  control={control}
                  name="interestEndDate"
                  label="Đến ngày tính lãi"
                  hint="Tự động tính theo số ngày"
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormDateField
                  control={control}
                  name="repaymentDate"
                  label="Ngày thu nợ"
                  required
                />
              </div>

              {/* Khối ước tính tiền lãi tự động từ Backend */}
              {estimate && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-3.5 text-xs">
                  <div>
                    <div className="font-semibold text-primary-900">
                      Lãi ước tính ({estimate.interestCalculationDays} ngày):{' '}
                      <span className="text-sm font-bold text-primary-700 tabular-nums">
                        {formatVND(estimate.estimatedInterestAmount)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-600">
                      Công thức: {estimate.formula}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Calculator className="h-3.5 w-3.5" />}
                    onClick={() => {
                      const amount = Math.round(estimate.estimatedInterestAmount);
                      setValue('interestAmount', amount, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      const autoNote = generateInterestRepaymentNote({
                        contractNumber,
                        startDate: watchedStartDate,
                        endDate: watchedEndDate,
                        interestAmount: amount,
                      });
                      setValue('note', autoNote, { shouldDirty: true });
                    }}
                  >
                    Áp dụng tiền lãi
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormCurrencyField
                  control={control}
                  name="interestAmount"
                  label="Số tiền lãi thực thu"
                  required
                />
                <FormCurrencyField
                  control={control}
                  name="principalAmount"
                  label="Số tiền gốc thực thu"
                  required
                  extraRight={
                    maxAllowedPrincipal > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setValue('principalAmount', maxAllowedPrincipal, {
                            shouldValidate: true,
                          })
                        }
                        className="font-semibold text-primary-600 hover:underline"
                      >
                        Trả hết gốc
                      </button>
                    ) : undefined
                  }
                />
              </div>

              {!editingItem && (
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('autoSettleIfPaidInFull')}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                  />
                  <span>
                    Tự động chuyển trạng thái khoản vay sang <strong>Đã tất toán</strong> nếu dư nợ
                    gốc còn lại bằng 0 ₫
                  </span>
                </label>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Nội dung / Ghi chú phiếu thu</span>
                  <button
                    type="button"
                    onClick={handleAutoGenerateNote}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Tạo lại nội dung theo mẫu
                  </button>
                </div>
                <FormTextareaField
                  control={control}
                  name="note"
                  placeholder="VD: Thu lãi HĐTC [Số khế ước] từ ngày [dd/mm/yyyy] đến ngày [dd/mm/yyyy] số tiền là: [Tiền lãi] đồng"
                />
              </div>

              {editingItem && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="repayment-edit-reason"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Lý do điều chỉnh giao dịch (Lưu vào Audit Log)
                  </label>
                  <input
                    id="repayment-edit-reason"
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="VD: Điều chỉnh lại số tiền gốc/lãi theo phiếu thu thực tế..."
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none"
                  />
                </div>
              )}
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="repayment-form">
              {editingItem ? 'Tiếp tục xác nhận sửa' : 'Tiếp tục xác nhận'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title={
          editingItem
            ? 'Xác nhận cập nhật giao dịch Thu nợ?'
            : 'Xác nhận giao dịch Thu nợ?'
        }
        description={
          editingItem
            ? 'Hệ thống sẽ cập nhật số tiền thu nợ, tính lại dư nợ gốc của khoản vay và ghi nhận vào Audit Log:'
            : 'Vui lòng kiểm tra kỹ số tiền gốc và lãi trước khi ghi nhận:'
        }
        confirmText={editingItem ? 'Xác nhận cập nhật' : 'Xác nhận thu nợ'}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onConfirm={handleConfirm}
      >
        {pendingValues && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <DescriptionList columns={2}>
              <DescriptionItem
                label="Thu nợ gốc"
                value={formatVND(pendingValues.principalAmount)}
                mono
              />
              <DescriptionItem
                label="Thu tiền lãi"
                value={formatVND(pendingValues.interestAmount)}
                mono
              />
              <DescriptionItem
                label="Tổng cộng thực thu"
                value={
                  <span className="font-bold text-success-700">
                    {formatVND(pendingValues.principalAmount + pendingValues.interestAmount)}
                  </span>
                }
                mono
                span={2}
              />
              <DescriptionItem
                label="Bằng chữ"
                value={vndToWords(pendingValues.principalAmount + pendingValues.interestAmount)}
                span={2}
              />
            </DescriptionList>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Xác nhận hủy / vô hiệu hóa giao dịch Thu nợ?"
        description={
          deletingItem
            ? `Giao dịch thu nợ ngày ${formatDateVN(deletingItem.repaymentDate)} (Gốc: ${formatVND(deletingItem.principalAmount)}, Lãi: ${formatVND(deletingItem.interestAmount)}) sẽ được chuyển sang trạng thái "Đã hủy" (không xóa vật lý để bảo toàn dấu vết kiểm toán) và tự động tính lại dư nợ gốc của khoản vay.`
            : undefined
        }
        confirmText="Xác nhận hủy giao dịch"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="repayment-delete-reason"
            className="block text-xs font-medium text-slate-700"
          >
            Lý do hủy giao dịch (Bắt buộc lưu Audit Log)
          </label>
          <input
            id="repayment-delete-reason"
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Nhập lý do hủy đợt thu nợ/trả lãi..."
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none"
          />
        </div>
      </ConfirmDialog>
    </Card>
  );
}
