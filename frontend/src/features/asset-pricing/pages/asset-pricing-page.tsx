import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
import { formatDateVN, formatVND, toApiDate } from '@/shared/format';
import { apiDateStringSchema, positiveVndSchema } from '@/shared/validation';
import { applyServerErrorsToForm } from '@/lib/http';
import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui';
import { DataTable } from '@/components/data-table';
import {
  FormCurrencyField,
  FormDateField,
  FormTextareaField,
  FormTextField,
} from '@/components/form';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import {
  useAssetPricingList,
  useCreateAssetPricing,
  useUpdateAssetPricing,
} from '../hooks/use-asset-pricing';
import type { AssetPricingRule } from '../types/asset-pricing.types';

const pricingSchema = z.object({
  landCategory: z.string().trim().min(2, 'Nhập tên loại đất / vị trí đất'),
  pricePerSqMeter: positiveVndSchema('Đơn giá trên m²'),
  effectiveDate: apiDateStringSchema('Ngày áp dụng'),
  note: z.string().trim().optional(),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

export function AssetPricingPage() {
  const [page, setPage] = useState(1);
  const [editingRule, setEditingRule] = useState<AssetPricingRule | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<PricingFormValues | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useAssetPricingList({
    page,
    limit: 20,
  });

  const createMutation = useCreateAssetPricing();
  const updateMutation = useUpdateAssetPricing();

  const { control, handleSubmit, reset, setError } = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    mode: 'onTouched',
    defaultValues: {
      landCategory: '',
      pricePerSqMeter: 0,
      effectiveDate: toApiDate(new Date()),
      note: '',
    },
  });

  const openCreate = () => {
    setEditingRule(null);
    reset({
      landCategory: '',
      pricePerSqMeter: 0,
      effectiveDate: toApiDate(new Date()),
      note: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (rule: AssetPricingRule) => {
    setEditingRule(rule);
    reset({
      landCategory: rule.landCategory,
      pricePerSqMeter: rule.pricePerSqMeter,
      effectiveDate: rule.effectiveDate.slice(0, 10),
      note: rule.note ?? '',
    });
    setDrawerOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) return;
    try {
      if (editingRule) {
        await updateMutation.mutateAsync({
          id: editingRule.id,
          payload: pendingValues,
        });
        notifySuccess(`Đã cập nhật đơn giá "${pendingValues.landCategory}"`);
      } else {
        await createMutation.mutateAsync({
          ...pendingValues,
          isActive: true,
        });
        notifySuccess(`Đã thêm quy định giá đất "${pendingValues.landCategory}"`);
      }
      setPendingValues(null);
      setDrawerOpen(false);
    } catch (err) {
      setPendingValues(null);
      if (!applyServerErrorsToForm(err, setError)) {
        notifyApiError(err);
      }
    }
  };

  const columns = useMemo<ColumnDef<AssetPricingRule>[]>(
    () => [
      {
        accessorKey: 'landCategory',
        header: 'Phân loại đất / Vị trí',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">{row.original.landCategory}</span>
        ),
      },
      {
        accessorKey: 'pricePerSqMeter',
        header: 'Đơn giá (VNĐ / m²)',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-bold text-primary-700 tabular-nums">
            {formatVND(row.original.pricePerSqMeter)}
          </span>
        ),
      },
      {
        accessorKey: 'effectiveDate',
        header: 'Ngày áp dụng',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDateVN(row.original.effectiveDate)}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge tone={row.original.isActive ? 'success' : 'neutral'} dot>
            {row.original.isActive ? 'Đang áp dụng' : 'Ngưng áp dụng'}
          </Badge>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{row.original.note || '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Can perm="asset-pricing:update">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => openEdit(row.original)}
            >
              Cập nhật
            </Button>
          </Can>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Danh mục Bảng giá tài sản thế chấp"
        description="Quy định đơn giá đất (VNĐ/m²) của Quỹ dùng để tự động tính giá trị định giá tài sản thế chấp."
        actions={
          <Can perm="asset-pricing:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Thêm đơn giá đất
            </Button>
          </Can>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="Chưa có quy định đơn giá đất"
        emptyDescription="Thêm các loại đất (Đất ruộng, Cập kênh, Cập đường lộ...) để cán bộ tín dụng định giá nhanh."
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="md">
          <DrawerHeader
            title={editingRule ? 'Cập nhật đơn giá đất' : 'Thêm quy định đơn giá đất mới'}
            description="Đơn giá này được dùng khi định giá tài sản theo phương pháp Bảng giá Quỹ."
          />
          <DrawerBody>
            <form
              id="asset-pricing-form"
              onSubmit={handleSubmit((vals) => setPendingValues(vals))}
              noValidate
              className="space-y-4"
            >
              <FormTextField
                control={control}
                name="landCategory"
                label="Loại đất / Vị trí"
                required
                placeholder="VD: Đất ruộng, Cập kênh, Cập đường lộ..."
              />
              <FormCurrencyField
                control={control}
                name="pricePerSqMeter"
                label="Đơn giá trên 1 m²"
                required
                suffix="VNĐ/m²"
              />
              <FormDateField
                control={control}
                name="effectiveDate"
                label="Ngày bắt đầu áp dụng"
                required
              />
              <FormTextareaField
                control={control}
                name="note"
                label="Ghi chú"
                placeholder="Ghi chú văn bản quy định..."
              />
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="asset-pricing-form">
              Lưu quy định
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Xác nhận lưu quy định đơn giá đất?"
        description={
          pendingValues
            ? `Loại đất "${pendingValues.landCategory}" sẽ áp dụng mức giá ${formatVND(pendingValues.pricePerSqMeter)}/m² từ ngày ${formatDateVN(pendingValues.effectiveDate)}.`
            : undefined
        }
        confirmText="Xác nhận lưu"
        isLoading={createMutation.isPending || updateMutation.isPending}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}

