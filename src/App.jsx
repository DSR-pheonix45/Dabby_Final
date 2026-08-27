import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import Maintenance from "./landing-page/pages/Maintenance";
import { AuthProvider } from "./context/AuthContext";
import { WorkbenchProvider } from "./context/WorkbenchContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./Auth/ProtectedRoute";
import { backendService } from "./services/backendService";

import ErrorBoundary from "./components/common/ErrorBoundary";

// Helper to auto-retry dynamic imports when new builds update asset hashes
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenRefreshed = window.sessionStorage.getItem("page_refreshed_for_chunk");
    try {
      const component = await componentImport();
      window.sessionStorage.setItem("page_refreshed_for_chunk", "false");
      return component;
    } catch (error) {
      console.error("Dynamic import failed, reloading to fetch updated build assets...", error);
      if (!pageHasBeenRefreshed || pageHasBeenRefreshed === "false") {
        window.sessionStorage.setItem("page_refreshed_for_chunk", "true");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

// Lazy Load Landing Page Components
const Home = lazyWithRetry(() => import("./landing-page/pages/Home"));
const Product = lazyWithRetry(() => import("./landing-page/pages/Product"));
const Templates = lazyWithRetry(() => import("./landing-page/pages/Templates"));
const InvoiceGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/InvoiceGenerator"));
const PurchaseOrderGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/PurchaseOrderGenerator"));
const QuotationGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/QuotationGenerator"));
const GSTInvoiceGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/GSTInvoiceGenerator"));
const DeliveryChallanGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/DeliveryChallanGenerator"));
const ProformaInvoiceGenerator = lazyWithRetry(() => import("./landing-page/pages/templates/ProformaInvoiceGenerator"));
const About = lazyWithRetry(() => import("./landing-page/pages/About"));
const Features = lazyWithRetry(() => import("./landing-page/pages/Features"));
const Documentation = lazyWithRetry(() => import("./landing-page/pages/Documentation"));
const HelpCenter = lazyWithRetry(() => import("./landing-page/pages/HelpCenter"));
const Blog = lazyWithRetry(() => import("./landing-page/pages/Blog"));
const Careers = lazyWithRetry(() => import("./landing-page/pages/Careers"));
const Integrations = lazyWithRetry(() => import("./landing-page/pages/Integrations"));
const Api = lazyWithRetry(() => import("./landing-page/pages/Api"));
const TermsOfService = lazyWithRetry(() => import("./landing-page/pages/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("./landing-page/pages/PrivacyPolicy"));
const PaymentComingSoon = lazyWithRetry(() => import("./landing-page/pages/PricingPage"));
const Pay = lazyWithRetry(() => import("./landing-page/pages/Pay"));
const Waitlist = lazyWithRetry(() => import("./landing-page/pages/Waitlist"));
const SuperadminDashboard = lazyWithRetry(() => import("./landing-page/pages/SuperadminDashboard"));
const Navbar = lazyWithRetry(() => import("./landing-page/components/Navbar"));
const Footer = lazyWithRetry(() => import("./landing-page/components/Footer"));

// Compliance and Security Pages
const CookiePolicy = lazyWithRetry(() => import("./landing-page/pages/CookiePolicy"));
const CookieBanner = lazyWithRetry(() => import("./landing-page/pages/CookiePolicy").then(m => ({ default: m.CookieBanner })));
const AiTransparency = lazyWithRetry(() => import("./landing-page/pages/AiTransparency"));
const ResponsibleAi = lazyWithRetry(() => import("./landing-page/pages/ResponsibleAi"));
const DataProcessingAddendum = lazyWithRetry(() => import("./landing-page/pages/DataProcessingAddendum"));
const DataRetentionPolicy = lazyWithRetry(() => import("./landing-page/pages/DataRetentionPolicy"));
const SecurityPage = lazyWithRetry(() => import("./landing-page/pages/Security"));

// Authentication Components
const Login = lazyWithRetry(() => import("./Auth/Login"));
const Signup = lazyWithRetry(() => import("./Auth/Signup"));
const OAuthCallback = lazyWithRetry(() => import("./Auth/OAuthCallback"));

// Protected Components
const MainApp = lazyWithRetry(() => import("./components/MainApp"));
const Settings = lazyWithRetry(() => import("./components/Settings/Settings"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const DataIngestionPage = lazyWithRetry(() => import("./pages/DataIngestion"));
const EmployeeExpensePortal = lazyWithRetry(() => import("./pages/EmployeeExpensePortal"));


// Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#81E6D9] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Wrapper for Landing Pages to apply specific Theme/Layout
function LandingLayout({ children }) {
  const { theme } = useTheme();
  // Ensure we are not in dashboard
  return (
    <div className={`min-h-screen font-dm-sans ${theme === "dark" ? "bg-black text-[#f8fafc]" : "bg-transparent text-[#111111]"}`}>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <CookieBanner />
      </Suspense>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

// Fallback: Detect hash fragment with access_token on root URL
// and redirect to /oauth/callback so the existing handler processes it.
// This catches edge cases where implicit flow is still triggered.
function HashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (
      location.pathname === '/' &&
      hash &&
      (hash.includes('access_token=') || hash.includes('refresh_token='))
    ) {
      // Redirect to OAuth callback with the hash preserved
      navigate(`/oauth/callback${hash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    // Log the page view event for analytics
    backendService.logPageView(location.pathname);
  }, [location]);
  return null;
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <WorkbenchProvider>
            <ThemeProvider>
              <ScrollToTop />
            <HashRedirect />
            <PageViewTracker />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Landing Pages with Persistent Layout */}
                <Route element={<LandingLayout><Outlet /></LandingLayout>}>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/onboarding" element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  } />
                  <Route path="/product" element={<Product />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/invoice" element={<InvoiceGenerator />} />
                  <Route path="/templates/purchase-order" element={<PurchaseOrderGenerator />} />
                  <Route path="/templates/quotation" element={<QuotationGenerator />} />
                  <Route path="/templates/gst-invoice" element={
                    <ProtectedRoute>
                      <GSTInvoiceGenerator />
                    </ProtectedRoute>
                  } />
                  <Route path="/templates/delivery-challan" element={<DeliveryChallanGenerator />} />
                  <Route path="/templates/proforma-invoice" element={<ProformaInvoiceGenerator />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/docs" element={<Documentation />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/api" element={<Api />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/pay" element={<Pay />} />
                  <Route path="/pricing" element={<PaymentComingSoon />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/ai-transparency" element={<AiTransparency />} />
                  <Route path="/responsible-ai" element={<ResponsibleAi />} />
                  <Route path="/dpa" element={<DataProcessingAddendum />} />
                  <Route path="/data-retention" element={<DataRetentionPolicy />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/waitlist" element={<Waitlist />} />
                  <Route path="/expense-claim" element={<EmployeeExpensePortal />} />
                  <Route path="/expense-claim/:workbenchId" element={<EmployeeExpensePortal />} />
                  <Route path="/ingest" element={
                    <ProtectedRoute>
                      <DataIngestionPage />
                    </ProtectedRoute>
                  } />
                </Route>
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route path="/superadmin" element={
                  <ProtectedRoute>
                    <SuperadminDashboard />
                  </ProtectedRoute>
                } />


                {/* Protected Dashboard Routes */}
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <ErrorBoundary>
                          <MainApp />
                        </ErrorBoundary>
                      </Suspense>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </ThemeProvider>
          </WorkbenchProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
