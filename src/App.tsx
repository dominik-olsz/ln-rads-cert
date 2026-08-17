import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";


import { createBrowserRouter, RouterProvider, Outlet, type RouteObject } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./i18n";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import CookieBar from "./components/CookieBar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Training from "./pages/Training";
import Test from "./pages/Test";
import CertificationTest from "./pages/CertificationTest";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminDiscountCodes from "./pages/admin/DiscountCodes";
import AdminCourses from "./pages/admin/Courses";
import AdminTestAttempts from "./pages/admin/TestAttempts";
import CourseBuilder from "./pages/admin/CourseBuilder";
import AdminCertificates from "./pages/admin/Certificates";
import AdminSales from "./pages/admin/Sales";
import AdminLegal from "./pages/admin/Legal";

import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import Payments from "./pages/Payments";
import ResetPassword from "./pages/ResetPassword";
import AuthConfirm from "./pages/AuthConfirm";

import PaymentSuccess from "./pages/PaymentSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Unsubscribe from "./pages/Unsubscribe";

const Layout = () => (
  <LanguageProvider>
    <ScrollToTop />
    <Outlet />
    <Footer />
    <CookieBar />
  </LanguageProvider>
);

/**
 * Public + student routes, declared without a leading slash so the exact same
 * set can be mounted twice: once at "/" (English) and once at "/pl" (Polish).
 */
const localizedRoutes: RouteObject[] = [
  { index: true, element: <Index /> },
  { path: "auth", element: <Auth /> },
  { path: "auth/confirm", element: <AuthConfirm /> },
  { path: "reset-password", element: <ResetPassword /> },

  { path: "dashboard", element: <Dashboard /> },
  { path: "account", element: <Account /> },
  { path: "payments", element: <Payments /> },
  { path: "courses", element: <Courses /> },
  { path: "course/:id", element: <CourseDetail /> },
  { path: "payment-success", element: <PaymentSuccess /> },
  { path: "training/:courseId", element: <Training /> },
  { path: "test", element: <Test /> },
  { path: "certification-test", element: <CertificationTest /> },
  { path: "results", element: <Results /> },
  { path: "faq", element: <FAQ /> },
  { path: "privacy-policy", element: <PrivacyPolicy /> },
  { path: "terms", element: <Terms /> },
  { path: "unsubscribe", element: <Unsubscribe /> },
];

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      ...localizedRoutes,
      // Polish mirror of every public/student route.
      { path: "pl", children: localizedRoutes },

      { path: "/admin/dashboard", element: <AdminRoute><AdminDashboard /></AdminRoute> },
      { path: "/admin/users", element: <AdminRoute><AdminUsers /></AdminRoute> },
      { path: "/admin/discount-codes", element: <AdminRoute><AdminDiscountCodes /></AdminRoute> },
      { path: "/admin/courses", element: <AdminRoute><AdminCourses /></AdminRoute> },
      { path: "/admin/courses/:courseId", element: <AdminRoute><CourseBuilder /></AdminRoute> },
      { path: "/admin/test-attempts", element: <AdminRoute><AdminTestAttempts /></AdminRoute> },
      { path: "/admin/certificates", element: <AdminRoute><AdminCertificates /></AdminRoute> },
      { path: "/admin/sales", element: <AdminRoute><AdminSales /></AdminRoute> },
      { path: "/admin/legal", element: <AdminRoute><AdminLegal /></AdminRoute> },

      // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <AuthProvider>
    <Toaster />
    <Sonner />
    <RouterProvider router={router} />
  </AuthProvider>
);

export default App;
