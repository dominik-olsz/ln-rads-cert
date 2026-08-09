import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, CheckCircle, XCircle, Award, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortKey = 'student' | 'email' | 'course' | 'score' | 'status' | 'attempts' | 'date';

interface TestAttempt {
  id: string;
  user_id: string;
  score: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  is_certification_test: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
  courses: {
    title: string;
  } | null;
  hasCertificate?: boolean;
}

const AdminTestAttempts = () => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const { toast } = useToast();




  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          user_id,
          score,
          passed,
          started_at,
          completed_at,
          is_certification_test,
          courses (
            title
          )
        `)
        .eq('is_certification_test', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Check for existing certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('test_attempt_id')
        .in('test_attempt_id', (data || []).map(a => a.id));

      const certificatesSet = new Set(certificates?.map(c => c.test_attempt_id) || []);

      const attemptsWithProfiles = (data || []).map(attempt => ({
        ...attempt,
        profiles: profilesMap.get(attempt.user_id) || { full_name: 'Unknown', email: 'N/A' },
        hasCertificate: certificatesSet.has(attempt.id)
      }));

      setAttempts(attemptsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch test attempts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
    
  }, []);


  const resetUserAttempts = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset all certification attempts for ${userName}? This will delete their test attempts, certificates, and allow them to retake the certification test.`)) {
      return;
    }

    try {
      // Delete certification test progress first (due to foreign key constraint)
      const { error: progressError } = await supabase
        .from('certification_test_progress')
        .delete()
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Delete certificates associated with certification test attempts for this user
      const { error: certsError } = await supabase
        .from('certificates')
        .delete()
        .eq('user_id', userId);

      if (certsError) throw certsError;

      // Then delete all certification test attempts for this user
      const { error: attemptsError } = await supabase
        .from('test_attempts')
        .delete()
        .eq('user_id', userId)
        .eq('is_certification_test', true);

      if (attemptsError) throw attemptsError;

      toast({
        title: 'Success',
        description: `Certification attempts and certificates reset for ${userName}`,
      });

      fetchAttempts();
    } catch (error: any) {
      console.error('Error resetting attempts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset attempts',
        variant: 'destructive',
      });
    }
  };

  const issueCertificate = async (attempt: TestAttempt) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId: attempt.id }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Certificate issued for ${attempt.profiles?.full_name}`,
      });

      fetchAttempts();
    } catch (error: any) {
      console.error('Error issuing certificate:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue certificate',
        variant: 'destructive',
      });
    }
  };

  const checkIfCertificateExists = async (attemptId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('certificates')
      .select('id')
      .eq('test_attempt_id', attemptId)
      .maybeSingle();
    
    return !!data;
  };

  const getUserAttemptCount = (userId: string) => {
    return attempts.filter(a => a.user_id === userId).length;
  };

  const toggleSort = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const sortValue = (a: TestAttempt, key: SortKey): string | number => {
    switch (key) {
      case 'student': return (a.profiles?.full_name || '').toLowerCase();
      case 'email': return (a.profiles?.email || '').toLowerCase();
      case 'course': return (a.courses?.title || '').toLowerCase();
      case 'score': return a.score;
      case 'status': return a.passed ? 1 : 0;
      case 'attempts': return getUserAttemptCount(a.user_id);
      case 'date': return new Date(a.completed_at || 0).getTime();
    }
  };

  const term = search.trim().toLowerCase();
  const visibleAttempts = attempts
    .filter(a =>
      !term ||
      (a.profiles?.full_name || '').toLowerCase().includes(term) ||
      (a.profiles?.email || '').toLowerCase().includes(term) ||
      (a.courses?.title || '').toLowerCase().includes(term)
    )
    .sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1);
    });

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {sort.key === sortKey ? (
          sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Certification Test Attempts</h1>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Retake Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Attempt limits and retake prices are set per course in the course editor
              (Admin → Courses → edit a course → Basic Info → Certification Attempts). When a
              student runs out of attempts they must contact cert@lnrads.com and you can reset
              their attempts below.
            </p>
          </CardContent>
        </Card>




        <Card>
          <CardHeader>
            <CardTitle>All Certification Test Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No certification test attempts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">
                        {attempt.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{attempt.profiles?.email || 'N/A'}</TableCell>
                      <TableCell>{attempt.courses?.title || '—'}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{attempt.score}%</span>
                      </TableCell>
                      <TableCell>
                        {attempt.passed ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Passed
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getUserAttemptCount(attempt.user_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {attempt.passed && (
                            <Button
                              variant={attempt.hasCertificate ? "secondary" : "default"}
                              size="sm"
                              onClick={() => issueCertificate(attempt)}
                              disabled={attempt.hasCertificate}
                            >
                              <Award className="h-4 w-4 mr-2" />
                              {attempt.hasCertificate ? 'Certificate Issued' : 'Issue Certificate'}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetUserAttempts(attempt.user_id, attempt.profiles?.full_name || 'this user')}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset Attempts
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminTestAttempts;
