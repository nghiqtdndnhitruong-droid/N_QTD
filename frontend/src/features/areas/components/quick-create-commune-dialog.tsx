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
import { useAreaTree, useCreateCommune } from '../hooks/use-areas';
import type { Commune } from '../types/area.types';

export interface QuickCreateCommuneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvinceId?: string | null;
  onCreated?: (commune: Commune) => void;
}

export function QuickCreateCommuneDialog({
  open,
  onOpenChange,
  defaultProvinceId,
  onCreated,
}: QuickCreateCommuneDialogProps) {
  const { data: tree = [], isLoading: isLoadingTree } = useAreaTree();
  const createMutation = useCreateCommune();

  const [provinceId, setProvinceId] = useState('');
  const [communeName, setCommuneName] = useState('');
  const [communeCode, setCommuneCode] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorText(null);
    setCommuneName('');
    setCommuneCode('');

    const firstProvince = tree[0];
    const resolvedProvinceId = defaultProvinceId || firstProvince?.id || '';
    setProvinceId(resolvedProvinceId);
  }, [open, tree, defaultProvinceId]);

  const currentProvince = tree.find((p) => p.id === provinceId) ?? tree[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorText(null);

    if (!provinceId) {
      setErrorText('Vui lòng chọn Tỉnh/Thành phố quản lý');
      return;
    }

    const trimmed = communeName.trim();
    if (trimmed.length < 2) {
      setErrorText('Tên Xã/Phường phải có ít nhất 2 ký tự (ví dụ: Xã Long Sơn hoặc Long Sơn)');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        provinceId,
        name: trimmed,
        code: communeCode.trim() || undefined,
      });
      notifySuccess(
        `Đã thêm "${created.name}" vào ${currentProvince?.name || 'danh mục địa bàn'}`,
        'Xã mới đã được lưu vào Database và sẵn sàng thêm Ấp hoặc gán hồ sơ.',
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
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Thêm Xã/Phường mới vào Database</DialogTitle>
              <DialogDescription>
                Bổ sung xã mới thuộc phạm vi hoạt động của Quỹ tín dụng vào danh mục địa bàn.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="space-y-4">
            {errorText && (
              <div
                role="alert"
                className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-800"
              >
                {errorText}
              </div>
            )}

            <SelectInput
              label="Tỉnh / Thành phố trực thuộc"
              required
              disabled={isLoadingTree || tree.length <= 1}
              value={provinceId}
              onChange={(e) => setProvinceId(e.target.value)}
              options={tree.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              hint={
                tree.length <= 1
                  ? 'Mặc định theo Tỉnh hoạt động của Quỹ tín dụng'
                  : undefined
              }
            />

            <TextInput
              label="Tên Xã / Phường / Thị trấn"
              required
              autoFocus
              placeholder="Ví dụ: Xã Long Sơn, Phường 1..."
              value={communeName}
              onChange={(e) => {
                setCommuneName(e.target.value);
                if (errorText) setErrorText(null);
              }}
              hint="Hệ thống tự động thêm tiền tố 'Xã' nếu bạn chỉ gõ tên riêng (ví dụ: 'Long Sơn' → 'Xã Long Sơn')."
            />

            <TextInput
              label="Mã Xã (Tùy chọn)"
              placeholder="Ví dụ: XA_LONG_SON (để trống sẽ tự sinh từ tên)"
              value={communeCode}
              onChange={(e) => setCommuneCode(e.target.value.toUpperCase())}
              hint="Dùng để định danh kỹ thuật trong hệ thống và sinh từ khóa mẫu Word."
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Lưu Xã mới
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

