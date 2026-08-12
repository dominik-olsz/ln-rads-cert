import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

type FaqItem = { id: string; question: string; answer: string };

const FAQ = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("faq_items")
        .select("id, question, answer")
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      setFaqs(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="LN-RADS Certification FAQ — Exam, Access and Certificates"
        description="Answers about the LN-RADS certification: who it is for, exam length, passing score, retake policy, modalities covered and how certificates are issued."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-subtle py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">LN-RADS Certification FAQ</h1>
              <p className="text-xl text-muted-foreground">
                Find answers to common questions about the LN-RADS certification program
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="p-6 md:p-8">
                {loading && <p className="text-muted-foreground">Loading questions…</p>}
                {!loading && faqs.length === 0 && (
                  <p className="text-muted-foreground">
                    No questions published yet. Please contact us with your question.
                  </p>
                )}
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={faq.id} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Contact Section */}
              <div className="mt-12 text-center">
                <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
                <p className="text-muted-foreground mb-6">
                  Can't find the answer you're looking for? Please reach out to our support team.
                </p>
                <a
                  href="mailto:cert@lnrads.com"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FAQ;
