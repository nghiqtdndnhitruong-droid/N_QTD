import { create } from 'zustand';

/**
 * Quản lý giao diện Sáng / Tối của ứng dụng.
 * - `light`  : Luôn dùng giao diện sáng.
 * - `dark`   : Luôn dùng giao diện tối.
 * - `system` : Tự động theo cài đặt của hệ điều hành / trình duyệt.
 *
 * Lựa chọn được lưu vào localStorage (khoá `qtd.theme`) và được áp dụng sớm
 * bằng script inline trong `index.html` để tránh hiện tượng nháy màu khi tải trang.
 */
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'qtd.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
  return 'light';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Chuyển nhanh giữa Sáng và Tối (dựa trên giao diện đang hiển thị). */
  toggleTheme: () => void;
}

const initialMode = readStoredMode();
const initialResolved = resolveTheme(initialMode);
applyThemeToDocument(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolvedTheme: initialResolved,
  setMode: (mode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Bỏ qua
    }
    const resolvedTheme = resolveTheme(mode);
    // Bật hiệu ứng chuyển màu mượt trong thời gian ngắn khi người dùng đổi giao diện
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 260);
    applyThemeToDocument(resolvedTheme);
    set({ mode, resolvedTheme });
  },
  toggleTheme: () => {
    get().setMode(get().resolvedTheme === 'dark' ? 'light' : 'dark');
  },
}));

// Theo dõi thay đổi cài đặt hệ điều hành khi đang ở chế độ "Theo hệ thống"
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia(DARK_QUERY);
  const handleChange = () => {
    const { mode } = useThemeStore.getState();
    if (mode !== 'system') return;
    const resolvedTheme = resolveTheme('system');
    applyThemeToDocument(resolvedTheme);
    useThemeStore.setState({ resolvedTheme });
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleChange);
  }
}
