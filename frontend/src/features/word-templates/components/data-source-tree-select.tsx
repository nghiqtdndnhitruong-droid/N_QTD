import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { DataDictionaryGroup, DataDictionaryField } from '../types/word-template.types';

export interface DataSourceTreeSelectProps {
  groups: DataDictionaryGroup[];
  value?: string | null;
  onChange: (path: string, field?: DataDictionaryField) => void;
  disabled?: boolean;
}

const TYPE_TONES: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'neutral'> = {
  TEXT: 'primary',
  NUMBER: 'info',
  DATE: 'warning',
  CURRENCY: 'success',
  CURRENCY_WORDS: 'success',
  GENDER_TITLE: 'info',
  BOOLEAN: 'neutral',
  LIST: 'primary',
};

export function DataSourceTreeSelect({
  groups,
  value,
  onChange,
  disabled = false,
}: DataSourceTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    member: true,
    loan: true,
    collaterals_summary: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Tìm field đang được chọn
  const selectedField = useMemo(() => {
    if (!value) return null;
    for (const group of groups) {
      for (const f of group.fields) {
        if (f.path === value) return f;
        if (f.itemFields) {
          for (const itemF of f.itemFields) {
            if (`${f.path}.${itemF.path}` === value || itemF.path === value) return itemF;
          }
        }
      }
    }
    return null;
  }, [groups, value]);

  // Lọc theo từ khóa tìm kiếm
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const s = search.toLowerCase();
    return groups
      .map((g) => {
        const matchesGroup = g.label.toLowerCase().includes(s);
        const matchingFields = g.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(s) ||
            f.path.toLowerCase().includes(s) ||
            f.itemFields?.some(
              (itemF) =>
                itemF.label.toLowerCase().includes(s) || itemF.path.toLowerCase().includes(s),
            ),
        );
        if (matchesGroup || matchingFields.length > 0) {
          return {
            ...g,
            fields: matchesGroup ? g.fields : matchingFields,
          };
        }
        return null;
      })
      .filter(Boolean) as DataDictionaryGroup[];
  }, [groups, search]);

  return (
    <div className="relative w-full">
      {/* Nút bấm hiển thị */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className="truncate">
          {selectedField ? (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-900">{selectedField.label}</span>
              <span className="font-mono text-[11px] text-slate-500">({selectedField.path})</span>
            </span>
          ) : value ? (
            <span className="font-mono text-slate-700">{value}</span>
          ) : (
            <span className="text-slate-400 italic">-- Chọn trường dữ liệu nguồn --</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-[340px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {/* Thanh tìm kiếm */}
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm trường dữ liệu hoặc đường dẫn..."
                  className="h-8 w-full rounded border border-slate-200 pl-8 pr-7 text-xs focus:border-primary-500 focus:outline-none"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách phân nhóm */}
            <div className="max-h-64 overflow-y-auto p-1 text-xs">
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="mb-1 flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-danger-600 hover:bg-danger-50"
                >
                  <span>Bỏ ánh xạ (Để trống)</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-slate-400">Không tìm thấy trường khớp</div>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded = search ? true : Boolean(expandedGroups[group.id]);
                  return (
                    <div key={group.id} className="mb-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between rounded px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <span className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>{group.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {group.fields.length} trường
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="ml-2 space-y-0.5 border-l border-slate-100 pl-2">
                          {group.fields.map((field) => {
                            const isSelected = value === field.path;
                            return (
                              <button
                                key={field.path}
                                type="button"
                                onClick={() => {
                                  onChange(field.path, field);
                                  setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-primary-50 font-medium text-primary-900'
                                    : 'text-slate-800 hover:bg-slate-50'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate">{field.label}</span>
                                    <Badge
                                      tone={TYPE_TONES[field.dataType] || 'neutral'}
                                      className="text-[9px] px-1 py-0"
                                    >
                                      {field.dataType}
                                    </Badge>
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400">
                                    {field.path}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

