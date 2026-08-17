import { useEffect, useState } from "react";
import { Link } from "@/i18n/router";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";
import { LEGAL_DEFAULTS, LegalSlug } from "@/content/legalDefaults";

type Lang = "en" | "pl";

interface DocState {
  title: string;
  subtitle: string;
  lastUpdated: string;
  body: string;
}

type Docs = Record<LegalSlug, Record<Lang, DocState>>;

const SLUGS: { slug: LegalSlug; label: string }[] = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms and Conditions" },
];

const emptyDocs = (): Docs =>
  ({
    "privacy-policy": {
      en: { title: "", subtitle: "", lastUpdated: "", body: "" },
      pl: { title: "", subtitle: "", lastUpdated: "", body: "" },
    },
    terms: {
      en: { title: "", subtitle: "", lastUpdated: "", body: "" },
      pl: { title: "", subtitle: "", lastUpdated: "", body: "" },
    },
  }) as Docs;

const AdminLegal = () => {
  const [docs, setDocs] = useState<Docs>(emptyDocs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<LegalSlug | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select(
          "slug, title_en, title_pl, subtitle_en, subtitle_pl, body_en, body_pl, last_updated_en, last_updated_pl",
        );
      if (error) {
        toast.error(`Could not load legal documents: ${error.message}`);
      } else {
        const next = emptyDocs();
        (data ?? []).forEach((row: any) => {
          const slug = row.slug as LegalSlug;
          if (!next[slug]) return;
          next[slug].en = {
            title: row.title_en ?? "",
            subtitle: row.subtitle_en ?? "",
            lastUpdated: row.last_updated_en ?? "",
            body: row.body_en ?? "",
          };
          next[slug].pl = {
            title: row.title_pl ?? "",
            subtitle: row.subtitle_pl ?? "",
            lastUpdated: row.last_updated_pl ?? "",
            body: row.body_pl ?? "",
          };
        });
        // Prefill empty languages with the built-in text so editing starts from
        // the wording that is currently live on the page.
        SLUGS.forEach(({ slug }) => {
          (["en", "pl"] as Lang[]).forEach((lang) => {
            if (!next[slug][lang].body.trim()) {
              const def = LEGAL_DEFAULTS[slug][lang];
              next[slug][lang] = {
                title: def.title,
                subtitle: def.subtitle,
                lastUpdated: def.lastUpdated,
                body: def.body,
              };
            }
          });
        });
        setDocs(next);
      }
      setLoading(false);
    };
    load();
  }, []);

  const patch = (slug: LegalSlug, lang: Lang, changes: Partial<DocState>) =>
    setDocs((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [lang]: { ...prev[slug][lang], ...changes } },
    }));

  const resetToDefault = (slug: LegalSlug, lang: Lang) => {
    const def = LEGAL_DEFAULTS[slug][lang];
    patch(slug, lang, {
      title: def.title,
      subtitle: def.subtitle,
      lastUpdated: def.lastUpdated,
      body: def.body,
    });
    toast.success("Built-in text restored — remember to save.");
  };

  const save = async (slug: LegalSlug) => {
    setSaving(slug);
    const doc = docs[slug];
    const { error } = await supabase.from("legal_documents").upsert(
      {
        slug,
        title_en: doc.en.title,
        subtitle_en: doc.en.subtitle,
        last_updated_en: doc.en.lastUpdated,
        body_en: doc.en.body,
        title_pl: doc.pl.title,
        subtitle_pl: doc.pl.subtitle,
        last_updated_pl: doc.pl.lastUpdated,
        body_pl: doc.pl.body,
      },
      { onConflict: "slug" },
    );
    setSaving(null);
    if (error) toast.error(`Could not save: ${error.message}`);
    else toast.success("Saved — the page is updated.");
  };

  const editor = (slug: LegalSlug, lang: Lang) => {
    const doc = docs[slug][lang];
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Page title</Label>
            <Input value={doc.title} onChange={(e) => patch(slug, lang, { title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Last updated</Label>
            <Input
              value={doc.lastUpdated}
              onChange={(e) => patch(slug, lang, { lastUpdated: e.target.value })}
              placeholder="12 August 2026"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input value={doc.subtitle} onChange={(e) => patch(slug, lang, { subtitle: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Body (Markdown)</Label>
          <p className="text-xs text-muted-foreground">
            Use <code>## Heading</code> for numbered sections, <code>- item</code> for bullets,{" "}
            <code>**bold**</code> and <code>[label](https://link)</code> for links.
          </p>
          <Textarea
            value={doc.body}
            onChange={(e) => patch(slug, lang, { body: e.target.value })}
            className="min-h-[420px] font-mono text-xs"
          />
        </div>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">Preview</summary>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            <ReactMarkdown>{doc.body}</ReactMarkdown>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(slug)} disabled={saving === slug}>
            {saving === slug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button variant="outline" onClick={() => resetToDefault(slug, lang)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore built-in text
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Link to="/admin/dashboard" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Legal pages</h1>
        <p className="mb-8 text-muted-foreground">
          Edit the Privacy Policy and Terms and Conditions shown at /privacy-policy and /terms, in English and Polish.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-8">
            {SLUGS.map(({ slug, label }) => (
              <Card key={slug}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="en">
                    <TabsList className="mb-4">
                      <TabsTrigger value="en">English</TabsTrigger>
                      <TabsTrigger value="pl">Polski</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en">{editor(slug, "en")}</TabsContent>
                    <TabsContent value="pl">{editor(slug, "pl")}</TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLegal;
