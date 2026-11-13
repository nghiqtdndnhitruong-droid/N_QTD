-- ============================================================
-- HỆ THỐNG QUẢN LÝ TÍN DỤNG N_QTD - THƯ VIỆN TỪ KHÓA MẪU WORD
-- Tự động rà soát và lưu trữ từ khóa thực tế đang được sử dụng
-- Tổng số từ khóa: 161
-- Thời gian xuất: 2026-11-11T01:16:27.718Z
-- ============================================================

DROP TABLE IF EXISTS global_word_keywords;
CREATE TABLE IF NOT EXISTS global_word_keywords (
  id VARCHAR(24) PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL UNIQUE,
  displayName VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  dataPath VARCHAR(255) NOT NULL,
  dataType VARCHAR(50) NOT NULL DEFAULT 'TEXT',
  formatPattern VARCHAR(50),
  defaultValue VARCHAR(255) DEFAULT '...................',
  isList BOOLEAN DEFAULT FALSE,
  itemProperties TEXT,
  description TEXT,
  isSystem BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af3b94453527b2f528ba388', 'CAN_BO.HO_TEN', 'Họ và tên cán bộ đang đăng nhập (CAN_BO.HO_TEN)', 'CAN_BO', 'CAN_BO.HO_TEN', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-11T00:39:32.744Z', '2026-11-11T00:39:32.744Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af3b94453527b2f528ba38a', 'CAN_BO.LOAI_GIAY_TO', 'Loại giấy tờ cán bộ (CAN_BO.LOAI_GIAY_TO)', 'CAN_BO', 'CAN_BO.LOAI_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-11T00:39:32.755Z', '2026-11-11T00:39:32.755Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af3b94453527b2f528ba38c', 'CAN_BO.NGAY_CAP', 'Ngày cấp giấy tờ cán bộ (CAN_BO.NGAY_CAP)', 'CAN_BO', 'CAN_BO.NGAY_CAP', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-11T00:39:32.767Z', '2026-11-11T00:39:32.767Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af3b94453527b2f528ba38d', 'CAN_BO.NOI_CAP', 'Nơi cấp giấy tờ cán bộ (CAN_BO.NOI_CAP)', 'CAN_BO', 'CAN_BO.NOI_CAP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-11T00:39:32.773Z', '2026-11-11T00:39:32.773Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af3b94453527b2f528ba38f', 'CAN_BO.SO_GIAY_TO', 'Số giấy tờ / CCCD cán bộ (CAN_BO.SO_GIAY_TO)', 'CAN_BO', 'CAN_BO.SO_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-11T00:39:32.784Z', '2026-11-11T00:39:32.784Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a3b', 'DANH_SACH_DINH_GIA', 'Danh sách định giá tài sản khoản vay (viết ngắn gọn)', 'KHOAN_VAY', 'DANH_SACH_DINH_GIA', 'LIST', NULL, '...................', TRUE, '{"ID":"id","LOAI_DINH_GIA":"valuationTypeLabel","NGAY_DINH_GIA":"valuationDateFormatted","SO_TO":"sheetNumber","SO_THUA":"plotNumber","DIEN_TICH":"areaFormatted","DIEN_TICH_SO":"area","DIEN_TICH_THUC_TE":"actualAreaFormatted","DIEN_TICH_THUC_TE_SO":"actualArea","DON_GIA":"pricePerSqMeterFormatted","DON_GIA_SO":"pricePerSqMeter","GIA_TIEN_TRUOC_LAM_TRON":"totalPriceBeforeRoundFormatted","GIA_TIEN_TRUOC_LAM_TRON_SO":"totalPriceBeforeRound","GIA_TIEN":"totalPriceFormatted","GIA_TIEN_SO":"totalPrice","GIA_TIEN_CHU":"totalPriceWords","GHI_CHU":"notes","SO_LUONG_TAI_SAN":"collateralCount","LA_NGHI_DINH_QUY":"isTheoNghiDinhQuy","LA_NGHI_DINH_QUY_CU":"isTheoNghiDinhQuyCu","LA_GIA_THI_TRUONG":"isTheoGiaThiTruong","LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY":"isTheoGiaThiTruongVaNghiDinhQuy","DANH_SACH_TAI_SAN":"collateralsList"}', NULL, TRUE, '2026-11-04T08:08:06.658Z', '2026-11-06T02:13:42.593Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebf161e958a70988202eb1', 'DON_GIA_THI_TRUONG', 'Đơn giá định giá theo thị trường (rút gọn)', 'KHOAN_VAY', 'loan.DON_GIA_THI_TRUONG', 'CURRENCY', NULL, '230.000đ', FALSE, NULL, NULL, TRUE, '2026-11-05T03:00:49.263Z', '2026-11-06T02:13:42.692Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f65541192', 'IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP', 'Kiểm tra số khế ước có giống số HĐ thế chấp không (True/False)', 'KHOAN_VAY', 'loan.isSoKheUocGiongSoHdTheChap', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.643Z', '2026-11-06T02:13:42.576Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea839f8d125f5e0771391a', 'IS_TRUNG_HAN', 'Kiểm tra khoản vay là trung hạn hay không (True/False)', 'KHOAN_VAY', 'isTrungHan', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T01:00:15.481Z', '2026-11-06T02:13:42.364Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a44', 'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG', 'Có định giá Theo giá thị trường (True/False)', 'KHOAN_VAY', 'loan.hasValuationTheoGiaThiTruong', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T08:08:06.716Z', '2026-11-06T02:13:42.674Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a45', 'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY', 'Có định giá Theo giá thị trường và theo nghị định Quỹ (True/False)', 'KHOAN_VAY', 'loan.hasValuationTheoGiaThiTruongVaNghiDinhQuy', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T08:08:06.722Z', '2026-11-06T02:13:42.681Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a42', 'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY', 'Có định giá Theo nghị định Quỹ (True/False)', 'KHOAN_VAY', 'loan.hasValuationTheoNghiDinhQuy', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T08:08:06.705Z', '2026-11-06T02:13:42.662Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a43', 'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY_CU', 'Có định giá Theo nghị định Quỹ (Cũ) (True/False)', 'KHOAN_VAY', 'loan.hasValuationTheoNghiDinhQuyCu', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T08:08:06.711Z', '2026-11-06T02:13:42.668Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebe25efc00dfa322e02b1c', 'KHOAN_VAY.CO_NGUOI_THUA_KE', 'Khoản vay có người thừa kế (True/False)', 'KHOAN_VAY', 'KHOAN_VAY.CO_NGUOI_THUA_KE', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T01:56:46.353Z', '2026-11-06T02:13:43.517Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a3a', 'KHOAN_VAY.DANH_SACH_DINH_GIA', 'Danh sách định giá tài sản khoản vay (Khối lặp FOR)', 'KHOAN_VAY', 'KHOAN_VAY.DANH_SACH_DINH_GIA', 'LIST', NULL, '...................', TRUE, '{"ID":"id","LOAI_DINH_GIA":"valuationTypeLabel","NGAY_DINH_GIA":"valuationDateFormatted","SO_TO":"sheetNumber","SO_THUA":"plotNumber","DIEN_TICH":"areaFormatted","DIEN_TICH_SO":"area","DIEN_TICH_THUC_TE":"actualAreaFormatted","DIEN_TICH_THUC_TE_SO":"actualArea","DON_GIA":"pricePerSqMeterFormatted","DON_GIA_SO":"pricePerSqMeter","GIA_TIEN_TRUOC_LAM_TRON":"totalPriceBeforeRoundFormatted","GIA_TIEN_TRUOC_LAM_TRON_SO":"totalPriceBeforeRound","GIA_TIEN":"totalPriceFormatted","GIA_TIEN_SO":"totalPrice","GIA_TIEN_CHU":"totalPriceWords","GHI_CHU":"notes","SO_LUONG_TAI_SAN":"collateralCount","LA_NGHI_DINH_QUY":"isTheoNghiDinhQuy","LA_NGHI_DINH_QUY_CU":"isTheoNghiDinhQuyCu","LA_GIA_THI_TRUONG":"isTheoGiaThiTruong","LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY":"isTheoGiaThiTruongVaNghiDinhQuy","DANH_SACH_TAI_SAN":"collateralsList"}', NULL, TRUE, '2026-11-04T08:08:06.650Z', '2026-11-06T02:13:42.587Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aead4cdcca23ff6688b4b1d', 'KHOAN_VAY.DANH_XUNG', 'Danh xưng khoản vay / chủ tài sản (ví dụ: Ông: Lê Văn A hoặc Ông (Bà): Nguyễn A + Nguyễn Thị B)', 'KHOAN_VAY', 'loan.DANH_XUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T06:46:37.126Z', '2026-11-06T02:13:42.447Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebf161e958a70988202eb0', 'KHOAN_VAY.DON_GIA_THI_TRUONG', 'Đơn giá định giá theo thị trường (ví dụ: 230.000đ)', 'KHOAN_VAY', 'loan.DON_GIA_THI_TRUONG', 'CURRENCY', NULL, '230.000đ', FALSE, NULL, NULL, TRUE, '2026-11-05T03:00:49.254Z', '2026-11-06T02:13:42.686Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f65541191', 'KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP', 'Kiểm tra số khế ước có giống số HĐ thế chấp không (True/False)', 'KHOAN_VAY', 'loan.isSoKheUocGiongSoHdTheChap', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.635Z', '2026-11-06T02:13:42.570Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea839f8d125f5e0771391d', 'KHOAN_VAY.IS_TRUNG_HAN', 'Khoản vay là trung hạn (Đối tượng, True/False)', 'KHOAN_VAY', 'isTrungHan', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T01:00:15.504Z', '2026-11-06T02:13:42.382Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f6554118d', 'KHOAN_VAY.NGAY_CAP_KHE_UOC', 'Ngày cấp khế ước nhận nợ (KHOAN_VAY.NGAY_CAP_KHE_UOC)', 'KHOAN_VAY', 'loan.contractDate', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.601Z', '2026-11-06T02:13:42.545Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829cc', 'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NAM', 'Năm chứng thực ủy ban (KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NAM)', 'KHOAN_VAY', 'mortgage.committeeAuthDateYear', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.274Z', '2026-11-10T07:47:08.274Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829ca', 'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NGAY', 'Ngày chứng thực ủy ban (KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NGAY)', 'KHOAN_VAY', 'mortgage.committeeAuthDateDay', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.261Z', '2026-11-10T07:47:08.261Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829cb', 'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_THANG', 'Tháng chứng thực ủy ban (KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_THANG)', 'KHOAN_VAY', 'mortgage.committeeAuthDateMonth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.268Z', '2026-11-10T07:47:08.268Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeae7e6e8685682ad2b8a3e', 'KHOAN_VAY.NGAY_DINH_GIA', 'Ngày định giá duy nhất của khoản vay (KHOAN_VAY.NGAY_DINH_GIA)', 'KHOAN_VAY', 'KHOAN_VAY.NGAY_DINH_GIA', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T08:08:06.678Z', '2026-11-06T02:13:42.610Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f6554118f', 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP', 'Số hợp đồng thế chấp (KHOAN_VAY.SO_HOP_DONG_THE_CHAP)', 'KHOAN_VAY', 'mortgage.contractNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.616Z', '2026-11-06T02:13:42.559Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62086', 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NAM', 'Năm của số hợp đồng thế chấp (KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NAM)', 'KHOAN_VAY', 'loan.soHdTheChapNam', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.916Z', '2026-11-06T02:13:42.507Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebee878e262c93c5c79203', 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_SO', 'Số cuối của số hợp đồng thế chấp (KHOAN_VAY.SO_HOP_DONG_THE_CHAP_SO, ví dụ: 020)', 'KHOAN_VAY', 'loan.soHdTheChapSo', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:48:39.275Z', '2026-11-06T02:13:42.533Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62088', 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_THANG', 'Tháng của số hợp đồng thế chấp (KHOAN_VAY.SO_HOP_DONG_THE_CHAP_THANG)', 'KHOAN_VAY', 'loan.soHdTheChapThang', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.929Z', '2026-11-06T02:13:42.517Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f6554118b', 'KHOAN_VAY.SO_KHE_UOC', 'Số khế ước nhận nợ (KHOAN_VAY.SO_KHE_UOC)', 'KHOAN_VAY', 'loan.contractNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.585Z', '2026-11-06T02:13:42.453Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62080', 'KHOAN_VAY.SO_KHE_UOC_NAM', 'Năm của số khế ước nhận nợ (KHOAN_VAY.SO_KHE_UOC_NAM, ví dụ: 26 hoặc 2026)', 'KHOAN_VAY', 'loan.soKheUocNam', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.871Z', '2026-11-06T02:13:42.463Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebee878e262c93c5c79201', 'KHOAN_VAY.SO_KHE_UOC_SO', 'Số cuối của số khế ước nhận nợ (KHOAN_VAY.SO_KHE_UOC_SO, ví dụ: 020)', 'KHOAN_VAY', 'loan.soKheUocSo', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:48:39.255Z', '2026-11-06T02:13:42.495Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62082', 'KHOAN_VAY.SO_KHE_UOC_THANG', 'Tháng của số khế ước nhận nợ (KHOAN_VAY.SO_KHE_UOC_THANG, ví dụ: 11)', 'KHOAN_VAY', 'loan.soKheUocThang', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.886Z', '2026-11-06T02:13:42.474Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c249', 'KHOAN_VAY.SO_TIEN_CHU', 'Số tiền vay bằng chữ', 'KHOAN_VAY', 'loan.loanAmountWords', 'CURRENCY_WORDS', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.517Z', '2026-11-06T02:13:42.419Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c247', 'KHOAN_VAY.SO_TIEN_SO', 'Số tiền vay bằng số (VND)', 'KHOAN_VAY', 'loan.loanAmount', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.505Z', '2026-11-06T02:13:42.407Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f6554118e', 'NGAY_CAP_KHE_UOC', 'Ngày cấp khế ước nhận nợ (NGAY_CAP_KHE_UOC)', 'KHOAN_VAY', 'loan.contractDate', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.609Z', '2026-11-06T02:13:42.551Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829c9', 'NGAY_CHUNG_THUC_UY_BAN_NAM', 'Ngày chứng thực ủy ban (chỉ số năm, ví dụ: 2026)', 'KHOAN_VAY', 'mortgage.committeeAuthDateYear', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.255Z', '2026-11-10T07:47:08.255Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829c7', 'NGAY_CHUNG_THUC_UY_BAN_NGAY', 'Ngày chứng thực ủy ban (chỉ số ngày, ví dụ: 20)', 'KHOAN_VAY', 'mortgage.committeeAuthDateDay', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.242Z', '2026-11-10T07:47:08.242Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2cbfc4d6885ae96d829c8', 'NGAY_CHUNG_THUC_UY_BAN_THANG', 'Ngày chứng thực ủy ban (chỉ số tháng, ví dụ: 05)', 'KHOAN_VAY', 'mortgage.committeeAuthDateMonth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:47:08.249Z', '2026-11-10T07:47:08.249Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f65541190', 'SO_HOP_DONG_THE_CHAP', 'Số hợp đồng thế chấp (SO_HOP_DONG_THE_CHAP)', 'KHOAN_VAY', 'mortgage.contractNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.624Z', '2026-11-06T02:13:42.565Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62087', 'SO_HOP_DONG_THE_CHAP_NAM', 'Năm của số hợp đồng thế chấp (SO_HOP_DONG_THE_CHAP_NAM)', 'KHOAN_VAY', 'loan.soHdTheChapNam', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.922Z', '2026-11-06T02:13:42.513Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebee878e262c93c5c79204', 'SO_HOP_DONG_THE_CHAP_SO', 'Số cuối của số hợp đồng thế chấp (SO_HOP_DONG_THE_CHAP_SO)', 'KHOAN_VAY', 'loan.soHdTheChapSo', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:48:39.282Z', '2026-11-06T02:13:42.540Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62089', 'SO_HOP_DONG_THE_CHAP_THANG', 'Tháng của số hợp đồng thế chấp (SO_HOP_DONG_THE_CHAP_THANG)', 'KHOAN_VAY', 'loan.soHdTheChapThang', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.936Z', '2026-11-06T02:13:42.521Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aeadb1f6a179c8f6554118c', 'SO_KHE_UOC', 'Số khế ước nhận nợ (SO_KHE_UOC)', 'KHOAN_VAY', 'loan.contractNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T07:13:35.595Z', '2026-11-06T02:13:42.458Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62081', 'SO_KHE_UOC_NAM', 'Năm của số khế ước nhận nợ (SO_KHE_UOC_NAM)', 'KHOAN_VAY', 'loan.soKheUocNam', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.879Z', '2026-11-06T02:13:42.469Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebee878e262c93c5c79202', 'SO_KHE_UOC_SO', 'Số cuối của số khế ước nhận nợ (SO_KHE_UOC_SO)', 'KHOAN_VAY', 'loan.soKheUocSo', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:48:39.264Z', '2026-11-06T02:13:42.501Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebed903cbbdac99dc62083', 'SO_KHE_UOC_THANG', 'Tháng của số khế ước nhận nợ (SO_KHE_UOC_THANG)', 'KHOAN_VAY', 'loan.soKheUocThang', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T02:44:32.894Z', '2026-11-06T02:13:42.479Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c248', 'SO_TIEN_CHU', 'Số tiền vay bằng chữ', 'KHOAN_VAY', 'loan.loanAmountWords', 'CURRENCY_WORDS', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.511Z', '2026-11-06T02:13:42.413Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c246', 'SO_TIEN_SO', 'Số tiền vay bằng số (VND)', 'KHOAN_VAY', 'loan.loanAmount', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.498Z', '2026-11-06T02:13:42.400Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c256', 'DANH_SACH_NGUOI_LIEN_QUAN', 'Danh sách người liên quan (Khối lặp FOR)', 'NGUOI_LIEN_QUAN', 'relatedPersons', 'LIST', NULL, '...................', TRUE, '{"STT":"index","HO_TEN":"fullName","DANH_XUNG":"genderTitle","XUNG_HO":"genderTitle","GIOI_TINH":"gender","NAM_SINH":"yearOfBirth","LOAI_GIAY_TO":"idType","SO_GIAY_TO":"idNumber","SO_CCCD":"idNumber","NGAY_CAP":"idIssueDate","NGAY_CAP_CCCD":"idIssueDate","NOI_CAP":"idIssuePlace","NOI_CAP_CCCD":"idIssuePlace","QUAN_HE":"relationship","QUAN_HE_NGUOI_VAY":"relationship","VON_VAY":"creditFundLoan","VON_VAY_QTD":"creditFundLoan","VON_VAY_QUY_TIN_DUNG":"creditFundLoan","SO_DIEN_THOAI":"phoneNumber","DIA_CHI":"address"}', NULL, TRUE, '2026-11-03T01:51:03.591Z', '2026-11-06T02:13:43.750Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebfc3d4a1057dff63c754a', 'KHOAN_VAY.DANH_SACH_NGUOI_LIEN_QUAN', 'Danh sách người liên quan (Khoản vay)', 'NGUOI_LIEN_QUAN', 'KHOAN_VAY.DANH_SACH_NGUOI_LIEN_QUAN', 'LIST', NULL, '...................', TRUE, '{"STT":"index","HO_TEN":"fullName","DANH_XUNG":"genderTitle","XUNG_HO":"genderTitle","GIOI_TINH":"gender","NAM_SINH":"yearOfBirth","LOAI_GIAY_TO":"idType","SO_GIAY_TO":"idNumber","SO_CCCD":"idNumber","NGAY_CAP":"idIssueDate","NGAY_CAP_CCCD":"idIssueDate","NOI_CAP":"idIssuePlace","NOI_CAP_CCCD":"idIssuePlace","QUAN_HE":"relationship","QUAN_HE_NGUOI_VAY":"relationship","VON_VAY":"creditFundLoan","VON_VAY_QTD":"creditFundLoan","VON_VAY_QUY_TIN_DUNG":"creditFundLoan","SO_DIEN_THOAI":"phoneNumber","DIA_CHI":"address"}', NULL, TRUE, '2026-11-05T03:47:09.738Z', '2026-11-06T02:13:43.756Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c254', 'CO_NGUOI_THUA_KE', 'Hồ sơ có người thừa kế hay không (True/False)', 'NGUOI_THUA_KE', 'CO_NGUOI_THUA_KE', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.581Z', '2026-11-06T02:13:43.504Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d6d', 'NGUOI_THUA_KE.DANH_XUNG', 'Danh xưng người thừa kế (Ông/Bà)', 'NGUOI_THUA_KE', 'heir.genderTitle', 'GENDER_TITLE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.161Z', '2026-11-06T02:13:43.547Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae945460783f9f1d613850b', 'NGUOI_THUA_KE.DIA_CHI', 'Địa chỉ người thừa kế', 'NGUOI_THUA_KE', 'heir.address', 'TEXT', NULL, '..................................................', FALSE, NULL, NULL, FALSE, '2026-11-03T02:21:58.937Z', '2026-11-06T02:13:43.720Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae944dc0783f9f1d6138509', 'NGUOI_THUA_KE.HO_TEN', 'Họ và tên người thừa kế', 'NGUOI_THUA_KE', 'heir.fullName', 'TEXT', NULL, '..........................', FALSE, NULL, NULL, FALSE, '2026-11-03T02:20:12.930Z', '2026-11-06T02:13:43.587Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae992f043cba261befbea15', 'NGUOI_THUA_KE.LOAI_GIAY_TO', 'Loại giấy tờ người thừa kế (Căn cước / CCCD / CMND)', 'NGUOI_THUA_KE', 'heir.idType', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T07:53:20.895Z', '2026-11-06T02:13:43.611Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d73', 'NGUOI_THUA_KE.NAM_SINH', 'Năm sinh người thừa kế', 'NGUOI_THUA_KE', 'heir.yearOfBirth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.207Z', '2026-11-06T02:13:43.599Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d76', 'NGUOI_THUA_KE.NGAY_CAP', 'Ngày cấp giấy tờ người thừa kế', 'NGUOI_THUA_KE', 'heir.idIssueDate', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.234Z', '2026-11-06T02:13:43.650Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d78', 'NGUOI_THUA_KE.NOI_CAP', 'Nơi cấp giấy tờ người thừa kế', 'NGUOI_THUA_KE', 'heir.idIssuePlace', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.250Z', '2026-11-06T02:13:43.676Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae9451b0783f9f1d613850a', 'NGUOI_THUA_KE.QUAN_HE', 'Quan hệ người thừa kế với người vay', 'NGUOI_THUA_KE', 'heir.relationship', 'TEXT', NULL, '.......................', FALSE, NULL, NULL, FALSE, '2026-11-03T02:21:15.082Z', '2026-11-06T02:13:43.702Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d74', 'NGUOI_THUA_KE.SO_GIAY_TO', 'Số giấy tờ người thừa kế', 'NGUOI_THUA_KE', 'heir.idNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.217Z', '2026-11-06T02:13:43.624Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c22d', 'DANH_XUNG', 'Danh xưng người vay (Ông/Bà)', 'NGUOI_VAY', 'member.genderTitle', 'GENDER_TITLE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.350Z', '2026-11-06T02:13:42.174Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c23b', 'DIA_CHI', 'Địa chỉ thường trú đầy đủ', 'NGUOI_VAY', 'member.address', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.433Z', '2026-11-06T02:13:42.308Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c22b', 'HO_TEN_NGUOI_VAY', 'Họ và tên người vay', 'NGUOI_VAY', 'member.fullName', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.334Z', '2026-11-06T02:13:42.163Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d15', 'LOAI_GIAY_TO', 'Loại giấy tờ người vay (Căn cước công dân / Thẻ căn cước)', 'NGUOI_VAY', 'member.idType', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.449Z', '2026-11-06T02:13:42.209Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c23d', 'MA_THANH_VIEN', 'Mã thành viên Quỹ', 'NGUOI_VAY', 'member.memberCode', 'TEXT', NULL, 'TV................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.445Z', '2026-11-06T02:13:42.318Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c231', 'NAM_SINH', 'Năm sinh người vay', 'NGUOI_VAY', 'member.yearOfBirth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.373Z', '2026-11-06T02:13:42.198Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c22e', 'NGUOI_VAY.DANH_XUNG', 'Danh xưng người vay (Ông/Bà)', 'NGUOI_VAY', 'member.genderTitle', 'GENDER_TITLE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.356Z', '2026-11-06T02:13:42.179Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c23c', 'NGUOI_VAY.DIA_CHI', 'Địa chỉ thường trú đầy đủ', 'NGUOI_VAY', 'member.address', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.438Z', '2026-11-06T02:13:42.313Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c22c', 'NGUOI_VAY.HO_TEN', 'Họ và tên người vay (Đối tượng)', 'NGUOI_VAY', 'member.fullName', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.344Z', '2026-11-06T02:13:42.169Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae99049cf1dfb458cc26b7a', 'NGUOI_VAY.LOAI_GIAY_TO', 'Loại giấy tờ người vay (Căn cước công dân / Thẻ căn cước)', 'NGUOI_VAY', 'member.idType', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-03T07:42:01.210Z', '2026-11-06T02:13:42.223Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c232', 'NGUOI_VAY.NAM_SINH', 'Năm sinh người vay', 'NGUOI_VAY', 'member.yearOfBirth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T01:51:03.379Z', '2026-11-06T02:13:42.203Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d19', 'NGUOI_VAY.NGAY_CAP', 'Ngày cấp giấy tờ người vay', 'NGUOI_VAY', 'member.idIssueDate', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.487Z', '2026-11-06T02:13:42.270Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d1a', 'NGUOI_VAY.NOI_CAP', 'Nơi cấp giấy tờ người vay', 'NGUOI_VAY', 'member.idIssuePlace', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.497Z', '2026-11-06T02:13:42.291Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d17', 'NGUOI_VAY.SO_GIAY_TO', 'Số giấy tờ người vay', 'NGUOI_VAY', 'member.idNumber', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.467Z', '2026-11-06T02:13:42.243Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d3b', 'DANH_SACH_CHI_PHI', 'Danh sách chi phí phương án (phẳng, Khối lặp FOR / Bảng Word)', 'PHUONG_AN', 'DANH_SACH_CHI_PHI', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN":"name","TEN_CHI_PHI":"name","TEN_KHOAN_CHI":"name","KHOAN_CHI":"name","NOI_DUNG":"name","MUC_CHI":"name","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T00:22:36.768Z', '2026-11-06T02:13:42.880Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d3f', 'DANH_SACH_NGUON_THU', 'Danh sách nguồn thu phương án (phẳng, Khối lặp FOR / Bảng Word)', 'PHUONG_AN', 'DANH_SACH_NGUON_THU', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN":"name","TEN_NGUON_THU":"name","TEN_KHOAN_THU":"name","KHOAN_THU":"name","NGUON_THU":"name","NOI_DUNG":"name","MUC_THU":"name","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T00:22:36.794Z', '2026-11-06T02:13:42.928Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea839f8d125f5e0771391e', 'DANH_SACH_THU_NHAP', 'Danh sách thu nhập phương án (Khối lặp FOR / Bảng Word)', 'PHUONG_AN', 'DANH_SACH_THU_NHAP', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN_THU_NHAP":"TEN_THU_NHAP","TEN":"TEN_THU_NHAP","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T01:00:15.576Z', '2026-11-06T02:13:42.898Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d3a', 'PHUONG_AN.DANH_SACH_CHI_PHI', 'Danh sách chi phí phương án (Khối lặp FOR / Bảng Word)', 'PHUONG_AN', 'DANH_SACH_CHI_PHI', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN":"name","TEN_CHI_PHI":"name","TEN_KHOAN_CHI":"name","KHOAN_CHI":"name","NOI_DUNG":"name","MUC_CHI":"name","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T00:22:36.761Z', '2026-11-06T02:13:42.874Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d3e', 'PHUONG_AN.DANH_SACH_NGUON_THU', 'Danh sách nguồn thu phương án (Khối lặp FOR / Bảng Word)', 'PHUONG_AN', 'DANH_SACH_NGUON_THU', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN":"name","TEN_NGUON_THU":"name","TEN_KHOAN_THU":"name","KHOAN_THU":"name","NGUON_THU":"name","NOI_DUNG":"name","MUC_THU":"name","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T00:22:36.788Z', '2026-11-06T02:13:42.922Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea839f8d125f5e0771391f', 'PHUONG_AN.DANH_SACH_THU_NHAP', 'Danh sách thu nhập phương án (tiền tố PHUONG_AN, Khối lặp FOR)', 'PHUONG_AN', 'DANH_SACH_THU_NHAP', 'LIST', NULL, '...................', TRUE, '{"STT":"index","TEN_THU_NHAP":"TEN_THU_NHAP","TEN":"TEN_THU_NHAP","SO_TIEN":"amount","SO_TIEN_SO":"amount","SO_TIEN_CHU":"amountWords","GHI_CHU":"notes"}', NULL, TRUE, '2026-11-04T01:00:15.585Z', '2026-11-06T02:13:42.904Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d38', 'PHUONG_AN.LOI_NHUAN', 'Lợi nhuận phương án vay bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.LOI_NHUAN', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.746Z', '2026-11-06T02:13:42.863Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d1b', 'PHUONG_AN.MUC_DICH', 'Mục đích vay vốn (Phương án)', 'PHUONG_AN', 'PHUONG_AN.MUC_DICH', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.532Z', '2026-11-06T02:13:42.698Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d1e', 'PHUONG_AN.THOI_HAN_VAY', 'Thời hạn vay (có chữ tháng)', 'PHUONG_AN', 'PHUONG_AN.THOI_HAN_VAY', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.555Z', '2026-11-06T02:13:42.718Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d33', 'PHUONG_AN.TONG_CHI_PHI', 'Tổng chi phí phương án bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.TONG_CHI_PHI', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.712Z', '2026-11-06T02:13:42.834Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d37', 'PHUONG_AN.TONG_NGUON_THU', 'Tổng nguồn thu phương án bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.TONG_NGUON_THU', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.740Z', '2026-11-06T02:13:42.858Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d22', 'PHUONG_AN.TONG_NHU_CAU_VON', 'Tổng nhu cầu vốn bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.TONG_NHU_CAU_VON', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.590Z', '2026-11-06T02:13:42.740Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d27', 'PHUONG_AN.VON_TU_CO', 'Vốn tự có bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.VON_TU_CO', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.627Z', '2026-11-06T02:13:42.768Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d31', 'PHUONG_AN.VON_VAY', 'Vốn vay đề nghị bằng số (VND)', 'PHUONG_AN', 'PHUONG_AN.VON_VAY', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.698Z', '2026-11-06T02:13:42.823Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae98f0ccf1dfb458cc26b69', 'NAM', 'Năm làm hồ sơ (4 chữ số)', 'KHOAN_VAY', 'loan.applicationDateYear', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-03T07:36:44.732Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae98ee3cf1dfb458cc26b67', 'NGAY', 'Ngày làm hồ sơ (2 chữ số)', 'KHOAN_VAY', 'loan.applicationDateDay', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-03T07:36:03.421Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae98efdcf1dfb458cc26b68', 'THANG', 'Tháng làm hồ sơ (2 chữ số)', 'KHOAN_VAY', 'loan.applicationDateMonth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-03T07:36:29.927Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af100000000000000000001', 'NGAY_HIEN_TAI', 'Ngày hiện tại (2 chữ số, thời điểm xuất)', 'QUY_TIN_DUNG', 'fund.currentDay', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-13T01:45:00.000Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af100000000000000000002', 'THANG_HIEN_TAI', 'Tháng hiện tại (2 chữ số, thời điểm xuất)', 'QUY_TIN_DUNG', 'fund.currentMonth', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-13T01:45:00.000Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af100000000000000000003', 'NAM_HIEN_TAI', 'Năm hiện tại (4 chữ số, thời điểm xuất)', 'QUY_TIN_DUNG', 'fund.currentYear', 'TEXT', NULL, '...................', FALSE, NULL, NULL, FALSE, '2026-11-13T01:45:00.000Z', '2026-11-13T01:45:00.000Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4e', 'CHU_SO_HUU.DIA_CHI', 'Địa chỉ chủ sở hữu tài sản', 'TAI_SAN', 'CHU_SO_HUU.DIA_CHI', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.943Z', '2026-11-06T02:13:43.218Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d48', 'CHU_SO_HUU.HO_TEN', 'Họ tên chủ sở hữu tài sản', 'TAI_SAN', 'CHU_SO_HUU.HO_TEN', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.895Z', '2026-11-06T02:13:43.179Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4a', 'CHU_SO_HUU.LOAI_GIAY_TO', 'Loại giấy tờ chủ sở hữu', 'TAI_SAN', 'CHU_SO_HUU.LOAI_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.910Z', '2026-11-06T02:13:43.193Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4c', 'CHU_SO_HUU.NGAY_CAP', 'Ngày cấp giấy tờ chủ sở hữu', 'TAI_SAN', 'CHU_SO_HUU.NGAY_CAP', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.926Z', '2026-11-06T02:13:43.205Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4d', 'CHU_SO_HUU.NOI_CAP', 'Nơi cấp giấy tờ chủ sở hữu', 'TAI_SAN', 'CHU_SO_HUU.NOI_CAP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.936Z', '2026-11-06T02:13:43.212Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4b', 'CHU_SO_HUU.SO_GIAY_TO', 'Số giấy tờ tùy thân (CCCD) chủ sở hữu', 'TAI_SAN', 'CHU_SO_HUU.SO_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.919Z', '2026-11-06T02:13:43.199Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2bf5131480155318935c8', 'CHU_SO_HUU_1.DANH_XUNG', 'Danh xưng chủ sở hữu thứ nhất (Ông/Bà/Hộ Ông/Hộ Bà)', 'TAI_SAN', 'CHU_SO_HUU_1.DANH_XUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T06:53:05.890Z', '2026-11-10T06:53:05.890Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2bf5131480155318935d0', 'CHU_SO_HUU_1.DIA_CHI', 'Địa chỉ chủ sở hữu thứ nhất', 'TAI_SAN', 'CHU_SO_HUU_1.DIA_CHI', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T06:53:05.961Z', '2026-11-10T06:53:05.961Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af26aa54727967749645220', 'CHU_SO_HUU_1.HO_TEN', 'Họ tên chủ sở hữu thứ nhất', 'TAI_SAN', 'CHU_SO_HUU_1.HO_TEN', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T00:51:49.406Z', '2026-11-10T00:51:49.406Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2c255b1d38574da9e6c5e', 'CHU_SO_HUU_1.HO_TEN_IN_HOA', 'Họ tên chủ sở hữu thứ nhất (viết in hoa)', 'TAI_SAN', 'CHU_SO_HUU_1.HO_TEN_IN_HOA', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:05:57.316Z', '2026-11-10T07:05:57.316Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2bf5231480155318935db', 'CHU_SO_HUU_2.DANH_XUNG', 'Danh xưng chủ sở hữu thứ hai (Ông/Bà)', 'TAI_SAN', 'CHU_SO_HUU_2.DANH_XUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T06:53:06.034Z', '2026-11-10T06:53:06.034Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af26aa54727967749645222', 'CHU_SO_HUU_2.HO_TEN', 'Họ tên chủ sở hữu thứ hai', 'TAI_SAN', 'CHU_SO_HUU_2.HO_TEN', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T00:51:49.435Z', '2026-11-10T00:51:49.435Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af2c255b1d38574da9e6c61', 'CHU_SO_HUU_2.HO_TEN_IN_HOA', 'Họ tên chủ sở hữu thứ hai (viết in hoa)', 'TAI_SAN', 'CHU_SO_HUU_2.HO_TEN_IN_HOA', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T07:05:57.333Z', '2026-11-10T07:05:57.333Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d55', 'CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU', 'Cờ điều kiện: Cả người vay và người thừa kế đều là chủ sở hữu (True/False)', 'TAI_SAN', 'CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:36.990Z', '2026-11-06T02:13:43.288Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af26aa5472796774964522b', 'CO_CHU_SO_HUU_2', 'Khoản vay có 2 người cùng sở hữu tài sản (True/False)', 'TAI_SAN', 'CO_CHU_SO_HUU_2', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-10T00:51:49.487Z', '2026-11-10T00:51:49.487Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af13bc1f7cebc95ed1e0530', 'CO_TRONG_NHOM_1', 'Địa chỉ/Tài sản thuộc Nhóm 1 (CO_TRONG_NHOM_1)', 'TAI_SAN', 'flatVariables.CO_TRONG_NHOM_1', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-09T03:19:29.570Z', '2026-11-09T03:19:29.570Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6af13bc1f7cebc95ed1e0531', 'CO_TRONG_NHOM_2', 'Địa chỉ/Tài sản thuộc Nhóm 2 (CO_TRONG_NHOM_2)', 'TAI_SAN', 'flatVariables.CO_TRONG_NHOM_2', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-09T03:19:29.600Z', '2026-11-09T03:19:29.600Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acc2f933f233a369d4f', 'DANH_SACH_CHU_SO_HUU', 'Danh sách chủ sở hữu tài sản (Khối lặp FOR)', 'TAI_SAN', 'uniqueOwners', 'TEXT', NULL, '...................', TRUE, '{"STT":"index","HO_TEN":"fullName","XUNG_HO":"genderTitle","DANH_XUNG":"genderTitle","LOAI_GIAY_TO":"idType","SO_GIAY_TO":"idNumber","SO_CCCD":"idNumber","NGAY_CAP":"idIssueDate","NOI_CAP":"idIssuePlace","DIA_CHI":"address","NAM_SINH":"yearOfBirth","QUAN_HE":"relationship"}', NULL, TRUE, '2026-11-04T00:22:36.951Z', '2026-11-06T02:13:43.224Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed31123fc1a4c608085c38', 'DANH_SACH_CHU_SO_HUU_VA_THUA_KE', 'Danh sách chủ sở hữu kèm người thừa kế/người vay (Khối lặp FOR)', 'TAI_SAN', 'extendedOwners', 'TEXT', NULL, '...................', TRUE, '{"STT":"index","HO_TEN":"fullName","XUNG_HO":"genderTitle","DANH_XUNG":"genderTitle","LOAI_GIAY_TO":"idType","SO_GIAY_TO":"idNumber","SO_CCCD":"idNumber","NGAY_CAP":"idIssueDate","NOI_CAP":"idIssuePlace","DIA_CHI":"address","NAM_SINH":"yearOfBirth","QUAN_HE":"relationship"}', NULL, TRUE, '2026-11-06T01:44:50.744Z', '2026-11-06T02:13:43.236Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae93e07e9a33e6e5ab2c253', 'DANH_SACH_TAI_SAN', 'Danh sách tài sản thế chấp (Khối lặp FOR)', 'TAI_SAN', 'collaterals', 'LIST', NULL, '...................', TRUE, '{"MA_TAI_SAN":"assetCode","TEN_TAI_SAN":"assetName","LOAI_TAI_SAN":"assetType","LOAI_GIAY_CHUNG_NHAN":"certificateType","SO_VAO_SO_CAP_GCN":"certificateClause","CAU_SO_VAO_SO_GCN":"certificateClause","SO_GCN":"certificateNumber","SO_PHAT_HANH_GCN":"certificateNumber","NGAY_CAP_GCN":"issueDate","NOI_CAP_GCN":"issuePlace","SO_THUA":"landLotNumber","TO_BAN_DO":"mapSheetNumber","DIEN_TICH":"landArea","MUC_DICH_SU_DUNG":"usagePurpose","THOI_HAN_SU_DUNG":"usageDuration","HINH_THUC_SU_DUNG":"usageForm","HAN_CHE_SU_DUNG":"useRestrictions","GIA_TRI_DINH_GIA":"appraisedValue","CHU_SO_HUU":"ownerName","DANH_SACH_CHU_SO_HUU":"owners"}', NULL, TRUE, '2026-11-03T01:51:03.574Z', '2026-11-06T02:13:43.078Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d60', 'HAN_CHE_SU_DUNG', 'Hạn chế sử dụng đất (phẳng, tài sản đầu tiên)', 'TAI_SAN', 'TAI_SAN.HAN_CHE_SU_DUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.067Z', '2026-11-06T02:13:43.390Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5c', 'HAN_CHE_SU_DUNG_GOP', 'Hạn chế sử dụng đất gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.HAN_CHE_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.041Z', '2026-11-06T02:13:43.366Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5e', 'HINH_THUC_SU_DUNG', 'Hình thức sử dụng đất (phẳng, tài sản đầu tiên)', 'TAI_SAN', 'TAI_SAN.HINH_THUC_SU_DUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.055Z', '2026-11-06T02:13:43.378Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5a', 'HINH_THUC_SU_DUNG_GOP', 'Hình thức sử dụng đất gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.HINH_THUC_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.029Z', '2026-11-06T02:13:43.354Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d6a', 'LOAI_VA_SO_GCN_GOP', 'Loại và Số GCN gộp (phẳng, nối dấu ,)', 'TAI_SAN', 'TAI_SAN.SO_VAO_SO_CAP_GCN_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.135Z', '2026-11-06T02:13:43.456Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d15', 'MA_TAI_SAN_GOP', 'Mã tài sản gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.MA_TAI_SAN_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.478Z', '2026-11-06T02:13:43.090Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d57', 'MUC_DICH_SU_DUNG_GOP', 'Mục đích sử dụng đất gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.MUC_DICH_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.007Z', '2026-11-06T02:13:43.331Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea93f987f34bb6227ba494', 'SO_LUONG_TAI_SAN', 'Tổng số lượng tài sản (SO_LUONG_TAI_SAN)', 'TAI_SAN', 'collaterals_summary.totalCount', 'NUMBER', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T02:10:01.573Z', '2026-11-06T02:13:42.999Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d1a', 'SO_THUA_GOP', 'Số thửa đất gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.SO_THUA_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.513Z', '2026-11-06T02:13:43.120Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d1c', 'SO_TO_GOP', 'Số tờ bản đồ gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.SO_TO_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.527Z', '2026-11-06T02:13:43.133Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aebe25efc00dfa322e02b1e', 'TAI_SAN.CO_NGUOI_THUA_KE', 'Tài sản có người thừa kế đứng tên (True/False)', 'TAI_SAN', 'TAI_SAN.CO_NGUOI_THUA_KE', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-05T01:56:46.367Z', '2026-11-06T02:13:43.529Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fce', 'TAI_SAN.CO_THANH_VIEN_HO', 'Tài sản có thành viên hộ (TAI_SAN.*)', 'TAI_SAN', 'nested.collateral.hasHouseholdMembers', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.147Z', '2026-11-06T02:13:43.960Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d1f', 'TAI_SAN.DIA_CHI_GOP', 'Địa chỉ tài sản gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.DIA_CHI_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.547Z', '2026-11-06T02:13:43.152Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5f', 'TAI_SAN.HAN_CHE_SU_DUNG', 'Hạn chế sử dụng đất (Tài sản đầu tiên)', 'TAI_SAN', 'TAI_SAN.HAN_CHE_SU_DUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.061Z', '2026-11-06T02:13:43.384Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5b', 'TAI_SAN.HAN_CHE_SU_DUNG_GOP', 'Hạn chế sử dụng đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.HAN_CHE_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.036Z', '2026-11-06T02:13:43.360Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d5d', 'TAI_SAN.HINH_THUC_SU_DUNG', 'Hình thức sử dụng đất (Tài sản đầu tiên)', 'TAI_SAN', 'TAI_SAN.HINH_THUC_SU_DUNG', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.048Z', '2026-11-06T02:13:43.372Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d59', 'TAI_SAN.HINH_THUC_SU_DUNG_GOP', 'Hình thức sử dụng đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.HINH_THUC_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.022Z', '2026-11-06T02:13:43.348Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d27', 'TAI_SAN.LOAI_TAI_SAN_GOP', 'Loại tài sản gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.LOAI_TAI_SAN_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.600Z', '2026-11-06T02:13:43.475Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d69', 'TAI_SAN.LOAI_VA_SO_GCN_GOP', 'Loại và Số GCN gộp (nối dấu ,)', 'TAI_SAN', 'TAI_SAN.SO_VAO_SO_CAP_GCN_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.127Z', '2026-11-06T02:13:43.449Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d14', 'TAI_SAN.MA_TAI_SAN_GOP', 'Mã tài sản gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.MA_TAI_SAN_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.470Z', '2026-11-06T02:13:43.084Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d25', 'TAI_SAN.MUC_DICH_SU_DUNG_GOP', 'Mục đích sử dụng đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.MUC_DICH_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.588Z', '2026-11-06T02:13:43.324Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d23', 'TAI_SAN.NGAY_CAP_GOP', 'Ngày cấp GCN gộp (dd/mm/yyyy, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.NGAY_CAP_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.575Z', '2026-11-06T02:13:43.313Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d28', 'TAI_SAN.NGUON_GOC_GOP', 'Nguồn gốc đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.NGUON_GOC_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.607Z', '2026-11-06T02:13:43.482Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d24', 'TAI_SAN.NOI_CAP_GOP', 'Nơi cấp GCN gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.NOI_CAP_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.581Z', '2026-11-06T02:13:43.318Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea93f987f34bb6227ba492', 'TAI_SAN.SO_LUONG_TAI_SAN', 'Tổng số lượng tài sản (TAI_SAN.SO_LUONG_TAI_SAN)', 'TAI_SAN', 'collaterals_summary.totalCount', 'NUMBER', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T02:10:01.559Z', '2026-11-06T02:13:42.981Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d19', 'TAI_SAN.SO_THUA_GOP', 'Số thửa đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.SO_THUA_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.507Z', '2026-11-06T02:13:43.114Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d1b', 'TAI_SAN.SO_TO_GOP', 'Số tờ bản đồ gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.SO_TO_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.520Z', '2026-11-06T02:13:43.126Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae997f05313b4c6cd563d26', 'TAI_SAN.THOI_HAN_SU_DUNG_GOP', 'Thời hạn sử dụng đất gộp (nối dấu ;)', 'TAI_SAN', 'TAI_SAN.THOI_HAN_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:14:40.594Z', '2026-11-06T02:13:43.337Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae99a061e708e1ae2f7d548', 'TAI_SAN.TONG_DIEN_TICH', 'Tổng diện tích tất cả tài sản (TAI_SAN.TONG_DIEN_TICH)', 'TAI_SAN', 'collaterals_summary.totalArea', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:23:34.478Z', '2026-11-06T02:13:43.016Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae99a061e708e1ae2f7d549', 'TAI_SAN.TONG_DIEN_TICH_CHU', 'Tổng diện tích tất cả tài sản bằng chữ (TAI_SAN.TONG_DIEN_TICH_CHU)', 'TAI_SAN', 'collaterals_summary.totalAreaWords', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:23:34.484Z', '2026-11-06T02:13:43.023Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed4175fc48e7110f61ffab', 'TAI_SAN.TONG_DINH_GIA_70', '70% tổng định giá tài sản có đuôi đ (TAI_SAN.TONG_DINH_GIA_70)', 'TAI_SAN', 'TAI_SAN.TONG_DINH_GIA_70', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:54:45.572Z', '2026-11-06T02:54:45.572Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed4175fc48e7110f61ffad', 'TAI_SAN.TONG_DINH_GIA_70_CHU', '70% tổng định giá tài sản bằng chữ (TAI_SAN.TONG_DINH_GIA_70_CHU)', 'TAI_SAN', 'TAI_SAN.TONG_DINH_GIA_70_CHU', 'CURRENCY_WORDS', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:54:45.582Z', '2026-11-06T02:54:45.582Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea8e179e12fa489791efcb', 'TAI_SAN.TONG_GIA_TRI_DINH_GIA', 'Tổng giá trị định giá tất cả tài sản (TAI_SAN.TONG_GIA_TRI_DINH_GIA)', 'TAI_SAN', 'TAI_SAN.TONG_DINH_GIA', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T01:44:55.587Z', '2026-11-06T02:13:43.041Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea8e179e12fa489791efcc', 'TAI_SAN.TONG_GIA_TRI_DINH_GIA_CHU', 'Tổng giá trị định giá tất cả tài sản bằng chữ (TAI_SAN.TONG_GIA_TRI_DINH_GIA_CHU)', 'TAI_SAN', 'TAI_SAN.TONG_DINH_GIA_CHU', 'CURRENCY_WORDS', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T01:44:55.594Z', '2026-11-06T02:13:43.047Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aea7acd2f933f233a369d58', 'THOI_HAN_SU_DUNG_GOP', 'Thời hạn sử dụng đất gộp (phẳng, nối dấu ;)', 'TAI_SAN', 'TAI_SAN.THOI_HAN_SU_DUNG_GOP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-04T00:22:37.016Z', '2026-11-06T02:13:43.343Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae99a061e708e1ae2f7d546', 'TONG_DIEN_TICH', 'Tổng diện tích đất của tất cả tài sản (m²)', 'TAI_SAN', 'collaterals_summary.totalArea', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:23:34.460Z', '2026-11-06T02:13:43.004Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6ae99a061e708e1ae2f7d547', 'TONG_DIEN_TICH_CHU', 'Tổng diện tích đất của tất cả tài sản bằng chữ', 'TAI_SAN', 'collaterals_summary.totalAreaWords', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-03T08:23:34.469Z', '2026-11-06T02:13:43.010Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed4175fc48e7110f61ffae', 'TONG_DINH_GIA_70', '70% tổng định giá tài sản có đuôi đ (TONG_DINH_GIA_70)', 'TAI_SAN', 'TONG_DINH_GIA_70', 'CURRENCY', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:54:45.587Z', '2026-11-06T02:54:45.587Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed4175fc48e7110f61ffb0', 'TONG_DINH_GIA_70_CHU', '70% tổng định giá tài sản bằng chữ (TONG_DINH_GIA_70_CHU)', 'TAI_SAN', 'TONG_DINH_GIA_70_CHU', 'CURRENCY_WORDS', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:54:45.597Z', '2026-11-06T02:54:45.597Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fcc', 'CO_THANH_VIEN_HO', 'Khoản vay có thành viên hộ gia đình (True/False)', 'THANH_VIEN_HO', 'flatVariables.CO_THANH_VIEN_HO', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.138Z', '2026-11-06T02:13:43.949Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fcf', 'DANH_SACH_THANH_VIEN_HO', 'Danh sách thành viên hộ gia đình (Khối lặp FOR/Bảng)', 'THANH_VIEN_HO', 'lists.DANH_SACH_THANH_VIEN_HO', 'LIST', NULL, '...................', TRUE, '{"STT":"index","HO_TEN":"fullName","DANH_XUNG":"genderTitle","XUNG_HO":"genderTitle","GIOI_TINH":"gender","NAM_SINH":"yearOfBirth","LOAI_GIAY_TO":"idType","SO_GIAY_TO":"idNumber","SO_CCCD":"idNumber","NGAY_CAP":"idIssueDate","NOI_CAP":"idIssuePlace","DIA_CHI":"address"}', NULL, TRUE, '2026-11-06T02:13:42.154Z', '2026-11-06T02:13:43.967Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fcd', 'KHOAN_VAY.CO_THANH_VIEN_HO', 'Khoản vay có thành viên hộ (KHOAN_VAY.*)', 'THANH_VIEN_HO', 'nested.loan.hasHouseholdMembers', 'BOOLEAN', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.142Z', '2026-11-06T02:13:43.954Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fb7', 'THANH_VIEN_HO.DANH_XUNG', 'Danh xưng thành viên hộ (Ông/Bà)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.DANH_XUNG', 'GENDER_TITLE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.030Z', '2026-11-06T02:13:43.826Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fc0', 'THANH_VIEN_HO.DIA_CHI', 'Địa chỉ thường trú thành viên hộ (người đầu tiên)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.DIA_CHI', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.077Z', '2026-11-06T02:13:43.880Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fb6', 'THANH_VIEN_HO.HO_TEN', 'Họ tên thành viên hộ (người đầu tiên)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.HO_TEN', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.024Z', '2026-11-06T02:13:43.819Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fbd', 'THANH_VIEN_HO.LOAI_GIAY_TO', 'Loại giấy tờ thành viên hộ (Căn cước / CCCD)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.LOAI_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.062Z', '2026-11-06T02:13:43.862Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fba', 'THANH_VIEN_HO.NAM_SINH', 'Năm sinh thành viên hộ (4 chữ số)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.NAM_SINH', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.045Z', '2026-11-06T02:13:43.844Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fbe', 'THANH_VIEN_HO.NGAY_CAP', 'Ngày cấp giấy tờ thành viên hộ (DD/MM/YYYY)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.NGAY_CAP', 'DATE', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.067Z', '2026-11-06T02:13:43.868Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fbf', 'THANH_VIEN_HO.NOI_CAP', 'Nơi cấp giấy tờ thành viên hộ', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.NOI_CAP', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.073Z', '2026-11-06T02:13:43.874Z'
);
INSERT INTO global_word_keywords (id, keyword, displayName, category, dataPath, dataType, formatPattern, defaultValue, isList, itemProperties, description, isSystem, createdAt, updatedAt) VALUES (
  '6aed37d651ca44eda6e81fbc', 'THANH_VIEN_HO.SO_GIAY_TO', 'Số giấy tờ thành viên hộ (alias)', 'THANH_VIEN_HO', 'nested.THANH_VIEN_HO.SO_GIAY_TO', 'TEXT', NULL, '...................', FALSE, NULL, NULL, TRUE, '2026-11-06T02:13:42.056Z', '2026-11-06T02:13:43.856Z'
);
