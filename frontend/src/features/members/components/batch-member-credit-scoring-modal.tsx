import { useMemo, useState } from 'react';
import { Award, Download, Save, Sparkles, Users, X } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { notifyApiError, notifySuccess } from '@/components/feedback';
import {
  useBatchExportMemberCreditRatingZip,
  useBatchSaveMemberCreditRating,
} from '../hooks/use-members';
import type { Member } from '../types/member.types';
import {
  CREDIT_SCORING_CRITERIA,
  buildDefaultCreditSelections,
  computeCreditScoringResult,
  getAutoAgeOptionKey,
} from '../utils/credit-scoring';

export interface BatchMemberCreditScoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMembers: Member[];
  onRemoveMember?: (memberId: string) => void;
  onSuccess?: () => void;
}

export function BatchMemberCreditScoringModal({
  open,
  onOpenChange,
  selectedMembers,
  onRemoveMember,
  onSuccess,
}: BatchMemberCreditScoringModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    buildDefaultCreditSelections(1985, null),
  );

  const batchSaveMutation = useBatchSaveMemberCreditRating();
  const batchExportZipMutation = useBatchExportMemberCreditRatingZip();

  const group1ManualCriteria = useMemo(
    () => CREDIT_SCORING_CRITERIA.filter((c) => c.group === 1 && c.id !== 'c1'),
    [],
  );
  const group2Criteria = useMemo(
    () => CREDIT_SCORING_CRITERIA.filter((c) => c.group === 2),
    [],
  );
  const ageCriterion = useMemo(
    () => CREDIT_SCORING_CRITERIA.find((c) => c.id === 'c1')!,
    [],
  );

  // Tính kết quả riêng cho từng khách hàng dựa trên tuổi thực của họ + các tiêu chí chung c2..c14
  const memberPreviews = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return selectedMembers.map((member) => {
      const age = currentYear - member.yearOfBirth;
      const autoAgeKey = getAutoAgeOptionKey(member.yearOfBirth);
      const ageOpt =
        ageCriterion.options.find((o) => o.key === autoAgeKey) ?? ageCriterion.options[0]!;
      const score = computeCreditScoringResult({
        ...selections,
        c1: autoAgeKey,
      });

      return {
        member,
        age,
        ageOptionLabel: ageOpt.label,
        ageRawScore: ageOpt.rawScore,
        ageWeightedScore: Number((ageOpt.rawScore * ageCriterion.weight).toFixed(2)),
        score,
      };
    });
  }, [selectedMembers, selections, ageCriterion]);

  const handleSelectOption = (criterionId: string, optionKey: string) => {
    setSelections((prev) => ({
      ...prev,
      [criterionId]: optionKey,
    }));
  };

  const memberIds = useMemo(() => selectedMembers.map((m) => m.id), [selectedMembers]);

  const handleBatchSave = async () => {
    if (memberIds.length === 0) return;
    try {
      await batchSaveMutation.mutateAsync({
        memberIds,
        selections,
      });
      notifySuccess(
        `Đã chấm điểm và lưu kết quả cho ${memberIds.length} khách hàng thành công!`,
      );
      onSuccess?.();
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleBatchExportZip = async () => {
    if (memberIds.length === 0) return;
    try {
      await batchExportZipMutation.mutateAsync({
        memberIds,
        selections,
        defaultFileName: `Bang_cham_diem_nhom_${memberIds.length}_khach_hang.zip`,
      });
      notifySuccess(
        `Đã xuất file ZIP chứa ${memberIds.length} bảng chấm điểm Word (.docx) thành công!`,
      );
      onSuccess?.();
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="3xl" className="max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary-600" />
            <span>Chấm điểm xếp hạng tín dụng theo nhóm ({selectedMembers.length} khách hàng)</span>
          </DialogTitle>
          <DialogDescription>
            Tiêu chí 1 (Tuổi) được hệ thống tự động tính theo năm sinh riêng của từng khách hàng. Các
            tiêu chí từ 2 → 14 bạn chỉ cần chọn 1 lần để áp dụng đồng loạt cho toàn bộ danh sách đã
            chọn và tải về 1 file ZIP chứa tất cả file Word bảng chấm điểm.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* 1. BẢNG DANH SÁCH KHÁCH HÀNG ĐƯỢC CHỌN & ĐIỂM DỰ KIẾN THEO THỜI GIAN THỰC */}
          <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-primary-600" />
                <span>
                  Danh sách khách hàng chấm điểm & Kết quả tự động theo từng độ tuổi (
                  {selectedMembers.length} người)
                </span>
              </div>
              <Badge tone="primary">Tự động tính Tuổi cho từng người</Badge>
            </div>

            {selectedMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                Chưa có khách hàng nào được chọn. Vui lòng tích chọn khách hàng ở bảng danh sách.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Khách hàng</th>
                      <th className="px-3 py-2">Năm sinh (Tuổi)</th>
                      <th className="px-3 py-2">Tiêu chí 1 (Tuổi tự động)</th>
                      <th className="px-3 py-2 text-right">Nhóm I (40%)</th>
                      <th className="px-3 py-2 text-right">Nhóm II (60%)</th>
                      <th className="px-3 py-2 text-right">Tổng điểm</th>
                      <th className="px-3 py-2">Hạng & Rủi ro</th>
                      {onRemoveMember && <th className="px-2 py-2 text-right">Bỏ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberPreviews.map((item, idx) => {
                      const tone =
                        item.score.riskLevel === 'Rủi ro thấp'
                          ? 'success'
                          : item.score.riskLevel === 'Rủi ro trung bình'
                            ? 'warning'
                            : 'danger';
                      return (
                        <tr key={item.member.id} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">
                              {item.member.fullName}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              CCCD: {item.member.idNumber}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {item.member.yearOfBirth} ({item.age}t)
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 border border-sky-200">
                              {item.ageOptionLabel} ({item.ageRawScore}đ → {item.ageWeightedScore}đ)
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {item.score.group1Score}đ ({item.score.group1Weighted}đ)
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {item.score.group2Score}đ ({item.score.group2Weighted}đ)
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-primary-700 tabular-nums">
                            {item.score.totalScore}đ
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={tone} className="font-mono font-bold">
                              {item.score.rank} · {item.score.riskLevel}
                            </Badge>
                          </td>
                          {onRemoveMember && (
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => onRemoveMember(item.member.id)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Bỏ khách hàng này khỏi nhóm"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. NHÓM I: TIÊU CHÍ CÁ NHÂN & CÔNG VIỆC */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                Nhóm I: Tiêu chí Cá nhân & Công việc (Tiêu chí 1 → 10 · Trọng số nhóm 40%)
              </h4>
              <p className="text-xs text-slate-500">
                Mỗi tiêu chí chiếm trọng số 10% trong Nhóm I.
              </p>
            </div>

            {/* Tiêu chí 1: Tự động theo tuổi từng người */}
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-900">
                <strong>Tiêu chí 1 — Tuổi (Trọng số 10%): Tự động chấm theo từng khách hàng.</strong>{' '}
                Hệ thống tự căn cứ vào năm sinh của mỗi khách hàng trong danh sách trên để chọn mức
                điểm tương ứng (Từ 36–55 tuổi: 100đ | 26–35 tuổi: 75đ | 56–60 tuổi: 50đ | 20–25 tuổi:
                25đ | Trên 60 hoặc dưới 20 tuổi: 0đ).
              </div>
            </div>

            {/* Tiêu chí 2 -> 10 */}
            <div className="divide-y divide-slate-100">
              {group1ManualCriteria.map((criterion) => {
                const selectedKey = selections[criterion.id];
                const selectedOpt =
                  criterion.options.find((o) => o.key === selectedKey) ?? criterion.options[0]!;
                const weighted = Number((selectedOpt.rawScore * criterion.weight).toFixed(2));

                return (
                  <div key={criterion.id} className="py-3.5 first:pt-1 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-800">
                          {criterion.number}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{criterion.name}</span>
                        <Badge tone="neutral" className="text-[10px]">
                          Trọng số {criterion.weightPercentLabel}
                        </Badge>
                      </div>
                      <span className="text-xs font-semibold text-primary-700 tabular-nums">
                        Điểm: {selectedOpt.rawScore}đ → Quy đổi: {weighted}đ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {criterion.options.map((opt) => {
                        const isSelected = selectedKey === opt.key;
                        const optWeighted = Number((opt.rawScore * criterion.weight).toFixed(2));
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(criterion.id, opt.key)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary-600 bg-primary-50/80 text-primary-950 ring-2 ring-primary-500/20 font-semibold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="pr-2">{opt.label}</span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                                isSelected
                                  ? 'bg-primary-600 text-white font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.rawScore}đ ({optWeighted}đ)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. NHÓM II: TIÊU CHÍ TÀI CHÍNH & THANH TOÁN */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                Nhóm II: Tiêu chí Tài chính & Thanh toán (Tiêu chí 11 → 14 · Trọng số nhóm 60%)
              </h4>
              <p className="text-xs text-slate-500">
                Trọng số thành phần: 30% - 30% - 25% - 15%.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {group2Criteria.map((criterion) => {
                const selectedKey = selections[criterion.id];
                const selectedOpt =
                  criterion.options.find((o) => o.key === selectedKey) ?? criterion.options[0]!;
                const weighted = Number((selectedOpt.rawScore * criterion.weight).toFixed(2));

                return (
                  <div key={criterion.id} className="py-3.5 first:pt-1 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                          {criterion.number}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{criterion.name}</span>
                        <Badge tone="info" className="text-[10px]">
                          Trọng số {criterion.weightPercentLabel}
                        </Badge>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                        Điểm: {selectedOpt.rawScore}đ → Quy đổi: {weighted}đ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {criterion.options.map((opt) => {
                        const isSelected = selectedKey === opt.key;
                        const optWeighted = Number((opt.rawScore * criterion.weight).toFixed(2));
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(criterion.id, opt.key)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 font-semibold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="pr-2">{opt.label}</span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                                isSelected
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.rawScore}đ ({optWeighted}đ)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Đang chọn <strong>{selectedMembers.length}</strong> khách hàng để chấm điểm đồng loạt.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={batchSaveMutation.isPending || batchExportZipMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Save className="h-4 w-4" />}
              disabled={selectedMembers.length === 0 || batchExportZipMutation.isPending}
              isLoading={batchSaveMutation.isPending}
              onClick={() => void handleBatchSave()}
            >
              Lưu điểm cho {selectedMembers.length} người
            </Button>
            <Button
              type="button"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={selectedMembers.length === 0 || batchSaveMutation.isPending}
              isLoading={batchExportZipMutation.isPending}
              onClick={() => void handleBatchExportZip()}
            >
              Tải file ZIP bảng chấm điểm ({selectedMembers.length} file Word)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

