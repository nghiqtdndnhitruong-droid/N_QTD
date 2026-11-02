import { useEffect, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { SelectInput, TextInput } from '@/components/form';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { useAreaTree, useCreateHamlet } from '../hooks/use-areas';
import type { Hamlet } from '../types/area.types';

export interface QuickCreateHamletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvinceId?: string | null;
  defaultCommuneId?: string | null;
  onCreated?: (hamlet: Hamlet) => void;
}

export function QuickCreateHamletDialog({
  open,
  onOpenChange,
  defaultProvinceId,
  defaultCommuneId,
  onCreated,
}: QuickCreateHamletDialogProps) {
  const { data: tree = [], isLoading: isLoadingTree } = useAreaTree();
  const createMutation = useCreateHamlet();

  const [provinceId, setProvinceId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [hamletName, setHamletName] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorText(null);
    setHamletName('');

    const firstProvince = tree[0];
    const resolvedProvinceId = defaultProvinceId || firstProvince?.id || '';
    setProvinceId(resolvedProvinceId);

    const selectedProv = tree.find((p) => p.id === resolvedProvinceId) ?? firstProvince;
    const resolvedCommuneId =
      defaultCommuneId && selectedProv?.communes.some((c) => c.id === defaultCommuneId)
        ? defaultCommuneId
        : (selectedProv?.communes[0]?.id ?? '');
    setCommuneId(resolvedCommuneId);
  }, [open, tree, defaultProvinceId, defaultCommuneId]);

  const currentProvince = tree.find((p) => p.id === provinceId) ?? tree[0];
  const communes = currentProvince?.communes ?? [];
  const selectedCommune = communes.find((c) => c.id === communeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorText(null);

    if (!communeId) {
      setErrorText('Vui lòng chọn Xã quản lý');
      return;
    }

    const trimmed = hamletName.trim();
    if (trimmed.length < 2) {
      setErrorText('Tên Ấp phải có ít nhất 2 ký tự (ví dụ: Ấp Nô Lựa)');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        communeId,
        name: trimmed,
      });
      notifySuccess(
        `Đã thêm "${created.name}" vào ${selectedCommune?.name || 'danh mục xã'}`,
        'Dữ liệu ấp mới đã được lưu vào Database và sẵn sàng sử dụng.',
      );
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        setErrorText(err.message);
      } else {
        notifyApiError(err);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Thêm Ấp mới vào Database</DialogTitle>
          <DialogDescription>
            Bổ sung Ấp thuộc địa bàn 3 xã quản lý của Quỹ tín dụng (Xã Nhị Trường, Xã Tập Sơn, Xã Long Hiệp - Tỉnh Vĩnh Long).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="space-y-4">
            <SelectInput
              label="Tỉnh / Thành phố"
              required
              disabled={isLoadingTree}
              value={provinceId}
              onChange={(e) => {
                const nextProvId = e.target.value;
                setProvinceId(nextProvId);
                const prov = tree.find((p) => p.id === nextProvId);
                setCommuneId(prov?.communes[0]?.id ?? '');
              }}
              options={tree.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />

            <SelectInput
              label="Xã quản lý"
              required
              disabled={!provinceId || isLoadingTree}
              value={communeId}
              onChange={(e) => setCommuneId(e.target.value)}
              options={communes.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.hamlets.length} ấp hiện có)`,
              }))}
            />

            <TextInput
              label="Tên Ấp mới"
              required
              placeholder="VD: Ấp Nô Lựa, Ấp Cầu Ngang..."
              value={hamletName}
              error={errorText ?? undefined}
              hint="Nếu bạn chỉ nhập tên (VD: 'Nô Lựa'), hệ thống sẽ tự động chuẩn hóa thành 'Ấp Nô Lựa'."
              leftAddon={<MapPin className="h-4 w-4 text-primary-600" />}
              onChange={(e) => {
                setHamletName(e.target.value);
                if (errorText) setErrorText(null);
              }}
            />

            {selectedCommune && selectedCommune.hamlets.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Các ấp đã có trong {selectedCommune.name}:
                </span>{' '}
                {selectedCommune.hamlets.map((h) => h.name).join(', ')}
              </div>
            )}
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
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Lưu Ấp vào Database
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
