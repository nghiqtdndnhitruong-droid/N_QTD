import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Download, FileText, RefreshCw, Save, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import { formatDateVN } from '@/shared/format';
import {
  useDeleteMemberCreditRating,
  useExportMemberCreditRatingDocx,
  useSaveMemberCreditRating,
} from '../hooks/use-members';
import type { Member } from '../types/member.types';
import {
  CREDIT_RANK_TABLE,
  CREDIT_SCORING_CRITERIA,
  buildDefaultCreditSelections,
  computeCreditScoringResult,
  getAutoAgeOptionKey,
} from '../utils/credit-scoring';

export interface MemberCreditScoringTabProps {
  member: Member;
}

export function MemberCreditScoringTab({ member }: MemberCreditScoringTabProps) {
  const currentAge = new Date().getFullYear() - member.yearOfBirth;
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    buildDefaultCreditSelections(member.yearOfBirth, member.creditRating?.selections),
  );

  useEffect(() => {
    setSelections(
      buildDefaultCreditSelections(member.yearOfBirth, member.creditRating?.selections),
    );
  }, [member.id, member.yearOfBirth, member.creditRating]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const saveMutation = useSaveMemberCreditRating(member.id);
  const deleteMutation = useDeleteMemberCreditRating(member.id);
  const exportDocxMutation = useExportMemberCreditRatingDocx(member.id);

  const result = useMemo(() => computeCreditScoringResult(selections), [selections]);
  const group1Criteria = useMemo(
    () => CREDIT_SCORING_CRITERIA.filter((c) => c.group === 1),
    [],
  );
  const group2Criteria = useMemo(
    () => CREDIT_SCORING_CRITERIA.filter((c) => c.group === 2),
    [],
  );

  const handleSelectOption = (criterionId: string, optionKey: string) => {
    setSelections((prev) => ({
      ...prev,
      [criterionId]: optionKey,
    }));
  };

  const handleResetAutoAge = () => {
    setSelections((prev) => ({
      ...prev,
      c1: getAutoAgeOptionKey(member.yearOfBirth),
    }));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(selections);
      notifySuccess(
        `Đã lưu điểm xếp hạng của ${member.fullName}: ${result.totalScore} điểm — Hạng ${result.rank} (${result.riskLevel})`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleExportWord = async () => {
    try {
      const safeName = member.fullName.trim().replace(/\s+/g, '_');
      await exportDocxMutation.mutateAsync({
        selections,
        defaultFileName: `Bang_cham_diem_${safeName}_${result.rank}.docx`,
      });
      notifySuccess(
        `Đã xuất file Word Bảng chấm điểm xếp hạng tín dụng cho ${member.fullName}`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const riskBadgeTone =
    result.riskLevel === 'Rủi ro thấp'
      ? 'success'
      : result.riskLevel === 'Rủi ro trung bình'
        ? 'warning'
        : 'danger';

  return (
    <div className="space-y-6">
      {/* Thanh kết quả tổng hợp & Nút hành động */}
      <Card className="border-primary-200 bg-gradient-to-r from-primary-50/70 via-white to-emerald-50/50">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Award className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kết quả chấm điểm & Xếp hạng tín nhiệm: {member.fullName}
                </h3>
                {member.creditRating?.ratedAt && (
                  <span className="text-xs text-slate-500">
                    (Đã lưu lần cuối: {formatDateVN(member.creditRating.ratedAt)})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                Công thức: Tổng điểm = Điểm Nhóm I × 40% ({result.group1Score} × 0.4 ={' '}
                <strong>{result.group1Weighted}đ</strong>) + Điểm Nhóm II × 60% ({result.group2Score}{' '}
                × 0.6 = <strong>{result.group2Weighted}đ</strong>)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {member.creditRating && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-danger-200 text-danger-600 hover:bg-danger-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Xóa điểm đã chấm
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Save className="h-4 w-4" />}
                isLoading={saveMutation.isPending}
                onClick={() => void handleSave()}
              >
                Lưu điểm chấm
              </Button>
              <Button
                type="button"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                isLoading={exportDocxMutation.isPending}
                onClick={() => void handleExportWord()}
              >
                Tải file Word bảng chấm điểm
              </Button>
            </div>
          </div>

          {/* 4 Thẻ chỉ số điểm */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">
                Điểm Nhóm I (Cá nhân & Công việc)
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  {result.group1Score} <span className="text-xs font-normal text-slate-500">/ 100đ</span>
                </span>
                <Badge tone="neutral">× 40% = {result.group1Weighted}đ</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">
                Điểm Nhóm II (Tài chính & Thanh toán)
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  {result.group2Score} <span className="text-xs font-normal text-slate-500">/ 100đ</span>
                </span>
                <Badge tone="neutral">× 60% = {result.group2Weighted}đ</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-primary-300 bg-primary-50/70 p-3.5 shadow-2xs">
              <div className="text-xs font-semibold text-primary-800">
                Tổng điểm cuối cùng
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-primary-700 tabular-nums">
                  {result.totalScore}
                </span>
                <span className="text-xs font-medium text-primary-700">Thang 100 điểm</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-white p-3.5 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">
                Hạng tín nhiệm & Mức độ rủi ro
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Hạng {result.rank}
                </span>
                <Badge tone={riskBadgeTone}>{result.riskLevel}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NHÓM I: TIÊU CHÍ CÁ NHÂN & CÔNG VIỆC (1 -> 10) */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              Nhóm I: Tiêu chí Cá nhân & Công việc (Tiêu chí 1 → 10)
            </CardTitle>
            <CardDescription>
              Mỗi tiêu chí chiếm trọng số 10% trong Nhóm I. Tổng điểm Nhóm I chiếm 40% Tổng điểm cuối cùng.
            </CardDescription>
          </div>
          <Badge tone="primary">
            Tổng Nhóm I: {result.group1Score}đ (Quy đổi 40%: {result.group1Weighted}đ)
          </Badge>
        </CardHeader>

        <CardContent className="divide-y divide-slate-100">
          {group1Criteria.map((criterion) => {
            const selectedKey = selections[criterion.id];
            const itemResult = result.items.find((i) => i.criterionId === criterion.id);

            return (
              <div key={criterion.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800">
                      {criterion.number}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{criterion.name}</span>
                    <Badge tone="neutral" className="text-[11px]">
                      Trọng số {criterion.weightPercentLabel}
                    </Badge>
                    {criterion.autoByAge && (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-200">
                        Năm sinh {member.yearOfBirth} ({currentAge} tuổi — Tự động chọn)
                        <button
                          type="button"
                          onClick={handleResetAutoAge}
                          className="ml-1 inline-flex items-center gap-0.5 text-sky-800 underline hover:text-sky-950"
                          title="Đồng bộ lại theo năm sinh"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-slate-700 tabular-nums">
                    Điểm gốc: <span className="text-slate-900">{itemResult?.rawScore ?? 0}đ</span> · Điểm quy đổi:{' '}
                    <span className="text-primary-700 font-bold">
                      {itemResult?.weightedScore ?? 0}đ
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {criterion.options.map((opt) => {
                    const isSelected = selectedKey === opt.key;
                    const weighted = Number((opt.rawScore * criterion.weight).toFixed(2));
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectOption(criterion.id, opt.key)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/80 text-primary-950 ring-2 ring-primary-500/20 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2 pr-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-primary-600 bg-primary-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          <span>{opt.label}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
                            isSelected
                              ? 'bg-primary-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.rawScore}đ ({weighted}đ)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* NHÓM II: TIÊU CHÍ TÀI CHÍNH & THANH TOÁN (11 -> 14) */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              Nhóm II: Tiêu chí Tài chính & Thanh toán (Tiêu chí 11 → 14)
            </CardTitle>
            <CardDescription>
              Tổng điểm Nhóm II chiếm 60% Tổng điểm cuối cùng (Trọng số thành phần: 30% - 30% - 25% - 15%).
            </CardDescription>
          </div>
          <Badge tone="primary">
            Tổng Nhóm II: {result.group2Score}đ (Quy đổi 60%: {result.group2Weighted}đ)
          </Badge>
        </CardHeader>

        <CardContent className="divide-y divide-slate-100">
          {group2Criteria.map((criterion) => {
            const selectedKey = selections[criterion.id];
            const itemResult = result.items.find((i) => i.criterionId === criterion.id);

            return (
              <div key={criterion.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      {criterion.number}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{criterion.name}</span>
                    <Badge tone="info" className="text-[11px]">
                      Trọng số {criterion.weightPercentLabel}
                    </Badge>
                  </div>

                  <div className="text-xs font-semibold text-slate-700 tabular-nums">
                    Điểm gốc: <span className="text-slate-900">{itemResult?.rawScore ?? 0}đ</span> · Điểm quy đổi:{' '}
                    <span className="text-emerald-700 font-bold">
                      {itemResult?.weightedScore ?? 0}đ
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {criterion.options.map((opt) => {
                    const isSelected = selectedKey === opt.key;
                    const weighted = Number((opt.rawScore * criterion.weight).toFixed(2));
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectOption(criterion.id, opt.key)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2 pr-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          <span>{opt.label}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.rawScore}đ ({weighted}đ)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* BẢNG ĐỐI CHIẾU XẾP HẠNG TÍN NHIỆM */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Bảng đối chiếu Xếp hạng tín nhiệm & Kết luận</CardTitle>
            <CardDescription>
              Như vậy với tổng điểm đã quy đổi theo trọng số của Ông(bà) <strong>{member.fullName}</strong> là{' '}
              <strong>{result.totalScore}</strong>, tương ứng với hạng <strong>{result.rank}</strong>, thuộc mức{' '}
              <strong>{result.riskLevel.toLowerCase()}</strong>.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            leftIcon={<FileText className="h-4 w-4" />}
            isLoading={exportDocxMutation.isPending}
            onClick={() => void handleExportWord()}
          >
            Tải file Word bảng chấm điểm
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Tổng điểm</th>
                  <th className="px-4 py-2.5">Hạng tín nhiệm</th>
                  <th className="px-4 py-2.5">Mức độ rủi ro</th>
                  <th className="px-4 py-2.5 text-right">Trạng thái đạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CREDIT_RANK_TABLE.map((row) => {
                  const isCurrent = row.rank === result.rank;
                  return (
                    <tr
                      key={row.rank}
                      className={
                        isCurrent
                          ? 'bg-primary-50/90 font-semibold text-primary-950'
                          : 'text-slate-600'
                      }
                    >
                      <td className="px-4 py-2.5">{row.rangeLabel}</td>
                      <td className="px-4 py-2.5 font-mono font-bold">{row.rank}</td>
                      <td className="px-4 py-2.5">{row.riskLevel}</td>
                      <td className="px-4 py-2.5 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đạt hạng {result.rank} ({result.totalScore}đ)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Xóa kết quả chấm điểm của ${member.fullName}?`}
        description="Điểm xếp hạng tín dụng đã lưu sẽ bị xóa và trạng thái trên danh sách khách hàng sẽ trở về 'Chưa chấm'."
        confirmText="Xác nhận xóa điểm"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync();
            setSelections(buildDefaultCreditSelections(member.yearOfBirth, null));
            setConfirmDeleteOpen(false);
            notifySuccess(`Đã xóa kết quả chấm điểm của ${member.fullName}`);
          } catch (err) {
            setConfirmDeleteOpen(false);
            notifyApiError(err);
          }
        }}
      />
    </div>
  );
}

export function MemberCreditRatingBadge({ member }: { member: Member }) {
  const rating = member.creditRating;
  if (!rating) {
    return <span className="text-xs text-slate-400">Chưa chấm</span>;
  }

  const tone =
    rating.riskLevel === 'Rủi ro thấp'
      ? 'success'
      : rating.riskLevel === 'Rủi ro trung bình'
        ? 'warning'
        : 'danger';

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <Badge tone={tone} className="font-mono font-bold">
        Hạng {rating.rank} · {rating.totalScore}đ
      </Badge>
      <span className="text-[10px] text-slate-500">{rating.riskLevel}</span>
    </div>
  );
}
