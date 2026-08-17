import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, ClipboardCheck, Award, Receipt, Ticket, ScrollText } from 'lucide-react';
import FaqManager from '@/components/admin/FaqManager';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalTests: 0,
    totalCertificates: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [users, courses, tests, certificates] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('test_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalCourses: courses.count || 0,
        totalTests: tests.count || 0,
        totalCertificates: certificates.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, link: '/admin/users' },
    { title: 'Total Courses', value: stats.totalCourses, icon: BookOpen, link: '/admin/courses' },
    { title: 'Test Attempts', value: stats.totalTests, icon: ClipboardCheck, link: '/admin/test-attempts' },
    { title: 'Certificates Issued', value: stats.totalCertificates, icon: Award, link: '/admin/certificates' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage users, assign roles, and view user progress
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/courses">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Course Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create, edit, and manage courses and lessons
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/sales">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Sales &amp; Invoices</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View buyers, download or print invoices, and issue refunds
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/discount-codes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Discount Codes</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate single-use discount codes and track redemptions
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/legal">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Legal Pages</CardTitle>
                <ScrollText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Edit the Privacy Policy and Terms in English and Polish
                </p>
              </CardContent>
            </Card>
          </Link>

        </div>

        <div className="mt-8">
          <FaqManager />
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
