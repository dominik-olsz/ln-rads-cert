import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

interface InvoiceRef {
  id: string;
  invoice_number: string;
  doc_type: string;
  gross_amount: number;
  currency: string;
  pdf_path: string | null;
  original_invoice_id: string | null;
  course_purchase_id: string | null;
  retake_purchase_id: string | null;
}

interface PaymentRow {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  currency: string;
  invoice: InvoiceRef | null;
  corrections: InvoiceRef[];
}

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(cents / 100);

export default function Payments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPayments = async () => {
    try {
      const [coursesRes, retakesRes, invoicesRes] = await Promise.all([
        supabase
          .from("course_purchases")
          .select("id, purchased_at, amount_paid, course_id, courses ( title )")
          .eq("user_id", user!.id),
        supabase
          .from("certification_retake_purchases")
          .select("id, created_at, amount_paid, course_id, courses ( title )")
          .eq("user_id", user!.id),
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, doc_type, gross_amount, currency, pdf_path, original_invoice_id, course_purchase_id, retake_purchase_id",
          )
          .eq("user_id", user!.id),
      ]);

      const invoices = (invoicesRes.data ?? []) as InvoiceRef[];
      const originals = invoices.filter((i) => i.doc_type !== "FK");
      const corrections = invoices.filter((i) => i.doc_type === "FK");

      const attach = (
        match: (inv: InvoiceRef) => boolean,
      ): { invoice: InvoiceRef | null; corrections: InvoiceRef[] } => {
        const invoice = originals.find(match) ?? null;
        return {
          invoice,
          corrections: invoice
            ? corrections.filter((c) => c.original_invoice_id === invoice.id)
            : [],
        };
      };

      const courseRows: PaymentRow[] = (coursesRes.data ?? []).map((p: any) => {
        const attached = attach((inv) => inv.course_purchase_id === p.id);
        return {
          id: `course-${p.id}`,
          date: p.purchased_at,
          description: p.courses?.title ?? "Online course",
          // The invoice holds the exact gross (incl. VAT); course_purchases only
          // stores a rounded amount in whole euros.
          amountCents: attached.invoice
            ? Number(attached.invoice.gross_amount ?? 0)
            : Number(p.amount_paid ?? 0) * 100,
          currency: attached.invoice?.currency ?? "eur",
          ...attached,
        };
      });

      const retakeRows: PaymentRow[] = (retakesRes.data ?? []).map((p: any) => {
        const attached = attach((inv) => inv.retake_purchase_id === p.id);
        return {
          id: `retake-${p.id}`,
          date: p.created_at,
          description: `Certification exam retake — ${p.courses?.title ?? "Certification"}`,
          amountCents: attached.invoice
            ? Number(attached.invoice.gross_amount ?? 0)
            : Number(p.amount_paid ?? 0),
          currency: attached.invoice?.currency ?? "eur",
          ...attached,
        };
      });

      const all = [...courseRows, ...retakeRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setRows(all);

      // Deep link from the invoice email: open that invoice straight away.
      const wanted = searchParams.get("invoice");
      if (wanted) {
        const match = invoices.find((i) => i.id === wanted);
        if (match?.pdf_path) download(match);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not load your payments",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const download = async (invoice: InvoiceRef) => {
    setDownloading(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("invoice-actions", {
        body: { action: "signed_url", invoiceId: invoice.id },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error ?? "No download link returned");
      window.open(data.url, "_blank", "noopener");
    } catch (e) {
      toast({
        title: "Download failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Payments</h1>
          <p className="text-muted-foreground mt-2">
            Everything you have purchased, with the VAT invoice for each payment.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your payments…
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No payments yet</CardTitle>
              <CardDescription>
                Once you purchase a course, it will appear here together with its invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/courses")}>Browse courses</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{row.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(row.date).toLocaleDateString()} ·{" "}
                      {formatMoney(row.amountCents, row.currency)}
                      {row.invoice ? (
                        <>
                          {" · "}
                          <span className="font-mono">{row.invoice.invoice_number}</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {row.invoice?.pdf_path ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => download(row.invoice!)}
                        disabled={downloading === row.invoice.id}
                      >
                        {downloading === row.invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Invoice
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        Invoice is being issued
                      </Badge>
                    )}

                    {row.corrections
                      .filter((c) => c.pdf_path)
                      .map((c) => (
                        <Button
                          key={c.id}
                          variant="outline"
                          size="sm"
                          onClick={() => download(c)}
                          disabled={downloading === c.id}
                        >
                          {downloading === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Correction {c.invoice_number}
                        </Button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
