import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: ReactNode;
}

export const LegalSection = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      {children}
    </div>
  </section>
);

const LegalPage = ({ title, subtitle, lastUpdated, children }: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 space-y-3 border-b pb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </header>
        <div className="space-y-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
