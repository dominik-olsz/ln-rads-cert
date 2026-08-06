import Navbar from "@/components/Navbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  const faqs = [
    {
      question: "What is LN-RADS?",
      answer: "LN-RADS (Lymph Nodes Reporting and Data System) is an innovative multiparametric approach for diagnosing lymph nodes. It enables detection of macrometastases as small as 2-3mm and improves diagnostic accuracy by over 20% compared to traditional methods."
    },
    {
      question: "Who should take the LN-RADS certification course?",
      answer: "This certification is designed for radiologists, oncologists, and medical professionals involved in lymph node imaging and diagnosis across all modalities including US, CT, MR, and PET."
    },
    {
      question: "How many questions are in the certification exam?",
      answer: "The certification exam consists of 100 questions covering all aspects of LN-RADS methodology and application across different imaging modalities."
    },
    {
      question: "What is the passing score?",
      answer: "You need to achieve a minimum score of 80% to pass the certification exam and receive your official LN-RADS certification."
    },
    {
      question: "How long does it take to complete the course?",
      answer: "The course is self-paced, allowing you to learn at your own speed. Most participants complete the training and certification within 4-8 weeks, but you have flexible access to take as much time as needed."
    },
    {
      question: "What imaging modalities are covered?",
      answer: "The LN-RADS certification covers all major imaging modalities including Ultrasound (US), Computed Tomography (CT), Magnetic Resonance (MR), and Positron Emission Tomography (PET)."
    },
    {
      question: "Is the certification recognized internationally?",
      answer: "Yes, the LN-RADS certification is an official certification program recognized globally by medical institutions and professional organizations."
    },
    {
      question: "Can I retake the exam if I don't pass?",
      answer: "No, you have only one attempt to pass the certification exam. Please ensure you're well-prepared before taking the test, as there are no retakes available."
    },
    {
      question: "Will I receive a certificate upon completion?",
      answer: "Upon successfully passing the exam with 80% or higher, you will receive an official LN-RADS certification that validates your expertise in lymph node assessment."
    },
    {
      question: "What happens after I complete the certification?",
      answer: "After certification, you'll have access to your certificate in your dashboard, which you can download and share. You'll also be part of our certified professionals network."
    },
    {
      question: "Do I need prior experience in radiology?",
      answer: "While basic knowledge of medical imaging is helpful, the course is designed to be comprehensive and includes foundational concepts. However, it's primarily intended for healthcare professionals with some background in diagnostic imaging."
    },
    {
      question: "Is there a time limit for completing the exam?",
      answer: "The certification exam has a reasonable time limit to ensure focused completion. Specific time details will be provided when you begin the exam."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
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
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                How can we help you?
              </h1>
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
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
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
                  href="mailto:info@lnrads.com"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
