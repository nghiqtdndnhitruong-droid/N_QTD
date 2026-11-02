import { useEffect, useState } from 'react';

/**
 * Trì hoãn cập nhật giá trị sau `delayMs` mili-giây kể từ lần thay đổi cuối.
 * Dùng cho ô tìm kiếm và tra cứu tự động để tránh gửi API liên tục khi người dùng đang gõ.
 */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

