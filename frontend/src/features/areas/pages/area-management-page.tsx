import { useMemo, useState } from 'react';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { SelectInput, TextInput } from '@/components/form';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  notifyApiError,
  notifySuccess,
  Skeleton,
} from '@/components/feedback';
import { useAreaTree, useDeleteHamlet, useUpdateHamlet } from '../hooks/use-areas';
import { QuickCreateHamletDialog } from '../components/quick-create-hamlet-dialog';
import type { Hamlet } from '../types/area.types';

export function AreaManagementPage() {
  const { data: tree = [], isLoading, isError, error, refetch } = useAreaTree();
  const updateHamletMutation = useUpdateHamlet();
  const deleteHamletMutation = useDeleteHamlet();

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

  const province = tree[0];
  const communes = useMemo(() => province?.communes ?? [], [province]);

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
                    <Badge tone="primary" dot>
                      {commune.hamlets.length} ấp
                    </Badge>
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
    </div>
  );
}
