import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Award, Download, FileText, Percent, Plus, X } from 'lucide-react';

interface Props {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onDiscountSaved?: (userId: string, percent: number) => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  discount_percent: number | null;
  buyer_type: string | null;
  company_name: string | null;
  vat_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
}

const money = (cents: number | null | undefined) =>
  `€${(((cents ?? 0) as number) / 100).toFixed(2)}`;

// course_purchases.amount_paid is stored in whole euros; everything else in cents.
const euros = (amount: number | null | undefined) =>
  `€${Number(amount ?? 0).toFixed(2)}`;

const dateStr = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString() : '—';

const UserProfileSheet = ({ userId, onOpenChange, onDiscountSaved }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [retakes, setRetakes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [discountDraft, setDiscountDraft] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, role, c, cp, rp, ta, cert, inv] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
        supabase.from('courses').select('id, title, price').order('title'),
        supabase.from('course_purchases').select('*').eq('user_id', userId).order('purchased_at', { ascending: false }),
        supabase.from('certification_retake_purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase
          .from('test_attempts')
          .select('id, course_id, score, passed, completed_at, is_certification_test, courses(title)')
          .eq('user_id', userId)
          .eq('is_certification_test', true)
          .order('completed_at', { ascending: false }),
        supabase.from('certificates').select('*').eq('user_id', userId).order('issued_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('user_id', userId).order('issued_at', { ascending: false }),
      ]);

      setProfile((p.data as any) ?? null);
      setIsAdmin(!!role.data);
      setCourses(c.data ?? []);
      setPurchases(cp.data ?? []);
      setRetakes(rp.data ?? []);
      setAttempts(ta.data ?? []);
      setCertificates(cert.data ?? []);
      setInvoices(inv.data ?? []);
      setDiscountDraft(String((p.data as any)?.discount_percent ?? 0));
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const saveDiscount = async () => {
    if (!userId) return;
    const raw = Number(discountDraft);
    const percent = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ discount_percent: percent }).eq('id', userId);
    setBusy(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setProfile((prev) => (prev ? { ...prev, discount_percent: percent } : prev));
    onDiscountSaved?.(userId, percent);
    toast({ title: 'Saved', description: `Discount set to ${percent}%` });
  };

  const setAccess = async (courseId: string, action: 'grant' | 'revoke', wasPaid = false) => {
    if (!userId) return;
    if (action === 'grant' && !confirm('Grant access without payment? No charge is made and no invoice is issued.')) return;
    if (
      action === 'revoke' &&
      !confirm(
        wasPaid
          ? 'Remove access to this paid course? The purchase record is deleted (invoices are kept) and no refund is made automatically.'
          : 'Remove this manually granted access?',
      )
    )
      return;

    setBusy(true);
    const { error } = await supabase.functions.invoke('admin-course-access', {
      body: { userId, courseId, action },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: action === 'grant' ? 'Access granted' : 'Access removed' });
    load();
  };

  const downloadCertificate = async (attemptId: string, certificateNumber?: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId },
      });
      if (error) throw error;
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateNumber || attemptId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = async (invoice: any) => {
    setBusy(true);
    try {
      let path = invoice.pdf_path;
      if (!path) {
        const { data, error } = await supabase.functions.invoke('invoice-actions', {
          body: { invoiceId: invoice.id, action: 'regenerate' },
        });
        if (error) throw error;
        path = data?.pdf_path;
      }
      const { data: signed, error: signError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(path as string, 300);
      if (signError) throw signError;
      window.open(signed.signedUrl, '_blank');
    } catch (e) {
      toast({ title: 'Could not open invoice', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const purchaseFor = (courseId: string) => purchases.find((p) => p.course_id === courseId);
  const certificateForAttempt = (attemptId: string) =>
    certificates.find((c) => c.test_attempt_id === attemptId);
  const invoiceForPurchase = (type: 'course' | 'retake', id: string) =>
    invoices.find((i) =>
      type === 'course' ? i.course_purchase_id === id : i.retake_purchase_id === id,
    );

  return (
    <Sheet open={!!userId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {profile?.full_name || 'User profile'}
            {isAdmin && <Badge>Admin</Badge>}
          </SheetTitle>
          <SheetDescription>{profile?.email}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="certification">Certification</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Joined</span><div>{dateStr(profile?.created_at)}</div></div>
                <div><span className="text-muted-foreground">Buyer type</span><div className="capitalize">{profile?.buyer_type || 'private'}</div></div>
                <div><span className="text-muted-foreground">Company</span><div>{profile?.company_name || '—'}</div></div>
                <div><span className="text-muted-foreground">VAT ID</span><div>{profile?.vat_id || '—'}</div></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Address</span>
                  <div>
                    {[profile?.address_line1, profile?.address_line2, profile?.postal_code, profile?.city, profile?.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Personal discount</p>
                <div className="flex items-center gap-2">
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountDraft}
                      onChange={(e) => setDiscountDraft(e.target.value)}
                      className="pr-7"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Button size="sm" onClick={saveDiscount} disabled={busy}>Save</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-3 pt-4">
              {courses.length === 0 && <p className="text-sm text-muted-foreground">No courses yet.</p>}
              {courses.map((course) => {
                const purchase = purchaseFor(course.id);
                return (
                  <div key={course.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{course.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {purchase
                          ? `${purchase.granted_by_admin ? 'Granted by admin' : `Purchased ${dateStr(purchase.purchased_at)}`} · ${euros(purchase.amount_paid)}`
                          : 'No access'}
                      </div>
                    </div>
                    {purchase ? (
                      <div className="flex items-center gap-2">
                        {!purchase.granted_by_admin && <Badge variant="secondary">Paid</Badge>}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => setAccess(course.id, 'revoke', !purchase.granted_by_admin)}
                        >
                          <X className="h-4 w-4 mr-1" /> Remove access
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => setAccess(course.id, 'grant')}>
                        <Plus className="h-4 w-4 mr-1" /> Grant access
                      </Button>
                    )}

                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="certification" className="space-y-3 pt-4">
              {attempts.length === 0 && (
                <p className="text-sm text-muted-foreground">No certification attempts yet.</p>
              )}
              {attempts.map((attempt) => {
                const cert = certificateForAttempt(attempt.id);
                return (
                  <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{attempt.courses?.title || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.score}% · {dateStr(attempt.completed_at)}
                        {cert ? ` · ${cert.certificate_number}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                      {attempt.passed && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => downloadCertificate(attempt.id, cert?.certificate_number)}
                        >
                          <Award className="h-4 w-4 mr-1" /> Certificate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="payments" className="space-y-3 pt-4">
              {purchases.length === 0 && retakes.length === 0 && (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              )}
              {purchases.map((purchase) => {
                const course = courses.find((c) => c.id === purchase.course_id);
                const invoice = invoiceForPurchase('course', purchase.id);
                return (
                  <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{course?.title || 'Course'}</div>
                      <div className="text-xs text-muted-foreground">
                        {dateStr(purchase.purchased_at)} · {euros(purchase.amount_paid)}
                        {purchase.refunded_amount > 0 ? ` · refunded ${money(purchase.refunded_amount)}` : ''}
                        {purchase.discount_summary ? ` · ${purchase.discount_summary}` : ''}
                      </div>
                    </div>
                    {invoice ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => openInvoice(invoice)}>
                        <FileText className="h-4 w-4 mr-1" /> Invoice
                      </Button>
                    ) : (
                      <Badge variant="secondary">No invoice</Badge>
                    )}
                  </div>
                );
              })}
              {retakes.map((retake) => {
                const invoice = invoiceForPurchase('retake', retake.id);
                return (
                  <div key={retake.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">Extra certification attempt</div>
                      <div className="text-xs text-muted-foreground">
                        {dateStr(retake.created_at)} · {money(retake.amount_paid)}
                        {retake.refunded_amount > 0 ? ` · refunded ${money(retake.refunded_amount)}` : ''}
                      </div>
                    </div>
                    {invoice ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => openInvoice(invoice)}>
                        <Download className="h-4 w-4 mr-1" /> Invoice
                      </Button>
                    ) : (
                      <Badge variant="secondary">No invoice</Badge>
                    )}
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UserProfileSheet;
