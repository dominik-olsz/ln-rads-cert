import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Ban, Trash2, Ticket } from 'lucide-react';

interface DiscountCode {
  id: string;
  code: string;
  percent: number;
  batch_label: string | null;
  expires_at: string | null;
  is_active: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  redeemed_email: string | null;
  created_at: string;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = (prefix: string) => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${prefix ? `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')}-` : ''}${body}`;
};

const statusOf = (c: DiscountCode) => {
  if (c.redeemed_at) return { label: 'Used', variant: 'secondary' as const };
  if (!c.is_active) return { label: 'Deactivated', variant: 'outline' as const };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
    return { label: 'Expired', variant: 'outline' as const };
  }
  return { label: 'Unused', variant: 'default' as const };
};

const AdminDiscountCodes = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [quantity, setQuantity] = useState(30);
  const [percent, setPercent] = useState(20);
  const [expiresAt, setExpiresAt] = useState('');
  const [batchLabel, setBatchLabel] = useState('');

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load discount codes', variant: 'destructive' });
    } else {
      setCodes((data ?? []) as DiscountCode[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const used = codes.filter((c) => c.redeemed_at).length;
    return { total: codes.length, used, available: codes.length - used };
  }, [codes]);

  const handleGenerate = async () => {
    const qty = Math.min(500, Math.max(1, Math.round(quantity)));
    const pct = Math.min(100, Math.max(1, Math.round(percent)));
    setGenerating(true);
    try {
      const rows = Array.from({ length: qty }, () => ({
        code: randomCode(batchLabel),
        percent: pct,
        batch_label: batchLabel.trim() || null,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      }));

      const { error } = await supabase.from('discount_codes').insert(rows);
      if (error) throw error;

      toast({ title: 'Codes generated', description: `${qty} single-use codes at ${pct}% off` });
      fetchCodes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate codes', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const deactivate = async (id: string) => {
    const { error } = await supabase.from('discount_codes').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: false } : c)));
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('discount_codes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const copyAll = async (list: DiscountCode[]) => {
    await navigator.clipboard.writeText(list.map((c) => `${c.code} (${c.percent}%)`).join('\n'));
    toast({ title: 'Copied', description: `${list.length} codes copied to clipboard` });
  };

  const exportCsv = (list: DiscountCode[]) => {
    const csv = [
      'code,percent,batch,expires_at,status,redeemed_email,redeemed_at',
      ...list.map((c) =>
        [
          c.code,
          c.percent,
          c.batch_label ?? '',
          c.expires_at ?? '',
          statusOf(c).label,
          c.redeemed_email ?? '',
          c.redeemed_at ?? '',
        ].join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discount-codes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ticket className="h-7 w-7 text-primary" />
            Discount codes
          </h1>
          <p className="text-muted-foreground mt-1">
            Each code is single-use and works for one purchase (course or exam retake).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate a batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">How many codes</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percent">Discount (%)</Label>
                <Input
                  id="percent"
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Valid until (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchLabel">Campaign label (optional)</Label>
                <Input
                  id="batchLabel"
                  value={batchLabel}
                  onChange={(e) => setBatchLabel(e.target.value)}
                  placeholder="ECR2026"
                />
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : `Generate ${quantity} codes`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>
              All codes{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({stats.total} total · {stats.available} available · {stats.used} used)
              </span>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyAll(codes.filter((c) => !c.redeemed_at))}>
                <Copy className="h-4 w-4 mr-2" />
                Copy unused
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCsv(codes)}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : codes.length === 0 ? (
              <p className="text-muted-foreground">No codes yet — generate your first batch above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Redeemed by</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => {
                    const status = statusOf(c);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">{c.code}</TableCell>
                        <TableCell>{c.percent}%</TableCell>
                        <TableCell>{c.batch_label || '—'}</TableCell>
                        <TableCell>
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No end date'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.redeemed_email
                            ? `${c.redeemed_email}${c.redeemed_at ? ` · ${new Date(c.redeemed_at).toLocaleDateString()}` : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(c.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!c.redeemed_at && c.is_active && (
                              <Button variant="outline" size="sm" onClick={() => deactivate(c.id)}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            {!c.redeemed_at && (
                              <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDiscountCodes;
