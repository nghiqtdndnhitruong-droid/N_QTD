import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDateVN, formatVND, toApiDate, vndToWords } from '@/shared/format';
import { LoanStatus } from '@/shared/types';
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
  useCreateDisbursement,
  useDeleteDisbursement,
  useUpdateDisbursement,
} from '../hooks/use-loans';
import {
  disbursementFormSchema,
  type DisbursementFormValues,
} from '../schemas/loan.schema';
import type { Disbursement } from '../types/loan.types';

export interface DisbursementsSectionProps {
  loanId: string;
  loanStatus: LoanStatus;
  remainingDisbursableAmount: number;
  disbursements: Disbursement[];
}

export function DisbursementsSection({
  loanId,
  loanStatus,
  remainingDisbursableAmount,
  disbursements,
}: DisbursementsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Disbursement | null>(null);
  const [editReason, setEditReason] = useState('');
  const [pendingValues, setPendingValues] = useState<DisbursementFormValues | null>(null);

  const [deletingItem, setDeletingItem] = useState<Disbursement | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const createMutation = useCreateDisbursement(loanId);
  const updateMutation = useUpdateDisbursement(loanId);
  const deleteMutation = useDeleteDisbursement(loanId);

  const activeDisbursements = disbursements.filter((d) => !d.isDeleted);

  const canDisburse =
    (loanStatus === LoanStatus.DA_HOAN_THANH_HO_SO || loanStatus === LoanStatus.DA_GIAI_NGAN) &&
    remainingDisbursableAmount > 0;

  const { control, handleSubmit, reset, setError } = useForm<DisbursementFormValues>({
    resolver: zodResolver(disbursementFormSchema),
    mode: 'onTouched',
    defaultValues: {
      disbursementDate: toApiDate(new Date()),
      amount: remainingDisbursableAmount > 0 ? remainingDisbursableAmount : 0,
      note: '',
    },
  });

  const openCreateDrawer = () => {
    setEditingItem(null);
    setEditReason('');
    reset({
      disbursementDate: toApiDate(new Date()),
      amount: remainingDisbursableAmount,
      note: '',
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Disbursement) => {
    setEditingItem(item);
    setEditReason(item.updatedReason ?? '');
    reset({
      disbursementDate: item.disbursementDate ? item.disbursementDate.slice(0, 10) : toApiDate(new Date()),
      amount: item.amount,
      note: item.note ?? '',
    });
    setDrawerOpen(true);
  };

  const maxAllowedForForm = editingItem
    ? remainingDisbursableAmount + editingItem.amount
    : remainingDisbursableAmount;

  const handleConfirm = async () => {
    if (!pendingValues) return;

    if (pendingValues.amount > maxAllowedForForm) {
      setPendingValues(null);
      setError('amount', {
        type: 'manual',
        message: `Số tiền giải ngân không được vượt quá hạn mức cho phép (${formatVND(maxAllowedForForm)})`,
      });
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          payload: {
            ...pendingValues,
            reason: editReason.trim() || 'Điều chỉnh thông tin giao dịch giải ngân',
          },
        });
        notifySuccess(
          `Đã cập nhật giao dịch giải ngân (${formatVND(pendingValues.amount)})`,
          'Hệ thống đã tự động tính lại dư nợ, ngày đáo hạn và ghi nhận Audit Log.',
        );
      } else {
        await createMutation.mutateAsync(pendingValues);
        notifySuccess(`Đã ghi nhận giải ngân ${formatVND(pendingValues.amount)}`);
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
      await deleteMutation.mutateAsync({
        id: deletingItem.id,
        reason: deleteReason.trim() || 'Hủy giao dịch giải ngân sai sót theo yêu cầu nghiệp vụ',
      });
      notifySuccess(
        `Đã hủy giao dịch giải ngân ${formatVND(deletingItem.amount)}`,
        'Dư nợ khoản vay và hạn mức giải ngân còn lại đã được cập nhật tự động.',
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
            Lịch sử Giải ngân ({activeDisbursements.length} hiệu lực / {disbursements.length} tổng)
          </CardTitle>
          <CardDescription>
            Hạn mức còn được phép giải ngân tiếp:{' '}
            <strong className="text-primary-700 tabular-nums">
              {formatVND(remainingDisbursableAmount)}
            </strong>
          </CardDescription>
        </div>

        {canDisburse && (
          <Can perm="disbursement:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateDrawer}
            >
              Ghi nhận giải ngân
            </Button>
          </Can>
        )}
      </CardHeader>

      <CardContent>
        {disbursements.length === 0 ? (
          <EmptyState
            title="Chưa có đợt giải ngân nào"
            description={
              canDisburse
                ? 'Hồ sơ đã đủ điều kiện. Bạn có thể ghi nhận đợt giải ngân đầu tiên (hệ thống sẽ tự động tính ngày đáo hạn từ đợt giải ngân đầu tiên).'
                : 'Hồ sơ cần được chuyển sang trạng thái "Đã hoàn thành hồ sơ" trước khi giải ngân.'
            }
            icon={<Banknote className="h-6 w-6" />}
            action={
              canDisburse ? (
                <Can perm="disbursement:create">
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={openCreateDrawer}
                  >
                    Giải ngân đợt đầu
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
                  <th className="px-4 py-2.5">Đợt</th>
                  <th className="px-4 py-2.5">Ngày giải ngân</th>
                  <th className="px-4 py-2.5 text-right">Số tiền giải ngân</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">Ghi chú & Lịch sử điều chỉnh</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disbursements.map((d, idx) => {
                  const isCancelled = Boolean(d.isDeleted);
                  return (
                    <tr
                      key={d.id}
                      className={isCancelled ? 'bg-slate-50/70 opacity-65' : undefined}
                    >
                      <td className="px-4 py-3 font-medium text-slate-600">Đợt #{idx + 1}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatDateVN(d.disbursementDate)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold tabular-nums ${
                          isCancelled
                            ? 'text-slate-400 line-through'
                            : 'text-primary-700'
                        }`}
                      >
                        {formatVND(d.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {isCancelled ? (
                          <Badge tone="danger">Đã hủy</Badge>
                        ) : (
                          <Badge tone="success">Đang hiệu lực</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5">
                        <div>{d.note || '—'}</div>
                        {d.updatedReason && !isCancelled && (
                          <div className="text-[11px] text-amber-700">
                            Đã điều chỉnh: {d.updatedReason}
                          </div>
                        )}
                        {isCancelled && d.deletedReason && (
                          <div className="text-[11px] text-danger-600">
                            Lý do hủy: {d.deletedReason}
                            {d.deletedAt ? ` (${formatDateVN(d.deletedAt)})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isCancelled ? (
                          <div className="inline-flex items-center gap-1">
                            <Can perm="disbursement:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => openEditDrawer(d)}
                              >
                                Sửa
                              </Button>
                            </Can>
                            <Can perm="disbursement:delete">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-600"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setDeletingItem(d);
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="md">
          <DrawerHeader
            title={
              editingItem
                ? 'Chỉnh sửa giao dịch Giải ngân'
                : 'Ghi nhận Giải ngân vốn vay'
            }
            description={`Số tiền được phép giải ngân tối đa cho đợt này: ${formatVND(maxAllowedForForm)}`}
          />
          <DrawerBody>
            <form
              id="disbursement-form"
              onSubmit={handleSubmit((vals) => setPendingValues(vals))}
              noValidate
              className="space-y-4"
            >
              <FormDateField
                control={control}
                name="disbursementDate"
                label="Ngày giải ngân thực tế"
                required
              />
              <FormCurrencyField
                control={control}
                name="amount"
                label="Số tiền giải ngân"
                required
              />
              <FormTextareaField
                control={control}
                name="note"
                label="Ghi chú chứng từ chi"
                placeholder="VD: Giải ngân tiền mặt theo phiếu chi số..."
              />

              {editingItem && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="disbursement-edit-reason"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Lý do điều chỉnh giao dịch (Lưu vào Audit Log)
                  </label>
                  <input
                    id="disbursement-edit-reason"
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="VD: Điều chỉnh lại ngày/số tiền giải ngân theo phiếu chi thực tế..."
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
            <Button type="submit" form="disbursement-form">
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
            ? 'Xác nhận cập nhật giao dịch Giải ngân?'
            : 'Xác nhận giao dịch Giải ngân?'
        }
        description={
          editingItem
            ? 'Hệ thống sẽ cập nhật giao dịch, tính toán lại dư nợ / ngày đáo hạn của khoản vay và ghi nhận vào Audit Log:'
            : 'Vui lòng kiểm tra kỹ số tiền và ngày giải ngân trước khi ghi vào sổ cái:'
        }
        confirmText={editingItem ? 'Xác nhận cập nhật' : 'Xác nhận giải ngân'}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onConfirm={handleConfirm}
      >
        {pendingValues && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <DescriptionList columns={2}>
              <DescriptionItem
                label="Ngày giải ngân"
                value={formatDateVN(pendingValues.disbursementDate)}
                mono
              />
              <DescriptionItem
                label="Số tiền giải ngân"
                value={
                  <span className="font-bold text-primary-700">
                    {formatVND(pendingValues.amount)}
                  </span>
                }
                mono
              />
              <DescriptionItem
                label="Bằng chữ"
                value={vndToWords(pendingValues.amount)}
                span={2}
              />
            </DescriptionList>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Xác nhận hủy / vô hiệu hóa giao dịch Giải ngân?"
        description={
          deletingItem
            ? `Giao dịch giải ngân ngày ${formatDateVN(deletingItem.disbursementDate)} với số tiền ${formatVND(deletingItem.amount)} sẽ được chuyển sang trạng thái "Đã hủy" (không xóa vật lý để bảo toàn dấu vết kiểm toán) và tự động tính lại dư nợ khoản vay.`
            : undefined
        }
        confirmText="Xác nhận hủy giao dịch"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="disbursement-delete-reason"
            className="block text-xs font-medium text-slate-700"
          >
            Lý do hủy giao dịch (Bắt buộc lưu Audit Log)
          </label>
          <input
            id="disbursement-delete-reason"
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Nhập lý do hủy đợt giải ngân..."
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none"
          />
        </div>
      </ConfirmDialog>
    </Card>
  );
}
