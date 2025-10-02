import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, ClipboardCheck, Award } from 'lucide-react';

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
    { title: 'Test Attempts', value: stats.totalTests, icon: ClipboardCheck, link: '/admin/tests' },
    { title: 'Certificates Issued', value: stats.totalCertificates, icon: Award, link: '/admin/users' },
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <Link to="/admin/tests">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Certification Test Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage test questions and view test analytics
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
