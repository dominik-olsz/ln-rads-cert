import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatEuro } from '@/lib/pricing';
import { ROUNDING_OPTIONS, RoundingMode, eurCentsToPlnCents, formatPlnCents } from '@/lib/fxPricing';

type RateRow = {
  id: string;
  eur_pln_commercial_rate: number;
  rounding_mode: RoundingMode;
  effective_from: string;
  created_by: string | null;
  created_at: string;
};

type CourseRow = {
  id: string;
  title: string;
  price: number | null;
  discount_price: number | null;
  retake_price: number | null;
};

const AdminPricing = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<RateRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [rateInput, setRateInput] = useState('');
  const [rounding, setRounding] = useState<RoundingMode>('ends_99');
  const [saving, setSaving] = useState(false);

  const current = rates[0] ?? null;

  const load = async () => {
    const [{ data: rateData }, { data: courseData }] = await Promise.all([
      supabase
        .from('pricing_fx_rates')
        .select('id, eur_pln_commercial_rate, rounding_mode, effective_from, created_by, created_at')
        .order('effective_from', { ascending: false })
        .limit(50),
      supabase.from('courses').select('id, title, price, discount_price, retake_price').order('title'),
    ]);

    const rows = (rateData ?? []) as RateRow[];
    setRates(rows);
    setCourses((courseData ?? []) as CourseRow[]);

    if (rows[0]) {
      setRateInput(String(rows[0].eur_pln_commercial_rate));
      setRounding(rows[0].rounding_mode);
    }

    const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', ids);
      setAuthors(Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.email ?? '—'])));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previewRate = Number(rateInput.replace(',', '.'));
  const previewValid = Number.isFinite(previewRate) && previewRate > 0 && previewRate < 100;

  const preview = useMemo(() => {
    if (!previewValid) return [];
    const toPln = (eur?: number | null) =>
      eur && eur > 0 ? eurCentsToPlnCents(Math.round(eur * 100), previewRate, rounding) : null;
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      rows: [
        { label: 'Regular price', eur: c.price, pln: toPln(c.price) },
        { label: 'Sale price', eur: c.discount_price, pln: toPln(c.discount_price) },
        { label: 'Retake price', eur: c.retake_price, pln: toPln(c.retake_price) },
      ].filter((r) => r.pln !== null),
    }));
  }, [courses, previewRate, previewValid, rounding]);

  const handleSave = async () => {
    if (!previewValid) {
      toast.error('Enter a rate between 0 and 100');
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('pricing_fx_rates').insert({
      eur_pln_commercial_rate: previewRate,
      rounding_mode: rounding,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('New pricing rate saved');
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">PLN Pricing</h1>
          <p className="text-muted-foreground max-w-3xl">
            Course prices stay authoritative in EUR. The PLN amount buyers pay is calculated at
            checkout from the commercial rate below, so a change takes effect immediately.
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
            <strong>This is a commercial pricing rate, not the NBP accounting rate.</strong> It is
            never used for invoices or VAT — those figures always come from FakturaXL.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current rate</CardTitle>
          </CardHeader>
          <CardContent>
            {current ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-3xl font-bold">
                  1 EUR = {Number(current.eur_pln_commercial_rate).toFixed(4)} PLN
                </div>
                <Badge variant="secondary">
                  {ROUNDING_OPTIONS.find((o) => o.value === current.rounding_mode)?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Set {new Date(current.effective_from).toLocaleString()}
                  {current.created_by ? ` by ${authors[current.created_by] ?? 'admin'}` : ''}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No rate set yet — buyers can only pay in EUR until you save one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Set a new rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="rate">Commercial rate (EUR → PLN)</Label>
                <Input
                  id="rate"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="4.3000"
                />
              </div>
              <div className="space-y-2">
                <Label>Rounding</Label>
                <Select value={rounding} onValueChange={(v) => setRounding(v as RoundingMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Preview at the entered rate</h3>
              {!previewValid ? (
                <p className="text-sm text-muted-foreground">Enter a valid rate to see PLN prices.</p>
              ) : (
                preview.map((c) => (
                  <div key={c.id} className="rounded-md border p-4">
                    <div className="font-medium mb-2">{c.title}</div>
                    <div className="space-y-1 text-sm">
                      {c.rows.map((r) => (
                        <div key={r.label} className="flex justify-between max-w-sm">
                          <span className="text-muted-foreground">
                            {r.label} ({formatEuro(Number(r.eur))} net)
                          </span>
                          <span className="font-semibold">{formatPlnCents(r.pln as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                VAT is added on top of these net amounts by Stripe at checkout.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving || !previewValid}>
              {saving ? 'Saving...' : 'Save new rate'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate</TableHead>
                  <TableHead>Rounding</TableHead>
                  <TableHead>Effective from</TableHead>
                  <TableHead>Changed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{Number(r.eur_pln_commercial_rate).toFixed(4)}</TableCell>
                    <TableCell>
                      {ROUNDING_OPTIONS.find((o) => o.value === r.rounding_mode)?.label ?? r.rounding_mode}
                    </TableCell>
                    <TableCell>{new Date(r.effective_from).toLocaleString()}</TableCell>
                    <TableCell>{r.created_by ? authors[r.created_by] ?? 'admin' : '—'}</TableCell>
                  </TableRow>
                ))}
                {rates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No rates recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPricing;
