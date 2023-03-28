import { lazy, Suspense } from 'react'

import Footer from 'layouts/Footer'
import Header from 'layouts/Header'
import ErrorBoundary from 'layouts/shared/ErrorBoundary'
import NetworkErrorBoundary from 'layouts/shared/NetworkErrorBoundary'
import ToastNotifications from 'layouts/ToastNotifications'
import LogoSpinner from 'old_ui/LogoSpinner'
import { useTracking } from 'services/tracking'
import GlobalBanners from 'shared/GlobalBanners'

import { useUserAccessGate } from './hooks/useUserAccessGate'

const TermsOfService = lazy(() => import('pages/TermsOfService'))
const LimitedHeader = lazy(() => import('layouts/LimitedHeader'))

function BaseLayout({ children }) {
  const { isFullExperience, isLoading } = useUserAccessGate()

  useTracking()

  const fullPageLoader = (
    <div className="mt-16 flex flex-1 items-center justify-center">
      <LogoSpinner />
    </div>
  )

  // Pause rendering of a page till we know if the user is logged in or not
  if (isLoading) return fullPageLoader

  return (
    <>
      {isFullExperience ? (
        <Header />
      ) : (
        <Suspense fallback={null}>
          <LimitedHeader />
        </Suspense>
      )}
      <Suspense fallback={fullPageLoader}>
        <ErrorBoundary sentryScopes={[['layout', 'base']]}>
          <NetworkErrorBoundary>
            <main className="container mt-2 mb-8 flex grow flex-col gap-2 md:p-0">
              <GlobalBanners />
              {isFullExperience ? (
                children
              ) : (
                <Suspense fallback={null}>
                  <TermsOfService />
                </Suspense>
              )}
            </main>
          </NetworkErrorBoundary>
        </ErrorBoundary>
      </Suspense>
      {isFullExperience && (
        <>
          <Footer />
          <ToastNotifications />
        </>
      )}
    </>
  )
}

export default BaseLayout
