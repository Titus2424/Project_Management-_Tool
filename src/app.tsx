import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

import Layout from '@/pages/_layout';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/system/error-boundary';
import { CurrentUserRoleProvider } from '@/contexts/current-user-role-context';

import HomePage from '@/pages/index';
import NotFoundPage from '@/pages/not-found';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <Toaster richColors />
          <CurrentUserRoleProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Router>
          </CurrentUserRoleProvider>
        </JotaiProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
