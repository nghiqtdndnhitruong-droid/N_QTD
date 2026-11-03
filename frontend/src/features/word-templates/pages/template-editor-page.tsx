import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileText,
  Play,
  Plus,
  Save,
  Search,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
} from '@/components/ui';
import { PageHeader } from '@/components/layout';
import { DetailPageSkeleton, notifyApiError, notifySuccess } from '@/components/feedback';
import {
  useWordTemplateDetail,
  useDataSources,
  useSaveMappings,
  useUploadVersion,
  useDownloadOriginalTemplate,
  useValidateTemplateSyntax,
} from '../hooks/use-word-templates';
import { DataSourceTreeSelect } from '../components/data-source-tree-select';
import { TemplatePreviewModal } from '../components/template-preview-modal';
import type {
  WordTemplateMapping,
  MappingDataType,
  TemplateValidationResult,
} from '../types/word-template.types';

const DATA_TYPES: { value: MappingDataType; label: string }[] = [
  { value: 'TEXT', label: 'Văn bản thường' },
  { value: 'DATE', label: 'Ngày tháng (DD/MM/YYYY)' },
  { value: 'CURRENCY', label: 'Số tiền bằng số (VND)' },
  { value: 'CURRENCY_WORDS', label: 'Số tiền bằng chữ tiếng Việt' },
  { value: 'GENDER_TITLE', label: 'Danh xưng (Ông/Bà)' },
  { value: 'NUMBER', label: 'Số lượng / Phần trăm' },
  { value: 'LIST', label: 'Danh sách lặp bảng' },
];

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();

  const { data: template, isLoading, refetch } = useWordTemplateDetail(id);
  const { data: dataSources = [] } = useDataSources();

  const saveMappingsMutation = useSaveMappings();
  const uploadVersionMutation = useUploadVersion();
  const downloadMutation = useDownloadOriginalTemplate();
  const validateSyntaxMutation = useValidateTemplateSyntax();

  const [mappings, setMappings] = useState<WordTemplateMapping[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNMAPPED' | 'MAPPED' | 'LOOP'>('ALL');
  const [search, setSearch] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [syntaxModalOpen, setSyntaxModalOpen] = useState(false);
  const [syntaxResult, setSyntaxResult] = useState<TemplateValidationResult | null>(null);

  const newVersionInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo state mappings từ template detail
  useEffect(() => {
    if (template?.mappings) {
      setMappings(template.mappings);
      if (template.mappings.length > 0 && !selectedKeyword && template.mappings[0]) {
        setSelectedKeyword(template.mappings[0].keyword);
      }
    }
  }, [template]);

  const activeMapping = useMemo(() => {
    return mappings.find((m) => m.keyword === selectedKeyword) || null;
  }, [mappings, selectedKeyword]);

  // Lọc danh sách từ khóa bên cột trái
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const matchSearch =
        m.keyword.toLowerCase().includes(search.toLowerCase()) ||
        m.displayName.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (filterMode === 'UNMAPPED') return !m.dataPath && !m.isLoop;
      if (filterMode === 'MAPPED') return Boolean(m.dataPath);
      if (filterMode === 'LOOP') return m.isLoop;
      return true;
    });
  }, [mappings, search, filterMode]);

  // Cập nhật thông tin của từ khóa đang chọn
  const updateActiveMapping = (updates: Partial<WordTemplateMapping>) => {
    if (!selectedKeyword) return;
    setMappings((prev) =>
      prev.map((m) => (m.keyword === selectedKeyword ? { ...m, ...updates } : m)),
    );
    setIsDirty(true);
  };

  // Thêm từ khóa thủ công
  const handleAddManualKeyword = () => {
    const rawName = prompt('Nhập tên từ khóa (viết hoa, không dấu, ví dụ: MA_SO_TAI_SAN):');
    if (!rawName) return;
    const cleanKey = rawName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
    if (mappings.some((m) => m.keyword === cleanKey)) {
      alert(`Từ khóa "${cleanKey}" đã tồn tại`);
      return;
    }

    const newM: WordTemplateMapping = {
      keyword: cleanKey,
      displayName: cleanKey.replace(/_/g, ' '),
      isLoop: false,
      dataType: 'TEXT',
      isRequired: false,
      defaultValue: '...................',
    };

    setMappings((prev) => [newM, ...prev]);
    setSelectedKeyword(cleanKey);
    setIsDirty(true);
  };

  // Lưu toàn bộ cấu hình
  const handleSaveAll = async () => {
    if (!template) return;
    try {
      await saveMappingsMutation.mutateAsync({
        id: template.id,
        mappings,
      });
      setIsDirty(false);
      notifySuccess('Đã lưu cấu hình ánh xạ từ khóa thành công');
      refetch();
    } catch (err) {
      notifyApiError(err);
    }
  };

  // Upload phiên bản mới
  const handleUploadNewVersion = async (file: File) => {
    if (!template) return;
    const note = prompt('Ghi chú lý do cập nhật phiên bản mới:') || undefined;
    try {
      await uploadVersionMutation.mutateAsync({
        id: template.id,
        file,
        changeNote: note,
      });
      notifySuccess(`Đã cập nhật phiên bản biểu mẫu mới`);
      refetch();
    } catch (err) {
      notifyApiError(err);
    }
  };

  // Kiểm tra cú pháp AST
  const handleValidateSyntax = async () => {
    if (!template) return;
    try {
      const res = await validateSyntaxMutation.mutateAsync(template.id);
      setSyntaxResult(res.validation);
      setSyntaxModalOpen(true);
    } catch (err) {
      notifyApiError(err);
    }
  };

  if (isLoading || !template) {
    return <DetailPageSkeleton />;
  }

  const mappedCount = mappings.filter((m) => Boolean(m.dataPath) || m.isLoop).length;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        backLink={
          <Link
            to="/templates"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Danh sách biểu mẫu</span>
          </Link>
        }
        title={template.title}
        badge={
          <Badge tone={template.isActive ? 'success' : 'neutral'} className="font-mono">
            {template.code} · v{template.currentVersion}
          </Badge>
        }
        description={`Cấu hình từ khóa và nguồn dữ liệu điền tự động · Đã cấu hình: ${mappedCount}/${mappings.length} từ khóa`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/templates/catalog">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<BookOpen className="h-3.5 w-3.5 text-slate-600" />}
              >
                Thư viện từ khóa
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateSyntax}
              isLoading={validateSyntaxMutation.isPending}
              leftIcon={<Code2 className="h-3.5 w-3.5 text-indigo-600" />}
            >
              Kiểm tra cú pháp (AST)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewModalOpen(true)}
              leftIcon={<Play className="h-3.5 w-3.5 text-primary-600" />}
            >
              Kiểm tra & Chạy thử
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={!isDirty}
              isLoading={saveMappingsMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isDirty ? 'Lưu cấu hình (*)' : 'Đã lưu cấu hình'}
            </Button>
          </div>
        }
      />

      {/* STUDIO 3 CỘT */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-h-[600px]">
        {/* CỘT 1: DANH SÁCH TỪ KHÓA (4 CỘT) */}
        <Card className="lg:col-span-4 flex flex-col h-[700px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Từ khóa trong file Word ({mappings.length})
              </span>
              <button
                type="button"
                onClick={handleAddManualKeyword}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-800"
              >
                <Plus className="h-3 w-3" />
                <span>+ Thêm biến</span>
              </button>
            </div>

            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm từ khóa..."
                className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-2 text-xs focus:border-primary-600 focus:outline-none"
              />
            </div>

            {/* Filter tags */}
            <div className="flex gap-1 text-[10px]">
              {(['ALL', 'UNMAPPED', 'MAPPED', 'LOOP'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    filterMode === mode
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {mode === 'ALL'
                    ? 'Tất cả'
                    : mode === 'UNMAPPED'
                      ? 'Chưa gán'
                      : mode === 'MAPPED'
                        ? 'Đã gán'
                        : 'Lặp bảng'}
                </button>
              ))}
            </div>
          </div>

          {/* List từ khóa */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredMappings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy từ khóa phù hợp
              </div>
            ) : (
              filteredMappings.map((m) => {
                const isSelected = m.keyword === selectedKeyword;
                const isMapped = Boolean(m.dataPath) || m.isLoop;

                return (
                  <button
                    key={m.keyword}
                    type="button"
                    onClick={() => setSelectedKeyword(m.keyword)}
                    className={`flex w-full items-start justify-between gap-2 rounded-md p-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-50/90 ring-1 ring-primary-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-primary-800 truncate">
                          {`{{${m.keyword}}}`}
                        </span>
                        {m.isLoop && (
                          <Badge tone="info" className="text-[9px] px-1 py-0">
                            Bảng lặp
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-600">
                        {m.displayName}
                      </div>
                      {m.dataPath && (
                        <div className="font-mono text-[10px] text-slate-400 truncate">
                          → {m.dataPath}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isMapped ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-success-500" title="Đã ánh xạ" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-warning-400" title="Chưa ánh xạ" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* CỘT 2: FORM CẤU HÌNH CHI TIẾT TỪ KHÓA (5 CỘT) */}
        <Card className="lg:col-span-5 flex flex-col h-[700px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Cấu hình ánh xạ từ khóa đang chọn
            </span>
            {activeMapping && (
              <span className="font-mono text-xs font-bold text-primary-700">
                {`{{${activeMapping.keyword}}}`}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeMapping ? (
              <>
                {/* Tên từ khóa & Tên hiển thị */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Tên từ khóa trong file Word
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={activeMapping.keyword}
                        disabled
                        className="h-9 w-full rounded border border-slate-200 bg-slate-100 px-3 font-mono text-xs text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${activeMapping.keyword}}}`);
                          notifySuccess(`Đã sao chép {{${activeMapping.keyword}}}`);
                        }}
                        title="Sao chép từ khóa để dán vào Word"
                        className="rounded border border-slate-300 p-2 text-slate-500 hover:bg-slate-100"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Tên mô tả hiển thị <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeMapping.displayName}
                      onChange={(e) => updateActiveMapping({ displayName: e.target.value })}
                      className="h-9 w-full rounded border border-slate-300 px-3 text-xs focus:border-primary-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Khối lặp bảng hay không */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="flex items-center gap-2 font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={activeMapping.isLoop}
                      onChange={(e) =>
                        updateActiveMapping({
                          isLoop: e.target.checked,
                          dataType: e.target.checked ? 'LIST' : 'TEXT',
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-primary-600"
                    />
                    <span>Đây là khối lặp danh sách (Bảng Word)</span>
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500 pl-6">
                    Tích chọn khi từ khóa này là thẻ mở đầu của bảng lặp dữ liệu (ví dụ `&#123;&#123;#collaterals&#125;&#125;` hoặc `&#123;&#123;#relatedPersons&#125;&#125;`).
                  </p>
                </div>

                {/* Chọn Nguồn dữ liệu từ Tree Select */}
                {!activeMapping.isLoop ? (
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Nguồn dữ liệu hệ thống (Data Source Path)
                    </label>
                    <DataSourceTreeSelect
                      groups={dataSources}
                      value={activeMapping.dataPath}
                      onChange={(path, field) => {
                        updateActiveMapping({
                          dataPath: path,
                          dataType: field?.dataType || activeMapping.dataType,
                        });
                      }}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Chọn trường dữ liệu từ hệ thống để tự động điền vào từ khóa này khi xuất hồ sơ.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Nhóm danh sách lặp
                    </label>
                    <select
                      value={activeMapping.loopContext || 'collaterals'}
                      onChange={(e) => updateActiveMapping({ loopContext: e.target.value })}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    >
                      <option value="collaterals">collaterals (Danh sách tài sản thế chấp)</option>
                      <option value="relatedPersons">relatedPersons (Danh sách người liên quan)</option>
                    </select>
                  </div>
                )}

                {/* Kiểu dữ liệu & Định dạng */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">Kiểu hiển thị</label>
                    <select
                      value={activeMapping.dataType}
                      onChange={(e) =>
                        updateActiveMapping({ dataType: e.target.value as MappingDataType })
                      }
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    >
                      {DATA_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Giá trị mặc định khi trống
                    </label>
                    <input
                      type="text"
                      value={activeMapping.defaultValue || ''}
                      onChange={(e) => updateActiveMapping({ defaultValue: e.target.value })}
                      placeholder="VD: ..................."
                      className="h-9 w-full rounded border border-slate-300 px-3 text-xs focus:border-primary-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bắt buộc nhập */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isRequiredCheck"
                    checked={activeMapping.isRequired}
                    onChange={(e) => updateActiveMapping({ isRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  <label htmlFor="isRequiredCheck" className="font-medium text-slate-700">
                    Bắt buộc có dữ liệu (Cảnh báo trước khi xuất file nếu thiếu)
                  </label>
                </div>

                {/* Ghi chú mô tả */}
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Mô tả hướng dẫn</label>
                  <textarea
                    rows={2}
                    value={activeMapping.description || ''}
                    onChange={(e) => updateActiveMapping({ description: e.target.value })}
                    placeholder="Giải thích vị trí xuất hiện hoặc lưu ý khi điền..."
                    className="w-full rounded border border-slate-300 p-2 text-xs focus:border-primary-600 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 italic">
                Chọn một từ khóa ở danh sách bên trái để bắt đầu cấu hình
              </div>
            )}
          </div>
        </Card>

        {/* CỘT 3: THÔNG TIN FILE MẪU & XEM TRƯỚC (3 CỘT) */}
        <Card className="lg:col-span-3 flex flex-col h-[700px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <span className="text-xs font-semibold text-slate-800">
              Thông tin mẫu & Thao tác
            </span>
          </div>

          <div className="p-4 flex-1 space-y-4 text-xs overflow-y-auto">
            {/* Thông tin file hiện tại */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate" title={template.originalFileName}>
                    {template.originalFileName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(template.fileSize / 1024).toFixed(1)} KB · v{template.currentVersion}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadMutation.mutate({
                      id: template.id,
                      fileName: template.originalFileName,
                    })
                  }
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                  className="w-full justify-center text-xs"
                >
                  Tải file mẫu gốc
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => newVersionInputRef.current?.click()}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  className="w-full justify-center text-xs"
                >
                  Tải phiên bản Word mới
                </Button>
                <input
                  ref={newVersionInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadNewVersion(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Xem trước mẫu của từ khóa đang chọn */}
            {activeMapping && (
              <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-3 space-y-1.5">
                <span className="font-semibold text-primary-900 block">Mô phỏng giá trị mẫu:</span>
                <div className="rounded bg-white p-2.5 font-mono text-[11px] text-slate-800 border border-primary-200">
                  {activeMapping.isLoop ? (
                    <span className="text-info-600">
                      [Bảng tự động nhân bản theo số bản ghi thực tế]
                    </span>
                  ) : activeMapping.dataPath ? (
                    <span className="text-success-700 font-semibold">
                      (Dữ liệu thực tế từ: {activeMapping.dataPath})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      {activeMapping.defaultValue || '...................'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Nút Test với hồ sơ thật */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPreviewModalOpen(true)}
                leftIcon={<Play className="h-4 w-4" />}
                className="w-full justify-center"
              >
                Chạy thử với hồ sơ vay thật
              </Button>
              <p className="mt-1.5 text-[11px] text-slate-500 text-center">
                Chọn 1 khoản vay có thật trong DB để kiểm tra trực quan các từ khóa đã điền.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal Preview */}
      {previewModalOpen && (
        <TemplatePreviewModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          template={template}
        />
      )}

      {/* Modal Kiểm tra cú pháp AST */}
      {syntaxModalOpen && syntaxResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Kết quả kiểm tra cú pháp Template (AST Validator)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSyntaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {syntaxResult.isValid ? (
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Cú pháp hoàn toàn hợp lệ!</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Tất cả các thẻ IF, ELSE, FOR và các từ khóa đều có cấu trúc đóng mở chuẩn, sẵn sàng để xuất văn bản Word.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg bg-danger-50 p-4 text-danger-900 border border-danger-200">
                  <AlertTriangle className="h-6 w-6 text-danger-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Phát hiện lỗi cú pháp trong file Word!</h4>
                    <p className="text-xs text-danger-700 mt-0.5">
                      Vui lòng chỉnh sửa các lỗi dưới đây trong file Word gốc trước khi xuất để tránh làm sai lệch định dạng.
                    </p>
                  </div>
                </div>
              )}

              {/* Danh sách cảnh báo / lỗi */}
              {syntaxResult.diagnostics.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Chi tiết lỗi và cảnh báo ({syntaxResult.diagnostics.length})
                  </span>
                  <div className="space-y-2">
                    {syntaxResult.diagnostics.map((d, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 text-xs border ${
                          d.severity === 'ERROR'
                            ? 'bg-danger-50/60 border-danger-200 text-danger-900'
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono">{d.code}</span>
                          <Badge tone={d.severity === 'ERROR' ? 'danger' : 'neutral'}>
                            {d.severity}
                          </Badge>
                        </div>
                        <p className="mt-1 font-medium">{d.message}</p>
                        {d.rawSnippet && (
                          <div className="mt-1.5 rounded bg-black/10 px-2 py-1 font-mono text-[11px]">
                            Đoạn mã: <code>{d.rawSnippet}</code>
                          </div>
                        )}
                        {d.suggestion && (
                          <p className="mt-1 text-[11px] text-slate-600 italic">
                            Gợi ý: {d.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thống kê cấu trúc đã nhận diện */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="font-semibold text-slate-700">Vòng lặp đã nhận diện:</span>
                  <div className="mt-1 space-y-1">
                    {syntaxResult.detectedLoops.length === 0 ? (
                      <span className="text-slate-400">Không có vòng lặp</span>
                    ) : (
                      syntaxResult.detectedLoops.map((l, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-primary-700">
                          {`#FOR ${l.iterator} IN ${l.collection}`}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="font-semibold text-slate-700">Điều kiện rẽ nhánh (IF):</span>
                  <div className="mt-1 space-y-1">
                    {syntaxResult.detectedConditions.length === 0 ? (
                      <span className="text-slate-400">Không có điều kiện</span>
                    ) : (
                      syntaxResult.detectedConditions.map((c, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-indigo-700 truncate">
                          {c}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" onClick={() => setSyntaxModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
