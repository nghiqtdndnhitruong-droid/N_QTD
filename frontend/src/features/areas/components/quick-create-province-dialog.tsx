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
import { TextInput } from '@/components/form';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { useCreateProvince } from '../hooks/use-areas';
import type { Province } from '../types/area.types';

export interface QuickCreateProvinceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (province: Province) => void;
}

export function QuickCreateProvinceDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateProvinceDialogProps) {
  const createMutation = useCreateProvince();

  const [provinceName, setProvinceName] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorText(null);
    setProvinceName('');
    setProvinceCode('');
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorText(null);

    const trimmedName = provinceName.trim();
    if (trimmedName.length < 2) {
      setErrorText('Tên tỉnh/thành phố phải có ít nhất 2 ký tự');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        code: provinceCode.trim() || undefined,
      });

      notifySuccess(`Đã thêm "${created.name}" vào danh mục Tỉnh/Thành phố`);
      onOpenChange(false);
      onCreated?.(created);
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Thêm Tỉnh / Thành phố mới</DialogTitle>
              <DialogDescription>
                Bổ sung Tỉnh/Thành phố mới vào hệ thống danh mục địa bàn.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {errorText && (
              <div className="rounded-md bg-danger-50 p-2.5 text-xs text-danger-700">
                {errorText}
              </div>
            )}

            <TextInput
              label="Tên Tỉnh / Thành phố"
              required
              placeholder="Ví dụ: Bến Tre, Tiền Giang, Cần Thơ..."
              value={provinceName}
              onChange={(e) => setProvinceName(e.target.value)}
              hint="Hệ thống tự động chuẩn hóa tiền tố 'Tỉnh' hoặc 'Thành phố' nếu chưa nhập"
              autoFocus
            />

            <TextInput
              label="Mã định danh (tùy chọn)"
              placeholder="Ví dụ: BEN_TRE, TIEN_GIANG..."
              value={provinceCode}
              onChange={(e) => setProvinceCode(e.target.value)}
              hint="Nếu để trống, hệ thống sẽ tự sinh mã không dấu"
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              leftIcon={<Plus className="h-4 w-4" />}
              isLoading={createMutation.isPending}
            >
              Thêm Tỉnh
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

