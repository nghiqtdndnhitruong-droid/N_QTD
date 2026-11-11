import { useState } from 'react';
import { Check, Search, UserPlus } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN } from '@/shared/format';
import { checkIdExpiryStatus } from '@/features/loans/utils/loan-warnings';
import {
  Badge,
  DescriptionItem,
  DescriptionList,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from '@/components/ui';
import { FieldWrapper } from '@/components/form';
import { applyServerErrorsToForm } from '@/lib/http';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { useCreateMember, useMemberDetail, useMembersList } from '../hooks/use-members';
import { MemberForm } from './member-form';
import type { Member } from '../types/member.types';

export interface MemberLookupFieldProps {
  value: string;
  onChange: (memberId: string, member?: Member) => void;
  error?: string;
}

/**
 * Ô tìm và chọn thành viên có Debounce 300ms + hiển thị thẻ thông tin thành viên đã chọn.
 * Cho phép mở Drawer tạo thành viên mới ngay tại chỗ mà không mất tiến trình Wizard.
 */
export function MemberLookupField({ value, onChange, error }: MemberLookupFieldProps) {
  const [keyword, setKeyword] = useState('');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const debouncedKeyword = useDebounce(keyword, 300);

  const { data: listData, isFetching } = useMembersList({
    page: 1,
    limit: 8,
    search: debouncedKeyword || undefined,
  });

  const { data: selectedMember } = useMemberDetail(value || undefined);
  const createMemberMutation = useCreateMember();

  const members = listData?.items ?? [];

  return (
    <div className="space-y-4">
      <FieldWrapper
        label="Tìm kiếm và chọn thành viên vay vốn"
        required
        error={error}
        extraRight={
          <button
            type="button"
            onClick={() => setCreateDrawerOpen(true)}
            className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-800"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Tạo thành viên mới</span>
          </button>
        }
      >
        {({ inputId }) => (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={inputId}
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập mã thành viên, họ tên hoặc số CCCD để tra cứu..."
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>
        )}
      </FieldWrapper>

      {/* Danh sách gợi ý thành viên */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
          {isFetching
            ? 'Đang tra cứu thành viên...'
            : `Danh sách thành viên (${listData?.pagination.total ?? 0})`}
        </div>
        {members.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Không tìm thấy thành viên khớp từ khóa. Bạn có thể bấm{' '}
            <button
              type="button"
              onClick={() => setCreateDrawerOpen(true)}
              className="font-semibold text-primary-600 underline"
            >
              Tạo thành viên mới
            </button>
            .
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {members.map((m) => {
              const isSelected = m.id === value;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onChange(m.id, m)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-primary-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{m.fullName}</span>
                        {m.memberCode ? (
                          <Badge tone="primary" className="font-mono">
                            {m.memberCode}
                          </Badge>
                        ) : (
                          <Badge tone="warning" className="text-[10px]">
                            Chưa cấp mã
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        CCCD: <span className="font-mono font-medium text-slate-700">{m.idNumber}</span> · Năm sinh:{' '}
                        {m.yearOfBirth} · {m.address}
                        {(() => {
                          const expStatus = checkIdExpiryStatus(m.idExpiry);
                          if (expStatus?.isExpired) {
                            return (
                              <span className="ml-1.5 inline-flex items-center rounded bg-rose-50 px-1 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                                ⚠️ Hết hạn
                              </span>
                            );
                          }
                          if (expStatus?.isExpiringSoon) {
                            return (
                              <span className="ml-1.5 inline-flex items-center rounded bg-amber-50 px-1 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                ⚠️ Sắp hết hạn (&lt; 6th)
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    {isSelected ? (
                      <Badge tone="success" icon={<Check className="h-3.5 w-3.5" />}>
                        Đã chọn
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Chọn</Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Thẻ tóm tắt thành viên đã chọn */}
      {selectedMember && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge tone="primary">Thành viên đã chọn</Badge>
              <span className="text-sm font-bold text-slate-900">{selectedMember.fullName}</span>
              <span className="text-xs font-mono text-slate-500">
                {selectedMember.memberCode ? `(${selectedMember.memberCode})` : '(Chưa cấp mã)'}
              </span>
            </div>
          </div>
          <DescriptionList columns={3}>
            <DescriptionItem
              label={ID_DOCUMENT_TYPE_LABELS[selectedMember.idType]}
              value={selectedMember.idNumber}
              mono
            />
            <DescriptionItem
              label="Hạn giấy tờ"
              value={
                selectedMember.idExpiry ? (
                  <span className="inline-flex items-center gap-1 font-mono">
                    {formatDateVN(selectedMember.idExpiry)}
                    {(() => {
                      const expStatus = checkIdExpiryStatus(selectedMember.idExpiry);
                      if (expStatus?.isExpired) {
                        return (
                          <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            Đã hết hạn
                          </span>
                        );
                      }
                      if (expStatus?.isExpiringSoon) {
                        return (
                          <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Sắp hết hạn (&lt; 6th)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                ) : (
                  'Không thời hạn'
                )
              }
            />
            <DescriptionItem
              label="Năm sinh / Giới tính"
              value={`${selectedMember.yearOfBirth} (${GENDER_LABELS[selectedMember.gender]})`}
            />
            <DescriptionItem label="Địa chỉ thường trú" value={selectedMember.address} span={3} />
          </DescriptionList>
        </div>
      )}

      {/* Drawer tạo nhanh thành viên mới */}
      <Drawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
        <DrawerContent size="xl">
          <DrawerHeader
            title="Tạo hồ sơ thành viên mới"
            description="Sau khi tạo, thành viên sẽ được tự động gắn vào hồ sơ vay hiện tại."
          />
          <DrawerBody>
            <MemberForm
              isSubmitting={createMemberMutation.isPending}
              onCancel={() => setCreateDrawerOpen(false)}
              onSubmit={async (values, setError) => {
                try {
                  const created = await createMemberMutation.mutateAsync(values);
                  notifySuccess(`Đã tạo thành viên ${created.fullName}`);
                  onChange(created.id, created);
                  setCreateDrawerOpen(false);
                } catch (err) {
                  if (!applyServerErrorsToForm(err, setError)) {
                    notifyApiError(err);
                  }
                }
              }}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
