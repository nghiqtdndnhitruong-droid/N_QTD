import { app } from './app';
import { env, logger, connectDatabase, disconnectDatabase } from './config';
import { authService } from './modules/auth/auth.service';
import { areaService } from './modules/area/area.service';
import { globalWordKeywordService } from './modules/word-template/global-word-keyword.service';

async function bootstrap() {
  try {
    // 1. Kết nối cơ sở dữ liệu MongoDB
    await connectDatabase();

    // 1.1 Khởi tạo tài khoản Admin an toàn (nếu chưa có)
    await authService.seedDefaultAdmin();

    // 1.2 Tự động khởi tạo Địa bàn mặc định & Thư viện từ khóa chuẩn (nếu DB rỗng)
    await areaService.ensureDefaultAreas();
    await globalWordKeywordService.seedDefaultCatalog(false);

    // 2. Khởi động Web Server
    const server = app.listen(env.port, () => {
      logger.info(`==================================================`);
      logger.info(`🚀 Hệ thống Quỹ Tín Dụng Nhân Dân - Backend Online`);
      logger.info(`📡 Server chạy tại: http://localhost:${env.port}`);
      logger.info(`📚 Swagger Docs:   http://localhost:${env.port}/api-docs`);
      logger.info(`🩺 Health Check:   http://localhost:${env.port}/health`);
      logger.info(`🌍 Môi trường:    ${env.nodeEnv}`);
      logger.info(`==================================================`);
    });

    // 3. Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Nhận tín hiệu ${signal}. Đang đóng hệ thống an toàn...`);
      server.close(async () => {
        logger.info('HTTP server đã đóng');
        await disconnectDatabase();
        process.exit(0);
      });

      // Buộc tắt sau 10s nếu chưa đóng kịp
      setTimeout(() => {
        logger.error('Quá thời gian chờ shutdown, buộc dừng tiến trình!');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Khởi động server thất bại:', error);
    process.exit(1);
  }
}

bootstrap();

