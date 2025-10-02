import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";


import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Training from "./pages/Training";
import Test from "./pages/Test";
import CertificationTest from "./pages/CertificationTest";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCourses from "./pages/admin/Courses";
import AdminTests from "./pages/admin/Tests";
import AdminTestAttempts from "./pages/admin/TestAttempts";
import CourseBuilder from "./pages/admin/CourseBuilder";
import AdminCertificates from "./pages/admin/Certificates";
import Dashboard from "./pages/Dashboard";



const App = () => (
  <AuthProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/training/:courseId" element={<Training />} />
        <Route path="/test" element={<Test />} />
        <Route path="/certification-test" element={<CertificationTest />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
        <Route path="/admin/courses/:courseId" element={<AdminRoute><CourseBuilder /></AdminRoute>} />
        <Route path="/admin/tests" element={<AdminRoute><AdminTests /></AdminRoute>} />
        <Route path="/admin/test-attempts" element={<AdminRoute><AdminTestAttempts /></AdminRoute>} />
        <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;

