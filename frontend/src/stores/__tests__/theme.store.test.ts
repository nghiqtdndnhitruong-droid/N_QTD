import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, THEME_STORAGE_KEY } from '../theme.store';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });

  it('1. Cho phép chuyển sang chế độ Dark Mode và gán class dark vào thẻ html', () => {
    useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('2. Cho phép chuyển sang chế độ Light Mode và gỡ class dark khỏi thẻ html', () => {
    useThemeStore.getState().setMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('3. toggleTheme chuyển đổi qua lại giữa Sáng và Tối', () => {
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('4. Hỗ trợ chế độ system theo dõi cài đặt hệ điều hành', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useThemeStore.getState().setMode('system');

    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});

