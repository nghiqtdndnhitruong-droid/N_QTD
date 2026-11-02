import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { env } from './config/env';
import { httpClient } from './lib/http';
import { App } from './app/App';
import './styles/index.css';

async function bootstrap() {
  if (import.meta.env.DEV && env.enableMock) {
    const { attachDevMockFallback } = await import('./mocks/dev-fallback');
    attachDevMockFallback(httpClient);
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();

