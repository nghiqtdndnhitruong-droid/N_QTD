import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, swaggerSpec, logger } from './config';
import { errorHandler } from './shared/middlewares';
import { AppError } from './shared/errors';
import { memberRoutes } from './modules/member/member.routes';
import { interestRateRoutes } from './modules/interest-rate/interest-rate.routes';
import { assetPricingRoutes } from './modules/asset-pricing/asset-pricing.routes';
import { loanRoutes } from './modules/loan/loan.routes';
import { collateralRoutes } from './modules/collateral/collateral.routes';
import { disbursementRoutes } from './modules/disbursement/disbursement.routes';
import { repaymentRoutes } from './modules/repayment/repayment.routes';
import { areaRoutes } from './modules/area/area.routes';
import { wordTemplateRoutes } from './modules/word-template/word-template.routes';

const app: Application = express();

// 1. Bảo mật HTTP headers
app.use(helmet());

// 2. CORS
app.use(cors());

// 3. Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Logging HTTP requests
const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// 5. API Documentation với Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root path: Tự động chuyển hướng hoặc hiển thị thông tin chào mừng
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// 6. Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// 7. Mount Modules RESTful API Routes
const apiRouter = express.Router();
apiRouter.use('/members', memberRoutes);
apiRouter.use('/interest-rates', interestRateRoutes);
apiRouter.use('/asset-pricing-rules', assetPricingRoutes);
apiRouter.use('/loans', loanRoutes);
apiRouter.use('/collaterals', collateralRoutes);
apiRouter.use('/disbursements', disbursementRoutes);
apiRouter.use('/repayments', repaymentRoutes);
apiRouter.use('/areas', areaRoutes);
apiRouter.use('/word-templates', wordTemplateRoutes);

app.use(env.apiPrefix, apiRouter);

// 8. Handle 404 Route Not Found
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(AppError.notFound(`Không tìm thấy đường dẫn: [${req.method}] ${req.originalUrl}`));
});

// 9. Centralized Error Handler
app.use(errorHandler);

export { app };
