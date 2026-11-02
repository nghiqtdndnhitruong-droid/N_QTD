/**
 * Bảng ánh xạ ErrorCode của Backend (backend/src/shared/errors/error-codes.ts)
 * sang thông điệp thân thiện, nêu rõ nguyên nhân và hướng xử lý cho người dùng.
 */

export interface FriendlyErrorMeta {
  title: string;
  suggestion?: string;
}

export const ERROR_CODE_META: Record<string, FriendlyErrorMeta> = {
  VALIDATION_ERROR: {
    title: 'Dữ liệu nhập chưa hợp lệ',
    suggestion: 'Vui lòng kiểm tra các trường được đánh dấu đỏ và sửa lại theo hướng dẫn.',
  },
  BAD_REQUEST: {
    title: 'Yêu cầu không hợp lệ',
    suggestion: 'Vui lòng kiểm tra lại thông tin vừa nhập và thử lại.',
  },
  UNAUTHORIZED: {
    title: 'Phiên đăng nhập đã hết hạn hoặc chưa xác thực',
    suggestion: 'Vui lòng đăng nhập lại để tiếp tục làm việc.',
  },
  FORBIDDEN: {
    title: 'Bạn không có quyền thực hiện thao tác này',
    suggestion: 'Liên hệ Quản trị viên nếu bạn cần được cấp quyền.',
  },
  NOT_FOUND: {
    title: 'Không tìm thấy dữ liệu yêu cầu',
    suggestion: 'Bản ghi có thể đã bị xóa hoặc đường dẫn không chính xác.',
  },
  CONFLICT: {
    title: 'Dữ liệu bị trùng lặp hoặc xung đột trạng thái',
    suggestion: 'Vui lòng tải lại trang và kiểm tra lại thông tin.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Máy chủ đang gặp sự cố khi xử lý yêu cầu',
    suggestion: 'Vui lòng thử lại sau ít phút hoặc báo cho bộ phận kỹ thuật.',
  },

  // Thành viên
  MEMBER_NOT_FOUND: {
    title: 'Không tìm thấy hồ sơ thành viên',
    suggestion: 'Kiểm tra lại mã thành viên hoặc làm mới danh sách.',
  },
  MEMBER_ALREADY_EXISTS: {
    title: 'Thành viên này đã tồn tại trong hệ thống',
    suggestion: 'Hãy tra cứu theo số CCCD hoặc mã thành viên trước khi tạo mới.',
  },
  MEMBER_CODE_EXISTS: {
    title: 'Mã thành viên đã được sử dụng',
    suggestion: 'Vui lòng nhập một mã thành viên khác chưa tồn tại.',
  },
  MEMBER_ID_NUMBER_EXISTS: {
    title: 'Số Căn cước / CCCD đã được đăng ký cho thành viên khác',
    suggestion: 'Kiểm tra lại số giấy tờ tùy thân hoặc tìm hồ sơ thành viên hiện có.',
  },
  MEMBER_HAS_ACTIVE_LOANS: {
    title: 'Không thể xóa thành viên đang có khoản vay hoặc nghĩa vụ tài chính chưa tất toán',
    suggestion: 'Vui lòng tất toán các khoản vay đang mở hoặc xóa hồ sơ vay nháp trước khi xóa thành viên.',
  },

  // Khoản vay
  LOAN_NOT_FOUND: {
    title: 'Không tìm thấy hồ sơ khoản vay',
    suggestion: 'Khoản vay không tồn tại hoặc đường dẫn không hợp lệ.',
  },
  LOAN_INVALID_STATUS: {
    title: 'Trạng thái khoản vay không cho phép thực hiện thao tác này',
    suggestion: 'Kiểm tra lại điều kiện chuyển trạng thái của hồ sơ vay.',
  },
  LOAN_UNSECURED_LIMIT_EXCEEDED: {
    title: 'Vượt hạn mức vay tín chấp tối đa (100.000.000 ₫)',
    suggestion: 'Hãy giảm số tiền vay đề nghị hoặc chuyển sang hình thức vay thế chấp.',
  },
  LOAN_MORTGAGE_LIMIT_EXCEEDED: {
    title: 'Số tiền vay vượt quá 70% tổng giá trị tài sản thế chấp',
    suggestion: 'Hãy bổ sung thêm tài sản thế chấp, định giá lại hoặc giảm số tiền vay.',
  },
  LOAN_INTEREST_RATE_NOT_FOUND: {
    title: 'Chưa có cấu hình lãi suất phù hợp cho kỳ hạn và mức tiền vay này',
    suggestion: 'Liên hệ Quản trị viên để cập nhật Bảng lãi suất hiện hành.',
  },
  LOAN_CANNOT_DISBURSE: {
    title: 'Khoản vay chưa đủ điều kiện giải ngân',
    suggestion: 'Hồ sơ cần ở trạng thái "Đã hoàn thành hồ sơ" hoặc "Đã giải ngân" trước khi giải ngân.',
  },
  LOAN_DISBURSEMENT_EXCEEDED: {
    title: 'Số tiền giải ngân vượt quá hạn mức còn được phép giải ngân',
    suggestion: 'Nhập số tiền nhỏ hơn hoặc bằng số tiền còn được giải ngân của khoản vay.',
  },
  LOAN_CANNOT_SETTLE: {
    title: 'Chưa thể tất toán khoản vay',
    suggestion: 'Dư nợ gốc thực tế phải bằng 0 ₫ trước khi chuyển sang trạng thái Đã tất toán.',
  },
  LOAN_HAS_FINANCIAL_TRANSACTIONS: {
    title: 'Không thể xóa khoản vay đang có giao dịch tài chính hiệu lực',
    suggestion: 'Đối với khoản vay đã giải ngân hoặc trả nợ, vui lòng thực hiện nghiệp vụ Tất toán hoặc Hủy giao dịch sai sót trước khi xóa hồ sơ.',
  },
  LOAN_CONTRACT_NUMBER_EXISTS: {
    title: 'Số khế ước đã tồn tại trong hệ thống',
    suggestion: 'Mỗi hồ sơ vay bắt buộc có một Số khế ước duy nhất. Vui lòng kiểm tra và nhập Số khế ước khác.',
  },
  LOAN_PLAN_INVALID_CAPITAL: {
    title: 'Tổng nhu cầu vốn nhỏ hơn số tiền vay đề nghị (Vốn tự có âm)',
    suggestion: 'Vui lòng tăng Tổng nhu cầu vốn hoặc giảm Số tiền vay để đảm bảo Vốn tự có ≥ 0 ₫.',
  },

  // Giải ngân & Trả nợ
  DISBURSEMENT_NOT_FOUND: {
    title: 'Không tìm thấy giao dịch giải ngân',
    suggestion: 'Vui lòng tải lại danh sách lịch sử giải ngân.',
  },
  DISBURSEMENT_INVALID_MODIFICATION: {
    title: 'Không thể chỉnh sửa hoặc hủy giao dịch giải ngân này',
    suggestion: 'Kiểm tra lại tổng nợ gốc đã thu hoặc trạng thái hiệu lực của giao dịch.',
  },
  REPAYMENT_NOT_FOUND: {
    title: 'Không tìm thấy giao dịch thu nợ / trả lãi',
    suggestion: 'Vui lòng tải lại danh sách lịch sử trả nợ.',
  },
  REPAYMENT_INVALID_MODIFICATION: {
    title: 'Không thể chỉnh sửa hoặc hủy giao dịch trả nợ này',
    suggestion: 'Kiểm tra lại số tiền gốc/lãi hoặc trạng thái hiệu lực của giao dịch.',
  },

  // Tài sản thế chấp
  COLLATERAL_NOT_FOUND: {
    title: 'Không tìm thấy tài sản thế chấp',
    suggestion: 'Tài sản có thể đã được gỡ khỏi hồ sơ vay.',
  },
  COLLATERAL_ALREADY_USED: {
    title: 'Tài sản thế chấp này đang được sử dụng cho một khoản vay khác chưa tất toán',
    suggestion: 'Kiểm tra lại mã tài sản hoặc tất toán khoản vay cũ trước.',
  },
  COLLATERAL_ASSET_CODE_EXISTS: {
    title: 'Mã tài sản thế chấp đã tồn tại trong hệ thống',
    suggestion: 'Mỗi tài sản thế chấp bắt buộc phải có Mã tài sản riêng biệt (Số GCN được phép trùng).',
  },

  // Địa bàn (Tỉnh -> Xã -> Ấp)
  AREA_NOT_FOUND: {
    title: 'Không tìm thấy địa bàn được chọn trong danh mục của Quỹ',
    suggestion: 'Vui lòng chọn lại Tỉnh -> Xã -> Ấp hợp lệ.',
  },
  AREA_ALREADY_EXISTS: {
    title: 'Tên Ấp này đã tồn tại trong Xã đã chọn',
    suggestion: 'Vui lòng chọn Ấp đã có sẵn trong danh sách hoặc nhập tên Ấp khác.',
  },
  AREA_INVALID_HIERARCHY: {
    title: 'Địa bàn Ấp/Xã/Tỉnh không khớp quan hệ phân cấp',
    suggestion: 'Vui lòng chọn lại theo đúng thứ tự Tỉnh -> Xã -> Ấp.',
  },
  AREA_IN_USE: {
    title: 'Không thể xóa Ấp đang được sử dụng trong hồ sơ thành viên hoặc tài sản',
    suggestion: 'Ấp đã gắn với hồ sơ nghiệp vụ không được xóa khỏi danh mục.',
  },

  // Lãi suất & Bảng giá
  INTEREST_RATE_CONFIG_NOT_FOUND: {
    title: 'Không tìm thấy cấu hình bảng lãi suất',
    suggestion: 'Vui lòng kiểm tra danh mục Bảng lãi suất.',
  },
  ASSET_PRICING_RULE_NOT_FOUND: {
    title: 'Không tìm thấy đơn giá cho loại đất đã chọn',
    suggestion: 'Chọn loại đất khác hoặc cập nhật Danh mục bảng giá tài sản.',
  },
};

export function getFriendlyError(errorCode?: string, fallbackMessage?: string): FriendlyErrorMeta {
  if (errorCode && ERROR_CODE_META[errorCode]) {
    return ERROR_CODE_META[errorCode];
  }
  return {
    title: fallbackMessage || 'Đã xảy ra lỗi khi xử lý yêu cầu',
    suggestion: 'Vui lòng kiểm tra lại thông tin và thử lại.',
  };
}

