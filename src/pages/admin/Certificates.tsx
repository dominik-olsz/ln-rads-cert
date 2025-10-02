import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  user_id: string;
  course_id: string;
  test_attempt_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  courses: {
    title: string;
  };
  test_attempts: {
    score: number;
  };
}

const AdminCertificates = () => {
  const { loading: authLoading } = useAdminAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      fetchCertificates();
    }
  }, [authLoading]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses(title),
          test_attempts(score)
        `)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const certificatesWithProfiles = await Promise.all(
        (data || []).map(async (cert) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', cert.user_id)
            .single();
            
          return {
            ...cert,
            profiles: profile || { full_name: 'Unknown', email: '' }
          };
        })
      );
      
      setCertificates(certificatesWithProfiles as Certificate[]);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch certificates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificate: Certificate) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId: certificate.test_attempt_id }
      });

      if (error) throw error;

      // Create a blob from the HTML and trigger download
      const htmlContent = data.html;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate.certificate_number}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Certificate downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to download certificate',
        variant: 'destructive',
      });
    }
  };

  const viewCertificate = async (certificate: Certificate) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId: certificate.test_attempt_id }
      });

      if (error) throw error;

      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data.html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error viewing certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to view certificate',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
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
          <div>
            <h1 className="text-4xl font-bold">Certificate Management</h1>
            <p className="text-muted-foreground mt-2">
              Total Certificates Issued: <span className="font-semibold">{certificates.length}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generated Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No certificates generated yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate Number</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{cert.profiles?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{cert.courses?.title || 'LN-RADS Certification'}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">{cert.test_attempts?.score}%</span>
                      </TableCell>
                      <TableCell>
                        {new Date(cert.issued_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => viewCertificate(cert)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadCertificate(cert)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
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

export default AdminCertificates;
