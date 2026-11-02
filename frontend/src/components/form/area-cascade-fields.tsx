import { useEffect, useMemo, useState } from 'react';
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type UseFormSetValue,
} from 'react-hook-form';
import { MapPin, Plus, Search } from 'lucide-react';
import { SelectInput } from './select-field';
import { TextInput } from './text-field';
import { useAreaTree } from '@/features/areas/hooks/use-areas';
import { QuickCreateHamletDialog } from '@/features/areas/components/quick-create-hamlet-dialog';
import { formatLocationAddress } from '@/shared/utils/identity-document';

export interface FormAreaCascadeFieldsProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  provinceField: Path<TFieldValues>;
  communeField: Path<TFieldValues>;
  hamletField: Path<TFieldValues>;
  addressDetailField?: Path<TFieldValues>;
  fullAddressField?: Path<TFieldValues>;
  sectionTitle?: string;
  sectionHint?: string;
  required?: boolean;
  hamletRequired?: boolean;
  disabled?: boolean;
  autoSelectSingleProvince?: boolean;
}

export function FormAreaCascadeFields<TFieldValues extends FieldValues>({
  control,
  setValue,
  provinceField,
  communeField,
  hamletField,
  addressDetailField,
  fullAddressField,
  sectionTitle = 'Địa bàn quản lý (Tỉnh → Xã → Ấp)',
  sectionHint = 'Chọn Tỉnh và Xã. Cấp Ấp có thể bỏ trống nếu không rõ hoặc nhấn "+ Thêm Ấp mới" vào DB.',
  required = true,
  hamletRequired = false,
  disabled = false,
  autoSelectSingleProvince = true,
}: FormAreaCascadeFieldsProps<TFieldValues>) {
  const { data: tree = [], isLoading: isLoadingTree } = useAreaTree();
  const [hamletSearch, setHamletSearch] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const { field: provinceCtrl, fieldState: provinceState } = useController({
    control,
    name: provinceField,
  });
  const { field: communeCtrl, fieldState: communeState } = useController({
    control,
    name: communeField,
  });
  const { field: hamletCtrl, fieldState: hamletState } = useController({
    control,
    name: hamletField,
  });

  const provinceId = (provinceCtrl.value as string | null | undefined) ?? '';
  const communeId = (communeCtrl.value as string | null | undefined) ?? '';
  const hamletId = (hamletCtrl.value as string | null | undefined) ?? '';

  // Tự động chọn Tỉnh mặc định (Vĩnh Long) nếu chỉ có 1 tỉnh trong danh mục và chưa chọn
  useEffect(() => {
    const firstProv = tree[0];
    if (autoSelectSingleProvince && !provinceId && tree.length === 1 && firstProv) {
      provinceCtrl.onChange(firstProv.id);
    }
  }, [autoSelectSingleProvince, provinceId, tree, provinceCtrl]);

  const selectedProvince = useMemo(
    () => tree.find((p) => p.id === provinceId),
    [tree, provinceId],
  );

  const communes = useMemo(
    () => selectedProvince?.communes ?? [],
    [selectedProvince],
  );

  const selectedCommune = useMemo(
    () => communes.find((c) => c.id === communeId),
    [communes, communeId],
  );

  const hamlets = useMemo(() => {
    const raw = selectedCommune?.hamlets ?? [];
    if (!hamletSearch.trim()) return raw;
    const kw = hamletSearch.trim().toLowerCase();
    return raw.filter((h) => h.name.toLowerCase().includes(kw));
  }, [selectedCommune, hamletSearch]);

  const selectedHamlet = useMemo(
    () => (selectedCommune?.hamlets ?? []).find((h) => h.id === hamletId),
    [selectedCommune, hamletId],
  );

  // Hàm đồng bộ chuỗi địa chỉ đầy đủ khi thay đổi Tỉnh/Xã/Ấp/Chi tiết
  const syncFullAddress = (
    nextProvName?: string | null,
    nextCommName?: string | null,
    nextHamletName?: string | null,
    nextDetail?: string | null,
  ) => {
    if (!fullAddressField) return;
    const formatted = formatLocationAddress({
      provinceName: nextProvName,
      communeName: nextCommName,
      hamletName: nextHamletName,
      addressDetail: nextDetail,
    });
    if (formatted) {
      setValue(fullAddressField, formatted as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary-600" />
            {sectionTitle}
          </h4>
          {sectionHint && <p className="mt-0.5 text-xs text-slate-500">{sectionHint}</p>}
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => setQuickCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-700 shadow-2xs hover:bg-primary-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm Ấp mới vào DB
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* 1. Chọn Tỉnh / Thành phố */}
        <SelectInput
          name={provinceCtrl.name}
          ref={provinceCtrl.ref}
          label="1. Tỉnh / Thành phố"
          required={required}
          disabled={disabled || isLoadingTree}
          value={provinceId}
          placeholder={isLoadingTree ? 'Đang tải danh mục tỉnh...' : '-- Chọn Tỉnh --'}
          error={provinceState.error?.message}
          onBlur={provinceCtrl.onBlur}
          onChange={(e) => {
            const nextProvinceId = e.target.value;
            provinceCtrl.onChange(nextProvinceId);
            // Xóa lựa chọn Xã và Ấp cũ khi đổi Tỉnh
            communeCtrl.onChange('');
            hamletCtrl.onChange('');
            setHamletSearch('');
            const prov = tree.find((p) => p.id === nextProvinceId);
            syncFullAddress(prov?.name, null, null, null);
          }}
          options={tree.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />

        {/* 2. Chọn Xã / Phường */}
        <SelectInput
          name={communeCtrl.name}
          ref={communeCtrl.ref}
          label="2. Xã quản lý"
          required={required}
          disabled={disabled || !provinceId || isLoadingTree}
          value={communeId}
          placeholder={!provinceId ? 'Chọn Tỉnh trước' : '-- Chọn Xã --'}
          error={communeState.error?.message}
          onBlur={communeCtrl.onBlur}
          onChange={(e) => {
            const nextCommuneId = e.target.value;
            communeCtrl.onChange(nextCommuneId);
            // Xóa lựa chọn Ấp cũ khi đổi Xã
            hamletCtrl.onChange('');
            setHamletSearch('');
            const comm = communes.find((c) => c.id === nextCommuneId);
            syncFullAddress(selectedProvince?.name, comm?.name, null, null);
          }}
          options={communes.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        {/* 3. Chọn Ấp thuộc Xã */}
        <div className="space-y-1.5">
          <SelectInput
            name={hamletCtrl.name}
            ref={hamletCtrl.ref}
            label={hamletRequired ? '3. Ấp / Khu phố' : '3. Ấp / Khu phố (Tùy chọn)'}
            required={hamletRequired}
            disabled={disabled || !communeId || isLoadingTree}
            value={hamletId}
            placeholder={
              !communeId
                ? 'Chọn Xã trước'
                : (selectedCommune?.hamlets.length ?? 0) === 0
                  ? 'Chưa có ấp (có thể bỏ trống hoặc Nhấn + Thêm Ấp mới)'
                  : '-- Chọn Ấp (hoặc để trống) --'
            }
            error={hamletState.error?.message}
            onBlur={hamletCtrl.onBlur}
            onChange={(e) => {
              const nextHamletId = e.target.value;
              hamletCtrl.onChange(nextHamletId);
              const ham = (selectedCommune?.hamlets ?? []).find(
                (h) => h.id === nextHamletId,
              );
              syncFullAddress(
                selectedProvince?.name,
                selectedCommune?.name,
                ham?.name,
                null,
              );
            }}
            options={hamlets.map((h) => ({
              value: h.id,
              label: h.name,
            }))}
          />
          {communeId && (selectedCommune?.hamlets.length ?? 0) > 4 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={hamletSearch}
                onChange={(e) => setHamletSearch(e.target.value)}
                placeholder="Lọc nhanh tên ấp trong xã..."
                className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Trường địa chỉ chi tiết & hiển thị chuỗi địa bàn kết xuất */}
      {addressDetailField && (
        <AddressDetailSubField
          control={control}
          name={addressDetailField}
          disabled={disabled}
          selectedProvinceName={selectedProvince?.name}
          selectedCommuneName={selectedCommune?.name}
          selectedHamletName={selectedHamlet?.name}
          onSyncFullAddress={(detail) =>
            syncFullAddress(
              selectedProvince?.name,
              selectedCommune?.name,
              selectedHamlet?.name,
              detail,
            )
          }
        />
      )}

      {/* Hộp thoại tạo nhanh Ấp mới ngay từ Form */}
      <QuickCreateHamletDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultProvinceId={provinceId || tree[0]?.id}
        defaultCommuneId={communeId || null}
        onCreated={(created) => {
          const parentCommuneId = created.communeId;
          const parentProvinceId =
            created.commune?.provinceId || provinceId || tree[0]?.id || '';
          if (parentProvinceId && parentProvinceId !== provinceId) {
            provinceCtrl.onChange(parentProvinceId);
          }
          if (parentCommuneId && parentCommuneId !== communeId) {
            communeCtrl.onChange(parentCommuneId);
          }
          hamletCtrl.onChange(created.id);
          syncFullAddress(
            created.commune?.province?.name ?? selectedProvince?.name,
            created.commune?.name ?? selectedCommune?.name,
            created.name,
            null,
          );
        }}
      />
    </div>
  );
}

function AddressDetailSubField<TFieldValues extends FieldValues>({
  control,
  name,
  disabled,
  selectedProvinceName,
  selectedCommuneName,
  selectedHamletName,
  onSyncFullAddress,
}: {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  disabled?: boolean;
  selectedProvinceName?: string;
  selectedCommuneName?: string;
  selectedHamletName?: string;
  onSyncFullAddress: (detail: string) => void;
}) {
  const { field, fieldState } = useController({ control, name });
  const detailVal = (field.value as string | null | undefined) ?? '';

  const previewAddress = [
    detailVal.trim(),
    selectedHamletName,
    selectedCommuneName,
    selectedProvinceName,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
      <TextInput
        name={field.name}
        ref={field.ref}
        label="Số nhà / Tổ / Địa chỉ chi tiết (tùy chọn)"
        placeholder="VD: Tổ 3, gần chợ Nhị Trường..."
        disabled={disabled}
        value={detailVal}
        error={fieldState.error?.message}
        onBlur={field.onBlur}
        onChange={(e) => {
          field.onChange(e.target.value);
          onSyncFullAddress(e.target.value);
        }}
      />
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
        <div className="font-medium text-slate-500">Địa chỉ đầy đủ ghi nhận vào hồ sơ:</div>
        <div className="mt-0.5 font-semibold text-slate-800">
          {previewAddress || 'Chưa chọn Ấp / Xã / Tỉnh'}
        </div>
      </div>
    </div>
  );
}
