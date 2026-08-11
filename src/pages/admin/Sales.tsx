import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Invoice = {
  id: string;
  invoice_number: string;
  doc_type: string;
  original_invoice_id: string | null;
  issued_at: string;
  purchase_type: string;
  currency: string;
  vat_rate: number;
  reverse_charge: boolean;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  line_items: { description: string; quantity: number; gross: number }[] | null;
  buyer_name: string | null;
  buyer_company: string | null;
  buyer_email: string | null;
  buyer_address_line1: string | null;
  buyer_postal_code: string | null;
  buyer_city: string | null;
  buyer_country: string | null;
  buyer_vat_id: string | null;
  stripe_payment_intent_id: string | null;
  pdf_path: string | null;
  refund_reason: string | null;
  fxl_document_id: string | null;
  ksef_status: number | null;
  ksef_number: string | null;
  ksef_error_desc: string | null;
};

const fmt = (cents: number, currency = 'eur') =>
  `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

// Mirrors requiresKsef in supabase/functions/_shared/fakturaxl.ts:
// KSeF applies only to domestic Polish B2B invoices.
const requiresKsef = (i: Invoice) =>
  String(i.buyer_country ?? '').trim().toUpperCase() === 'PL' &&
  String(i.buyer_vat_id ?? '').trim().length > 0;

type KsefState =
  | { kind: 'skipped' }
  | { kind: 'pending' }
  | { kind: 'assigned'; number: string }
  | { kind: 'failed'; message: string };

const ksefStateOf = (i: Invoice): KsefState => {
  if (i.ksef_status === 0) return { kind: 'pending' };
  if (i.ksef_status === 1) return { kind: 'assigned', number: i.ksef_number ?? '—' };
  if (i.ksef_status === 2)
    return { kind: 'failed', message: i.ksef_error_desc || 'KSeF submission failed' };
  if (requiresKsef(i) && !i.fxl_document_id)
    return { kind: 'failed', message: i.ksef_error_desc || 'Not submitted to KSeF' };
  return { kind: 'skipped' };
};

const AdminSales = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('issued_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load sales', description: error.message, variant: 'destructive' });
    } else {
      setInvoices((data ?? []) as unknown as Invoice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const corrections = useMemo(() => {
    const map = new Map<string, number>();
    invoices
      .filter((i) => i.doc_type === 'FK' && i.original_invoice_id)
      .forEach((i) => {
        map.set(
          i.original_invoice_id as string,
          (map.get(i.original_invoice_id as string) ?? 0) + Math.abs(i.gross_amount),
        );
      });
    return map;
  }, [invoices]);

  const sales = useMemo(() => {
    return invoices
      .filter((i) => i.doc_type === 'FV')
      .filter((i) => {
        const refunded = corrections.get(i.id) ?? 0;
        const status =
          refunded <= 0 ? 'paid' : refunded >= i.gross_amount ? 'refunded' : 'partial';
        if (statusFilter !== 'all' && statusFilter !== status) return false;
        if (from && new Date(i.issued_at) < new Date(from)) return false;
        if (to && new Date(i.issued_at) > new Date(`${to}T23:59:59`)) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          i.invoice_number,
          i.buyer_name,
          i.buyer_company,
          i.buyer_email,
          i.buyer_vat_id,
          i.line_items?.map((l) => l.description).join(' '),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [invoices, corrections, search, statusFilter, from, to]);

  const totals = useMemo(() => {
    const gross = sales.reduce((s, i) => s + i.gross_amount, 0);
    const refunded = sales.reduce((s, i) => s + (corrections.get(i.id) ?? 0), 0);
    const vat = sales.reduce((s, i) => s + i.vat_amount, 0);
    return { gross, refunded, vat, net: gross - refunded };
  }, [sales, corrections]);

  const statusOf = (i: Invoice) => {
    const refunded = corrections.get(i.id) ?? 0;
    if (refunded <= 0) return { label: 'Paid', variant: 'default' as const };
    if (refunded >= i.gross_amount) return { label: 'Refunded', variant: 'destructive' as const };
    return { label: 'Partially refunded', variant: 'secondary' as const };
  };

  const openPdf = async (invoice: Invoice, print = false) => {
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
      const win = window.open(signed.signedUrl, '_blank');
      if (print && win) win.addEventListener('load', () => win.print());
    } catch (e) {
      toast({
        title: 'Could not open invoice',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async (invoice: Invoice) => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('invoice-actions', {
      body: { invoiceId: invoice.id, action: 'resend' },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not send', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invoice sent', description: `Emailed to ${invoice.buyer_email}` });
    }
  };

  const retryKsef = async (invoice: Invoice) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('invoice-actions', {
      body: { invoiceId: invoice.id, action: 'retry_ksef' },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'KSeF retry failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'KSeF retry submitted',
      description: (data as any)?.ksef_number
        ? `KSeF number: ${(data as any).ksef_number}`
        : 'Status will update shortly.',
    });
    fetchInvoices();
  };



  const [driftOpen, setDriftOpen] = useState(false);
  const [drift, setDrift] = useState<any | null>(null);

  const runDriftCheck = async () => {
    setBusy(true);
    setDrift(null);
    setDriftOpen(true);
    const { data, error } = await supabase.functions.invoke('invoice-actions', {
      body: { action: 'fxl_orphans' },
    });
    setBusy(false);
    if (error) {
      setDriftOpen(false);
      toast({ title: 'Check failed', description: error.message, variant: 'destructive' });
      return;
    }
    setDrift(data);
  };

  const doRefund = async () => {
    if (!selected) return;
    setBusy(true);
    const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
    const { error } = await supabase.functions.invoke('refund-payment', {
      body: { invoiceId: selected.id, amountCents },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Refund failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRefundOpen(false);
    setRefundAmount('');
    toast({
      title: 'Refund issued',
      description: 'A correction invoice is being generated.',
    });
    setTimeout(fetchInvoices, 3000);
  };

  const exportCsv = () => {
    const rows = [
      [
        'Invoice',
        'Date',
        'Buyer',
        'Company',
        'Email',
        'VAT ID',
        'Country',
        'Item',
        'Net',
        'VAT',
        'Gross',
        'Refunded',
        'Status',
      ],
      ...sales.map((i) => [
        i.invoice_number,
        new Date(i.issued_at).toISOString().slice(0, 10),
        i.buyer_name ?? '',
        i.buyer_company ?? '',
        i.buyer_email ?? '',
        i.buyer_vat_id ?? '',
        i.buyer_country ?? '',
        i.line_items?.[0]?.description ?? '',
        (i.net_amount / 100).toFixed(2),
        (i.vat_amount / 100).toFixed(2),
        (i.gross_amount / 100).toFixed(2),
        ((corrections.get(i.id) ?? 0) / 100).toFixed(2),
        statusOf(i).label,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const relatedCorrections = (invoice: Invoice) =>
    invoices.filter((i) => i.original_invoice_id === invoice.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/admin/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl font-bold">Sales &amp; Invoices</h1>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={runDriftCheck}>
              Check FakturaXL sync
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Sales', value: String(sales.length) },
            { label: 'Gross revenue', value: fmt(totals.gross) },
            { label: 'VAT collected', value: fmt(totals.vat) },
            { label: 'Refunded', value: fmt(totals.refunded) },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buyer, email, invoice number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partially refunded</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sales.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                No sales yet. Invoices appear here automatically after a successful payment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>KSeF</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((i) => {
                      const status = statusOf(i);
                      const ksef = ksefStateOf(i);
                      return (
                        <TableRow
                          key={i.id}
                          className="cursor-pointer"
                          onClick={() => setSelected(i)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {i.invoice_number}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(i.issued_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {i.buyer_company || i.buyer_name || '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">{i.buyer_email}</div>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {i.line_items?.[0]?.description ?? '—'}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {fmt(i.net_amount, i.currency)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {i.reverse_charge ? 'RC 0%' : fmt(i.vat_amount, i.currency)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {fmt(i.gross_amount, i.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {ksef.kind === 'skipped' && (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {ksef.kind === 'pending' && (
                              <span className="text-muted-foreground">pending</span>
                            )}
                            {ksef.kind === 'assigned' && (
                              <span className="text-xs font-mono break-all">{ksef.number}</span>
                            )}
                            {ksef.kind === 'failed' && (
                              <span className="text-xs text-destructive">{ksef.message}</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => openPdf(i)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {ksef.kind === 'failed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => retryKsef(i)}
                                >
                                  Retry KSeF
                                </Button>
                              )}
                            </div>
                          </TableCell>

                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.invoice_number}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Buyer</h3>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>{selected.buyer_company || selected.buyer_name || '—'}</div>
                    {selected.buyer_company && selected.buyer_name && (
                      <div>{selected.buyer_name}</div>
                    )}
                    <div>{selected.buyer_email}</div>
                    <div>{selected.buyer_address_line1}</div>
                    <div>
                      {[selected.buyer_postal_code, selected.buyer_city]
                        .filter(Boolean)
                        .join(' ')}{' '}
                      {selected.buyer_country}
                    </div>
                    {selected.buyer_vat_id && <div>VAT ID: {selected.buyer_vat_id}</div>}
                  </div>
                </div>

                {(() => {
                  const ksef = ksefStateOf(selected);
                  if (ksef.kind === 'skipped') return null;
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">KSeF</h3>
                      {ksef.kind === 'assigned' && (
                        <div className="text-muted-foreground font-mono text-xs break-all">
                          {ksef.number}
                        </div>
                      )}
                      {ksef.kind === 'pending' && (
                        <div className="text-muted-foreground">pending</div>
                      )}
                      {ksef.kind === 'failed' && (
                        <div className="space-y-2">
                          <div className="text-destructive">{ksef.message}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => retryKsef(selected)}
                          >
                            Retry KSeF
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}



                <div>
                  <h3 className="font-semibold mb-2">Purchase</h3>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>
                      {selected.purchase_type === 'certification_retake'
                        ? 'Certification retake'
                        : 'Course'}
                    </div>
                    {selected.line_items?.map((l, idx) => (
                      <div key={idx}>
                        {l.quantity} × {l.description} — {fmt(l.gross, selected.currency)}
                      </div>
                    ))}
                    <div>Issued {new Date(selected.issued_at).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Amounts</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net</span>
                      <span>{fmt(selected.net_amount, selected.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        VAT {selected.vat_rate}%
                        {selected.reverse_charge ? ' (reverse charge)' : ''}
                      </span>
                      <span>{fmt(selected.vat_amount, selected.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Gross</span>
                      <span>{fmt(selected.gross_amount, selected.currency)}</span>
                    </div>
                    {(corrections.get(selected.id) ?? 0) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Refunded</span>
                        <span>
                          -{fmt(corrections.get(selected.id) ?? 0, selected.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {relatedCorrections(selected).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Correction invoices</h3>
                    <div className="space-y-2">
                      {relatedCorrections(selected).map((c) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {c.invoice_number} · {fmt(c.gross_amount, c.currency)}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => openPdf(c)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" disabled={busy} onClick={() => openPdf(selected)}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => openPdf(selected, true)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => resend(selected)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={
                      busy || (corrections.get(selected.id) ?? 0) >= selected.gross_amount
                    }
                    onClick={() => {
                      setRefundAmount('');
                      setRefundOpen(true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refund
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              Leave the amount empty for a full refund. A correction invoice is generated
              automatically and a full refund removes the buyer&apos;s access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Amount ({selected?.currency.toUpperCase()})</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder={
                selected
                  ? (
                      (selected.gross_amount - (corrections.get(selected.id) ?? 0)) /
                      100
                    ).toFixed(2)
                  : ''
              }
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={doRefund}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue refund
            </Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
};

export default AdminSales;
