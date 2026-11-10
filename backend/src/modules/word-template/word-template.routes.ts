import { Router } from 'express';
import multer from 'multer';
import { wordTemplateController } from './word-template.controller';
import { AppError } from '../../shared/errors';
import { optionalAuthenticateToken } from '../../shared/middlewares';

const router = Router();

// Tự động nhận diện cán bộ đang đăng nhập (gán req.user nếu có Bearer token)
router.use(optionalAuthenticateToken);

// Cấu hình Multer upload vào MemoryBuffer để kiểm tra an toàn
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Tối đa 20MB
  },
  fileFilter: (_req, file, cb) => {
    // Chỉ chấp nhận file có đuôi .docx
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      return cb(new AppError('Chỉ chấp nhận file biểu mẫu Microsoft Word định dạng .docx', 400));
    }
    cb(null, true);
  },
});

// 1. Danh sách & Data sources
router.get('/', (req, res, next) => wordTemplateController.list(req, res, next));
router.get('/data-sources', (req, res, next) =>
  wordTemplateController.getDataSources(req, res, next),
);
router.get('/export-history', (req, res, next) =>
  wordTemplateController.getExportHistory(req, res, next),
);

// 2. Thư viện Từ khóa Toàn cục (Global Catalog)
router.get('/catalog', (req, res, next) => wordTemplateController.getCatalog(req, res, next));
router.post('/catalog', (req, res, next) =>
  wordTemplateController.createCatalogKeyword(req, res, next),
);
router.put('/catalog/:id', (req, res, next) =>
  wordTemplateController.updateCatalogKeyword(req, res, next),
);
router.delete('/catalog/:id', (req, res, next) =>
  wordTemplateController.deleteCatalogKeyword(req, res, next),
);

// 3. Upload mới
router.post('/upload', upload.single('file'), (req, res, next) =>
  wordTemplateController.uploadNew(req, res, next),
);

// 4. Xuất tài liệu khoản vay (Single hoặc Batch ZIP)
router.post('/export-loan', (req, res, next) =>
  wordTemplateController.exportLoan(req, res, next),
);

// Sắp xếp thứ tự hiển thị các mẫu template
router.put('/reorder', (req, res, next) => wordTemplateController.reorder(req, res, next));

// 5. Chi tiết, chỉnh sửa & phiên bản
router.get('/:id', (req, res, next) => wordTemplateController.getById(req, res, next));
router.put('/:id', (req, res, next) => wordTemplateController.update(req, res, next));
router.delete('/:id', (req, res, next) => wordTemplateController.delete(req, res, next));
router.get('/:id/download', (req, res, next) =>
  wordTemplateController.downloadOriginal(req, res, next),
);
router.put('/:id/mappings', (req, res, next) =>
  wordTemplateController.saveMappings(req, res, next),
);
router.post('/:id/preview', (req, res, next) =>
  wordTemplateController.preview(req, res, next),
);
router.post('/:id/validate-syntax', (req, res, next) =>
  wordTemplateController.validateSyntax(req, res, next),
);
router.post('/:id/versions', upload.single('file'), (req, res, next) =>
  wordTemplateController.uploadVersion(req, res, next),
);

export const wordTemplateRoutes = router;

