import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = searchParams.get("course_id");
  const purchaseType = searchParams.get("type");
  const isRetake = purchaseType === "certification_retake";
  const [status, setStatus] = useState<"pending" | "confirmed" | "timeout">("pending");
  // Invoice fallback: the buyer must be able to get the document here even if
  // the email never reaches their mailbox.
  const [invoice, setInvoice] = useState<{ id: string; invoice_number: string } | null>(null);
  const [downloading, setDownloading] = useState(false);


  useEffect(() => {
    if (!user) return;
    if (!isRetake && !courseId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      const { data } = isRetake
        ? await supabase
            .from("certification_retake_purchases")
            .select("id")
            .eq("user_id", user.id)
            .is("consumed_at", null)
            .limit(1)
            .maybeSingle()
        : await supabase
            .from("course_purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("course_id", courseId as string)
            .maybeSingle();


      if (cancelled) return;

      if (data) {
        setStatus("confirmed");
        return;
      }
      if (attempts >= 15) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [user, courseId, isRetake]);

  // Poll briefly for the issued invoice so the buyer can download it right away.
  useEffect(() => {
    if (!user || status !== "confirmed") return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, pdf_path")
        .eq("user_id", user.id)
        .not("pdf_path", "is", null)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setInvoice({ id: data.id, invoice_number: data.invoice_number });
        return;
      }
      if (attempts >= 10) return;
      setTimeout(poll, 3000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const downloadInvoice = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invoice-actions", {
        body: { action: "signed_url", invoiceId: invoice.id },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error ?? "No download link returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "Could not open the invoice",
        description: e?.message ?? "Please try again from My payments.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };




  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status === "pending" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <h1 className="text-2xl font-bold">Confirming your payment…</h1>
                <p className="text-muted-foreground text-sm">
                  This usually takes just a few seconds.
                </p>
              </>
            )}

            {status === "confirmed" && (
              <>
                <CheckCircle className="h-10 w-10 text-accent mx-auto" />
                <h1 className="text-2xl font-bold">Payment successful</h1>
                <p className="text-muted-foreground text-sm">
                  {isRetake
                    ? "Your retake is unlocked. Good luck with the exam!"
                    : "Your course is unlocked. Enjoy your training!"}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() =>
                      navigate(
                        isRetake
                          ? `/certification-test?courseId=${courseId ?? ""}`
                          : `/training/${courseId}`
                      )
                    }

                  >
                    {isRetake ? "Start certification test" : "Start training"}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Go to dashboard</Link>
                  </Button>
                  {invoice && (
                    <Button variant="ghost" onClick={downloadInvoice} disabled={downloading}>
                      {downloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download invoice {invoice.invoice_number}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your VAT invoice is always available on the{" "}
                    <Link to="/payments" className="underline">
                      My payments
                    </Link>{" "}
                    page.
                  </p>
                </div>

              </>
            )}



            {status === "timeout" && (
              <>
                <h1 className="text-2xl font-bold">Payment received</h1>
                <p className="text-muted-foreground text-sm">
                  We're still finalising your access. Refresh this page in a moment, or
                  check your dashboard.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={() => window.location.reload()}>Refresh</Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
