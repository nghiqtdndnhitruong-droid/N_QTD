import { useMemo, useState } from 'react';
import { Layers, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { SelectInput, TextareaInput, TextInput } from '@/components/form';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  notifyApiError,
  notifySuccess,
  Skeleton,
} from '@/components/feedback';
import {
  useAreaGroups,
  useAreaTree,
  useCreateAreaGroup,
  useDeleteAreaGroup,
  useDeleteHamlet,
  useUpdateAreaGroup,
  useUpdateHamlet,
} from '../hooks/use-areas';
import { QuickCreateHamletDialog } from '../components/quick-create-hamlet-dialog';
import type { AreaGroup, Hamlet } from '../types/area.types';

export function AreaManagementPage() {
  const { data: tree = [], isLoading, isError, error, refetch } = useAreaTree();
  const { data: areaGroups = [], isLoading: isLoadingGroups } = useAreaGroups();
  const updateHamletMutation = useUpdateHamlet();
  const deleteHamletMutation = useDeleteHamlet();
  const createGroupMutation = useCreateAreaGroup();
  const updateGroupMutation = useUpdateAreaGroup();
  const deleteGroupMutation = useDeleteAreaGroup();

  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultCommuneId, setCreateDefaultCommuneId] = useState<string | null>(null);
  const [editingHamlet, setEditingHamlet] = useState<
    (Hamlet & { communeName: string; provinceName: string }) | null
  >(null);
  const [editName, setEditName] = useState('');
  const [deletingHamlet, setDeletingHamlet] = useState<
    (Hamlet & { communeName: string; provinceName: string }) | null
  >(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AreaGroup | null>(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormCode, setGroupFormCode] = useState('');
  const [groupFormDescription, setGroupFormDescription] = useState('');
  const [groupFormCommuneIds, setGroupFormCommuneIds] = useState<string[]>([]);
  const [deletingGroup, setDeletingGroup] = useState<AreaGroup | null>(null);

  const province = tree[0];
  const communes = useMemo(() => province?.communes ?? [], [province]);

  const communeGroupMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of areaGroups) {
      for (const cid of g.communeIds || []) {
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid)!.push(g.name);
      }
    }
    return map;
  }, [areaGroups]);

  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormName(`Nhóm ${areaGroups.length + 1}`);
    setGroupFormCode(`NHOM_${areaGroups.length + 1}`);
    setGroupFormDescription('');
    setGroupFormCommuneIds([]);
    setGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: AreaGroup) => {
    setEditingGroup(group);
    setGroupFormName(group.name);
    setGroupFormCode(group.code);
    setGroupFormDescription(group.description || '');
    setGroupFormCommuneIds(group.communeIds || []);
    setGroupModalOpen(true);
  };

  const handleToggleCommuneInGroup = (communeId: string) => {
    setGroupFormCommuneIds((prev) =>
      prev.includes(communeId) ? prev.filter((id) => id !== communeId) : [...prev, communeId]
    );
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormName.trim() || groupFormName.trim().length < 2) return;
    try {
      if (editingGroup) {
        await updateGroupMutation.mutateAsync({
          id: editingGroup.id,
          payload: {
            name: groupFormName.trim(),
            code: groupFormCode.trim() || undefined,
            description: groupFormDescription.trim() || undefined,
            communeIds: groupFormCommuneIds,
          },
        });
        notifySuccess(`Đã cập nhật "${groupFormName.trim()}" thành công`);
      } else {
        await createGroupMutation.mutateAsync({
          name: groupFormName.trim(),
          code: groupFormCode.trim() || undefined,
          description: groupFormDescription.trim() || undefined,
          communeIds: groupFormCommuneIds,
        });
        notifySuccess(`Đã tạo "${groupFormName.trim()}" thành công`);
      }
      setGroupModalOpen(false);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      await deleteGroupMutation.mutateAsync(deletingGroup.id);
      notifySuccess(`Đã xóa nhóm "${deletingGroup.name}"`);
      setDeletingGroup(null);
    } catch (err) {
      setDeletingGroup(null);
      notifyApiError(err);
    }
  };

  const flatHamlets = useMemo(() => {
    const rows: Array<Hamlet & { communeName: string; provinceName: string }> = [];
    for (const p of tree) {
      for (const c of p.communes) {
        if (selectedCommuneId && c.id !== selectedCommuneId) continue;
        for (const h of c.hamlets) {
          if (
            searchKeyword &&
            !h.name.toLowerCase().includes(searchKeyword.toLowerCase()) &&
            !c.name.toLowerCase().includes(searchKeyword.toLowerCase())
          ) {
            continue;
          }
          rows.push({
            ...h,
            communeName: c.name,
            provinceName: p.name,
          });
        }
      }
    }
    return rows;
  }, [tree, selectedCommuneId, searchKeyword]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHamlet || editName.trim().length < 2) return;
    try {
      const updated = await updateHamletMutation.mutateAsync({
        id: editingHamlet.id,
        payload: { name: editName.trim() },
      });
      notifySuccess(`Đã cập nhật tên ấp thành "${updated.name}"`);
      setEditingHamlet(null);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingHamlet) return;
    try {
      await deleteHamletMutation.mutateAsync(deletingHamlet.id);
      notifySuccess(`Đã xóa "${deletingHamlet.name}" khỏi ${deletingHamlet.communeName}`);
      setDeletingHamlet(null);
    } catch (err) {
      setDeletingHamlet(null);
      notifyApiError(err);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý địa bàn Quỹ tín dụng (Tỉnh → Xã → Ấp)"
        description="Quản lý tập trung danh mục Tỉnh Vĩnh Long và 3 xã thuộc phạm vi hoạt động của Quỹ (Xã Nhị Trường, Xã Tập Sơn, Xã Long Hiệp). Dùng chung độc lập cho cả Địa chỉ người vay và Địa bàn tài sản thế chấp."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setCreateDefaultCommuneId(selectedCommuneId || null);
              setCreateDialogOpen(true);
            }}
          >
            Thêm Ấp mới vào Database
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          {/* Thẻ tổng quan 3 Xã thuộc Tỉnh Vĩnh Long */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {communes.map((commune) => {
              const isSelected = selectedCommuneId === commune.id;
              return (
                <Card
                  key={commune.id}
                  className={
                    isSelected
                      ? 'border-primary-600 ring-2 ring-primary-500/20 transition-all'
                      : 'hover:border-slate-300 transition-all'
                  }
                >
                  <CardHeader>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {province?.name}
                      </div>
                      <CardTitle className="mt-0.5 text-base">{commune.name}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="primary" dot>
                        {commune.hamlets.length} ấp
                      </Badge>
                      {communeGroupMap.get(commune.id)?.map((grpName) => (
                        <Badge key={grpName} tone="neutral" className="text-[11px] font-normal">
                          {grpName}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {commune.hamlets.length === 0 ? (
                        <span className="text-xs italic text-slate-400">
                          Chưa có ấp nào — nhấn &ldquo;+ Thêm Ấp&rdquo; để bổ sung
                        </span>
                      ) : (
                        commune.hamlets.map((h) => (
                          <Badge key={h.id} tone="neutral">
                            {h.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCommuneId(isSelected ? '' : commune.id)
                        }
                        className="text-xs font-medium text-primary-700 hover:underline"
                      >
                        {isSelected ? 'Bỏ lọc xã này' : 'Lọc danh sách ấp của xã'}
                      </button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setCreateDefaultCommuneId(commune.id);
                          setCreateDialogOpen(true);
                        }}
                      >
                        Thêm Ấp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Card Phân nhóm địa bàn cấp Xã */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary-600" />
                  <CardTitle>Phân nhóm địa bàn cấp Xã ({areaGroups.length} nhóm)</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Phân chia các xã thành các nhóm độc lập để phục vụ kiểm tra điều kiện sinh mẫu hợp đồng và văn bản Word.
                  Từ khóa điều kiện tự động:{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-primary-700">CO_TRONG_NHOM_1</code>,{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-primary-700">CO_TRONG_NHOM_2</code>,...
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreateGroup}
              >
                Thêm nhóm Xã
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingGroups ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : areaGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    Chưa có nhóm địa bàn nào. Hãy tạo nhóm cấp Xã để sử dụng điều kiện kiểm tra nhóm trong mẫu Word.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreateGroup}
                  >
                    Tạo nhóm đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {areaGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{group.name}</span>
                          <Badge tone="info" className="font-mono text-xs">
                            {group.code}
                          </Badge>
                        </div>
                        {group.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        <div className="pt-1">
                          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Xã thuộc nhóm:
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(group.communes || []).length === 0 ? (
                              <span className="text-xs italic text-slate-400">
                                Chưa gán xã nào
                              </span>
                            ) : (
                              (group.communes || []).map((c) => (
                                <Badge key={c.id} tone="primary">
                                  {c.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="pt-1">
                          <span className="text-[11px] text-slate-500">
                            Từ khóa Word: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-primary-700">{`CO_TRONG_${group.code}`}</code>
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => handleOpenEditGroup(group)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-600"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => setDeletingGroup(group)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bảng danh sách Ấp chi tiết */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Danh sách Ấp trong Database ({flatHamlets.length})</CardTitle>
                <CardDescription>
                  Các Ấp được khai báo tại đây sẽ xuất hiện trong bộ chọn Tỉnh → Xã → Ấp của Hồ sơ thành viên và Tài sản thế chấp.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-52">
                  <SelectInput
                    aria-label="Lọc theo xã"
                    value={selectedCommuneId}
                    onChange={(e) => setSelectedCommuneId(e.target.value)}
                    placeholder="Tất cả 3 xã quản lý"
                    options={communes.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </div>
                <div className="w-60">
                  <TextInput
                    aria-label="Tìm kiếm tên ấp"
                    placeholder="Tìm tên ấp..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    leftAddon={<Search className="h-4 w-4 text-slate-400" />}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {flatHamlets.length === 0 ? (
                <EmptyState
                  title="Chưa có Ấp nào khớp bộ lọc"
                  description="Bạn có thể nhấn nút 'Thêm Ấp mới vào Database' để bổ sung Ấp cho Xã Nhị Trường, Xã Tập Sơn hoặc Xã Long Hiệp."
                  icon={<MapPin className="h-6 w-6" />}
                  action={
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setCreateDefaultCommuneId(selectedCommuneId || null);
                        setCreateDialogOpen(true);
                      }}
                    >
                      Thêm Ấp mới
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Mã định danh</th>
                        <th className="px-4 py-3">Tên Ấp</th>
                        <th className="px-4 py-3">Thuộc Xã</th>
                        <th className="px-4 py-3">Tỉnh / Thành phố</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {flatHamlets.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {item.code}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="info">{item.communeName}</Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.provinceName}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setEditingHamlet(item);
                                  setEditName(item.name);
                                }}
                              >
                                Đổi tên
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger-600"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => setDeletingHamlet(item)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog thêm Ấp mới */}
      <QuickCreateHamletDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultProvinceId={province?.id}
        defaultCommuneId={createDefaultCommuneId}
      />

      {/* Dialog đổi tên Ấp */}
      <Dialog open={Boolean(editingHamlet)} onOpenChange={(o) => !o && setEditingHamlet(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{`Đổi tên ${editingHamlet?.name ?? ''}`}</DialogTitle>
            <DialogDescription>{`Thuộc ${editingHamlet?.communeName ?? ''}, ${editingHamlet?.provinceName ?? ''}`}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit}>
            <DialogBody>
              <TextInput
                label="Tên Ấp"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingHamlet(null)}>
                Hủy
              </Button>
              <Button type="submit" isLoading={updateHamletMutation.isPending}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa Ấp */}
      <ConfirmDialog
        open={Boolean(deletingHamlet)}
        onOpenChange={(o) => !o && setDeletingHamlet(null)}
        title={`Xóa "${deletingHamlet?.name ?? ''}" khỏi ${deletingHamlet?.communeName ?? ''}?`}
        description="Lưu ý: Hệ thống chỉ cho phép xóa Ấp chưa được gắn với bất kỳ hồ sơ thành viên hoặc tài sản thế chấp nào."
        confirmText="Xóa Ấp"
        tone="danger"
        isLoading={deleteHamletMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog tạo/sửa Nhóm địa bàn */}
      <Dialog open={groupModalOpen} onOpenChange={(o) => !o && setGroupModalOpen(false)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? `Chỉnh sửa ${editingGroup.name}` : 'Tạo nhóm địa bàn cấp Xã mới'}
            </DialogTitle>
            <DialogDescription>
              Nhóm các Xã quản lý để kiểm tra điều kiện sinh văn bản theo địa bàn (ví dụ: CO_TRONG_NHOM_1).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGroup}>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextInput
                  label="Tên nhóm"
                  required
                  placeholder="Ví dụ: Nhóm 1, Địa bàn mở rộng"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                />
                <TextInput
                  label="Mã nhóm (Từ khóa)"
                  placeholder="Ví dụ: NHOM_1, NHOM_2"
                  value={groupFormCode}
                  onChange={(e) => setGroupFormCode(e.target.value)}
                  hint="Sẽ tạo từ khóa điều kiện Word: CO_TRONG_<MÃ>"
                />
              </div>

              <TextareaInput
                label="Mô tả / Ghi chú"
                rows={2}
                placeholder="Mô tả mục đích nhóm..."
                value={groupFormDescription}
                onChange={(e) => setGroupFormDescription(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Chọn các Xã thuộc nhóm (chỉ áp dụng cấp Xã)
                </label>
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                  {communes.map((c) => {
                    const isChecked = groupFormCommuneIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          isChecked
                            ? 'border-primary-500 bg-primary-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          checked={isChecked}
                          onChange={() => handleToggleCommuneInGroup(c.id)}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-500">
                            {c.hamlets.length} ấp trực thuộc
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupModalOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                isLoading={createGroupMutation.isPending || updateGroupMutation.isPending}
              >
                {editingGroup ? 'Lưu thay đổi' : 'Tạo nhóm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa Nhóm */}
      <ConfirmDialog
        open={Boolean(deletingGroup)}
        onOpenChange={(o) => !o && setDeletingGroup(null)}
        title={`Xóa "${deletingGroup?.name ?? ''}"?`}
        description="Bạn có chắc chắn muốn xóa nhóm địa bàn này? Các xã thuộc nhóm sẽ không bị xóa mà chỉ được gỡ khỏi nhóm."
        confirmText="Xóa nhóm"
        tone="danger"
        isLoading={deleteGroupMutation.isPending}
        onConfirm={handleConfirmDeleteGroup}
      />
    </div>
  );
}
