import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CurrencyInput } from './currency-field';

function ControlledCurrencyHarness({ error }: { error?: string }) {
  const [val, setVal] = useState<number | null>(100_000_000);
  return (
    <CurrencyInput
      label="Số tiền vay"
      required
      value={val}
      onValueChange={setVal}
      error={error}
    />
  );
}

describe('CurrencyInput', () => {
  it('hiển thị số tiền phân cách hàng nghìn và dòng đọc bằng chữ tiếng Việt', () => {
    render(<ControlledCurrencyHarness />);

    const input = screen.getByLabelText(/Số tiền vay/i) as HTMLInputElement;
    expect(input.value).toBe('100.000.000');
    expect(screen.getByText(/Bằng chữ: Một trăm triệu đồng/i)).toBeInTheDocument();
  });

  it('tự động định dạng khi người dùng nhập số mới', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyHarness />);

    const input = screen.getByLabelText(/Số tiền vay/i) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '50000000');

    expect(input.value).toBe('50.000.000');
    expect(screen.getByText(/Bằng chữ: Năm mươi triệu đồng/i)).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi và gắn aria-invalid khi nhập sai', () => {
    render(<ControlledCurrencyHarness error="Vượt hạn mức vay tín chấp 100.000.000 ₫" />);

    const input = screen.getByLabelText(/Số tiền vay/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Vượt hạn mức vay tín chấp 100.000.000 ₫',
    );
  });
});

