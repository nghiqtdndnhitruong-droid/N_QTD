import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  FileCode,
  FileText,
  Layers,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
} from '@/components/ui';
import { PageHeader } from '@/components/layout';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import {
  useWordTemplates,
  useDeleteWordTemplate,
  useUpdateWordTemplate,
  useReorderWordTemplates,
  useDownloadOriginalTemplate,
} from '../hooks/use-word-templates';
import { TemplateUploadModal } from '../components/template-upload-modal';
import { TemplatePreviewModal } from '../components/template-preview-modal';
import type { LoanTypeScope, WordTemplate } from '../types/word-template.types';

export function TemplateListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadScope, setUploadScope] = useState<LoanTypeScope>('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<WordTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WordTemplate | null>(null);

  const { data: templates = [], isLoading } = useWordTemplates({
    search: search || undefined,
    category: selectedCategory || undefined,
  });

  const deleteMutation = useDeleteWordTemplate();
  const updateMutation = useUpdateWordTemplate();
  const downloadMutation = useDownloadOriginalTemplate();
  const reorderMutation = useReorderWordTemplates();

  // Chia tách 3 nhóm biểu mẫu: Thế chấp, Tín chấp, Chung
  const theChapTemplates = useMemo(
    () => templates.filter((t) => t.loanTypeScope === 'THE_CHAP'),
    [templates],
  );
  const tinChapTemplates = useMemo(
    () => templates.filter((t) => t.loanTypeScope === 'TIN_CHAP'),
    [templates],
  );
  const commonTemplates = useMemo(
    () => templates.filter((t) => t.loanTypeScope === 'ALL'),
    [templates],
  );

  const openUploadModal = (scope: LoanTypeScope = 'ALL') => {
    setUploadScope(scope);
    setUploadModalOpen(true);
  };

  const handleMoveInColumn = async (
    columnScope: LoanTypeScope,
    indexInCol: number,
    direction: 'UP' | 'DOWN',
  ) => {
    const targetCol =
      columnScope === 'THE_CHAP'
        ? [...theChapTemplates]
        : columnScope === 'TIN_CHAP'
          ? [...tinChapTemplates]
          : [...commonTemplates];

    const targetIndex = direction === 'UP' ? indexInCol - 1 : indexInCol + 1;
    if (targetIndex < 0 || targetIndex >= targetCol.length) return;

    const currentItem = targetCol[indexInCol];
    const targetItem = targetCol[targetIndex];
    if (!currentItem || !targetItem) return;

    targetCol[indexInCol] = targetItem;
    targetCol[targetIndex] = currentItem;

    const newTheChap = columnScope === 'THE_CHAP' ? targetCol : theChapTemplates;
    const newTinChap = columnScope === 'TIN_CHAP' ? targetCol : tinChapTemplates;
    const newCommon = columnScope === 'ALL' ? targetCol : commonTemplates;

    const combined = [...newTheChap, ...newTinChap, ...newCommon];
    const reorderedItems = combined.map((t, idx) => ({
      id: t.id,
      sortOrder: idx,
    }));

    try {
      await reorderMutation.mutateAsync(reorderedItems);
      notifySuccess(
        `Đã di chuyển biểu mẫu "${currentItem.title}" ${direction === 'UP' ? 'lên trên' : 'xuống dưới'}`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleChangeScope = async (template: WordTemplate, newScope: LoanTypeScope) => {
    if (template.loanTypeScope === newScope) return;
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { loanTypeScope: newScope },
      });
      const scopeLabel =
        newScope === 'THE_CHAP' ? 'Thế chấp' : newScope === 'TIN_CHAP' ? 'Tín chấp' : 'Dùng chung';
      notifySuccess(`Đã chuyển biểu mẫu "${template.title}" sang cột ${scopeLabel}`);
    } catch (err) {
      notifyApiError(err);
    }
  };

  // Danh sách các nhóm biểu mẫu duy nhất để lọc
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteMutation.mutateAsync(deletingTemplate.id);
      notifySuccess(`Đã xóa biểu mẫu "${deletingTemplate.title}"`);
      setDeletingTemplate(null);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleToggleActive = async (template: WordTemplate) => {
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { isActive: !template.isActive },
      });
      notifySuccess(
        `Đã ${!template.isActive ? 'kích hoạt' : 'ngừng sử dụng'} biểu mẫu "${template.title}"`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleDownloadOriginal = (template: WordTemplate) => {
    downloadMutation.mutate({
      id: template.id,
      fileName: template.originalFileName || `${template.code}.docx`,
    });
  };

  const columnsConfig: Array<{
    scope: LoanTypeScope;
    title: string;
    subtitle: string;
    icon: typeof Shield;
    iconColor: string;
    iconBg: string;
    badgeTone: 'warning' | 'success' | 'info';
    items: WordTemplate[];
  }> = [
    {
      scope: 'THE_CHAP',
      title: 'Biểu mẫu Thế chấp',
      subtitle: 'Áp dụng cho các hồ sơ vay có tài sản bảo đảm',
      icon: Shield,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border border-amber-200',
      badgeTone: 'warning',
      items: theChapTemplates,
    },
    {
      scope: 'TIN_CHAP',
      title: 'Biểu mẫu Tín chấp',
      subtitle: 'Áp dụng cho các hồ sơ vay tín chấp, bảo lãnh cá nhân',
      icon: UserCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border border-emerald-200',
      badgeTone: 'success',
      items: tinChapTemplates,
    },
    {
      scope: 'ALL',
      title: 'Biểu mẫu Chung',
      subtitle: 'Sử dụng chung cho tất cả hình thức vay',
      icon: Layers,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border border-indigo-200',
      badgeTone: 'info',
      items: commonTemplates,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý biểu mẫu Word"
        description="Quản lý các file mẫu Word (.docx) chia theo 3 cột: Thế chấp, Tín chấp và Chung. Cấu hình ánh xạ từ khóa tự động trích xuất cho hồ sơ vay."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/templates/catalog">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<BookOpen className="h-4 w-4 text-slate-600" />}
              >
                Thư viện từ khóa & Cú pháp
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => openUploadModal('ALL')}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-sm"
            >
              Thêm mẫu Word mới
            </Button>
          </div>
        }
      />

      {/* Thẻ thống kê 4 ô */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Tổng số mẫu</div>
              <div className="mt-0.5 text-xl font-bold text-slate-800">{templates.length}</div>
            </div>
            <FileText className="h-7 w-7 text-slate-400 opacity-80" />
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-amber-700">Mẫu Thế chấp</div>
              <div className="mt-0.5 text-xl font-bold text-amber-900">{theChapTemplates.length}</div>
            </div>
            <Shield className="h-7 w-7 text-amber-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-emerald-700">Mẫu Tín chấp</div>
              <div className="mt-0.5 text-xl font-bold text-emerald-900">{tinChapTemplates.length}</div>
            </div>
            <UserCheck className="h-7 w-7 text-emerald-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-indigo-700">Mẫu Dùng chung</div>
              <div className="mt-0.5 text-xl font-bold text-indigo-900">{commonTemplates.length}</div>
            </div>
            <Layers className="h-7 w-7 text-indigo-500 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên biểu mẫu, mã hoặc nhóm..."
            className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-xs focus:border-primary-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-primary-600 focus:outline-none"
          >
            <option value="">Tất cả nhóm biểu mẫu</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Giao diện 3 Cột Biểu Mẫu */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Đang tải danh sách biểu mẫu Word...
        </div>
      ) : templates.length === 0 && !search && !selectedCategory ? (
        <Card className="p-12 text-center">
          <FileCode className="mx-auto h-12 w-12 text-slate-300" />
          <div className="mt-3 text-sm font-semibold text-slate-800">
            Chưa có biểu mẫu Word nào
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Tải lên file Word mẫu đầu tiên để cấu hình ánh xạ dữ liệu tự động.
          </div>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => openUploadModal('ALL')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Tải lên mẫu Word ngay
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          {columnsConfig.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.scope}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm min-h-[450px]"
              >
                {/* Header của từng cột */}
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${col.iconBg}`}>
                      <Icon className={`h-5 w-5 ${col.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-800">{col.title}</h2>
                        <Badge tone={col.badgeTone} className="text-[11px] px-1.5 py-0 font-bold">
                          {col.items.length}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{col.subtitle}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openUploadModal(col.scope)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="h-7 text-xs px-2 shadow-xs bg-white hover:bg-slate-50"
                    title={`Thêm mẫu mới vào ${col.title}`}
                  >
                    Thêm
                  </Button>
                </div>

                {/* Danh sách thẻ biểu mẫu trong cột */}
                <div className="space-y-3 flex-1">
                  {col.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-center">
                      <Icon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <div className="text-xs font-semibold text-slate-600">
                        Chưa có mẫu {col.title.toLowerCase()}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {search || selectedCategory
                          ? 'Không tìm thấy mẫu phù hợp bộ lọc.'
                          : 'Tải file Word lên cột này để cấu hình.'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-3 text-xs text-primary-600 hover:text-primary-700"
                        onClick={() => openUploadModal(col.scope)}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Tải lên vào cột này
                      </Button>
                    </div>
                  ) : (
                    col.items.map((template, index) => (
                      <Card
                        key={template.id}
                        className={`flex flex-col justify-between transition-all hover:shadow-md ${
                          !template.isActive ? 'opacity-70 bg-slate-100/90' : 'bg-white'
                        }`}
                      >
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(template)}
                              className="cursor-pointer text-left"
                              title={
                                template.isActive
                                  ? 'Nhấp để tạm dừng mẫu'
                                  : 'Nhấp để kích hoạt mẫu'
                              }
                            >
                              <Badge tone={template.isActive ? 'success' : 'neutral'}>
                                {template.isActive ? 'Đang dùng' : 'Tạm dừng'}
                              </Badge>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {/* Nút di chuyển lên / xuống trong cùng cột */}
                              <div className="flex items-center rounded border border-slate-200 bg-white shadow-2xs">
                                <button
                                  type="button"
                                  disabled={index === 0 || reorderMutation.isPending}
                                  onClick={() => handleMoveInColumn(col.scope, index, 'UP')}
                                  className="p-1 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                                  title="Di chuyển lên trên trong cột này"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <div className="h-3 w-[1px] bg-slate-200" />
                                <button
                                  type="button"
                                  disabled={
                                    index === col.items.length - 1 || reorderMutation.isPending
                                  }
                                  onClick={() => handleMoveInColumn(col.scope, index, 'DOWN')}
                                  className="p-1 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                                  title="Di chuyển xuống dưới trong cột này"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="font-mono text-[10px] font-semibold text-slate-400">
                                v{template.currentVersion}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5">
                            <h3
                              onClick={() => navigate(`/templates/${template.id}`)}
                              className="cursor-pointer font-bold text-slate-900 hover:text-primary-700 text-xs sm:text-sm line-clamp-2"
                              title={template.title}
                            >
                              {template.title}
                            </h3>
                            <div className="mt-1 font-mono text-[11px] text-slate-500">
                              {template.code}
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <Badge tone="info" className="text-[10px]">
                              {template.category}
                            </Badge>
                            <Badge tone="primary" className="text-[10px]">
                              {template._count?.mappings ?? 0} từ khóa
                            </Badge>

                            {/* Dropdown chuyển cột nhanh */}
                            <div className="ml-auto flex items-center gap-1">
                              <select
                                value={template.loanTypeScope}
                                onChange={(e) =>
                                  handleChangeScope(template, e.target.value as LoanTypeScope)
                                }
                                className="h-5 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium text-slate-600 hover:bg-white hover:border-slate-300 focus:border-primary-500 focus:outline-none cursor-pointer"
                                title="Chuyển sang cột khác"
                              >
                                <option value="THE_CHAP">Cột Thế chấp</option>
                                <option value="TIN_CHAP">Cột Tín chấp</option>
                                <option value="ALL">Cột Chung</option>
                              </select>
                            </div>
                          </div>

                          {template.description && (
                            <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">
                              {template.description}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/70 p-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Tải file mẫu gốc"
                                onClick={() => handleDownloadOriginal(template)}
                                className="h-7 w-7 p-0"
                              >
                                <Download className="h-3.5 w-3.5 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Kiểm tra & chạy thử"
                                onClick={() => setPreviewTemplate(template)}
                                className="h-7 w-7 p-0 text-primary-600"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Xóa mẫu"
                                onClick={() => setDeletingTemplate(template)}
                                className="h-7 w-7 p-0 text-danger-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => navigate(`/templates/${template.id}`)}
                              leftIcon={<Settings className="h-3 w-3" />}
                              className="h-7 text-xs px-2.5"
                            >
                              Cấu hình
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Upload */}
      <TemplateUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        defaultScope={uploadScope}
        onSuccess={(createdId) => navigate(`/templates/${createdId}`)}
      />

      {/* Modal Preview */}
      {previewTemplate && (
        <TemplatePreviewModal
          open={Boolean(previewTemplate)}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          template={previewTemplate}
        />
      )}

      {/* Modal Xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        title={`Xác nhận xóa biểu mẫu "${deletingTemplate?.title}"?`}
        description="Thao tác này sẽ xóa biểu mẫu và toàn bộ cấu hình từ khóa đã thiết lập. Biểu mẫu đã xóa không thể khôi phục."
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
