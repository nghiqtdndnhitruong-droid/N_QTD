import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore, type ThemeMode } from '@/stores/theme.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '../ui';

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  { value: 'light', label: 'Giao diện Sáng', description: 'Nền trắng, phù hợp ban ngày', icon: Sun },
  { value: 'dark', label: 'Giao diện Tối', description: 'Nền Navy, dịu mắt ban đêm', icon: Moon },
  {
    value: 'system',
    label: 'Theo hệ thống',
    description: 'Tự động theo cài đặt máy tính',
    icon: Monitor,
  },
];

/**
 * Nút chuyển đổi giao diện Sáng / Tối đặt trên thanh Header.
 * - Bấm vào biểu tượng để mở menu chọn 3 chế độ: Sáng, Tối, Theo hệ thống.
 * - Phím tắt: Ctrl/Cmd + Shift + L để đổi nhanh Sáng ↔ Tối (đăng ký trong AppShell).
 */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setMode = useThemeStore((s) => s.setMode);

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu modal={false}>
      <Tooltip content={isDark ? 'Đang dùng giao diện Tối' : 'Đang dùng giao diện Sáng'}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className={cn(
              'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-600',
              'transition-colors hover:bg-slate-50 hover:text-slate-900',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30',
            )}
          >
            <Sun
              aria-hidden="true"
              className={cn(
                'absolute h-[18px] w-[18px] text-amber-500 transition-all duration-300',
                isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
              )}
            />
            <Moon
              aria-hidden="true"
              className={cn(
                'absolute h-[18px] w-[18px] text-primary-300 transition-all duration-300',
                isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
              )}
            />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Giao diện hiển thị</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = mode === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setMode(option.value)}
              className={cn(active && 'bg-primary-50')}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">{option.label}</span>
                <span className="block text-[11px] text-slate-500">{option.description}</span>
              </span>
              {active && <Check className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2.5 py-1.5 text-[11px] text-slate-400">
          Phím tắt:{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-600">
            Ctrl
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-600">
            Shift
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-600">
            L
          </kbd>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

