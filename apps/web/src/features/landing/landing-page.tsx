import Link from "next/link";
import {
  ArrowRight,
  Check,
  Cloud,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Gauge,
  Lock,
  PenLine,
  Presentation,
  ScanText,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
  { href: "#documents", label: "Documents" },
];

const AVAILABLE_FEATURES = [
  {
    icon: FileText,
    title: "PDF viewing",
    description:
      "Open multi-page PDFs with fast rendering, zoom, thumbnails and full-text search.",
  },
  {
    icon: PenLine,
    title: "Annotation tools",
    description:
      "Highlight, underline, strikeout, draw, add text boxes and sticky notes.",
  },
  {
    icon: Trash2,
    title: "Page operations",
    description: "Rotate, delete and reorder pages before you export.",
  },
  {
    icon: Gauge,
    title: "PDF export",
    description:
      "Flatten annotations into a clean, validated PDF and download it.",
  },
  {
    icon: ShieldCheck,
    title: "Local-first processing",
    description:
      "Documents are processed in your browser. Nothing is uploaded to a server.",
  },
  {
    icon: Zap,
    title: "Fast workspace",
    description:
      "Responsive editor with keyboard shortcuts and dark mode built in.",
  },
];

const COMING_SOON_DOCUMENTS = [
  { icon: FileText, label: "Word" },
  { icon: FileSpreadsheet, label: "Excel" },
  { icon: Presentation, label: "PowerPoint" },
  { icon: FileImage, label: "Images" },
  { icon: ScanText, label: "OCR" },
  { icon: Cloud, label: "Cloud storage" },
  { icon: Folder, label: "Folders" },
  { icon: Sparkles, label: "AI document tools" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Open the workspace",
    description:
      "No account needed. Enter as a guest and pick a PDF from your device.",
  },
  {
    step: "2",
    title: "Edit your document",
    description:
      "Annotate, search, rotate, delete or reorder pages — all in your browser.",
  },
  {
    step: "3",
    title: "Export your PDF",
    description:
      "Download the finished document. Guest exports: 3 free, then create an account.",
  },
];

function LogoMark() {
  return (
    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold">
      R
    </div>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <LogoMark />
          <span className="truncate text-sm font-semibold">RamSpace</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/workspace">
              Open workspace
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" aria-hidden="true" />
          Privacy-first document workspace
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
          Your private document workspace.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          RamSpace is a calm, simple workspace for working with documents in one
          place. PDF editing is available now — files are processed locally in
          your browser, with no unnecessary third-party uploads. More document
          types are on the way.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-44">
            <Link href="/workspace">
              Try for Free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-44">
            <a href="#features">Explore Features</a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          No account required · 3 free exports
        </p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-16 border-t border-border bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to work with PDFs
          </h2>
          <p className="mt-2 text-muted-foreground">
            The PDF workspace is available now. Each feature runs directly in
            your browser.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
                  <Icon className="size-4 text-foreground" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhyRamSpace() {
  const reasons = [
    {
      icon: Lock,
      title: "Private by default",
      description:
        "PDF editing happens entirely in your browser. Your files are never sent to a server.",
    },
    {
      icon: Zap,
      title: "Simple and fast",
      description:
        "Open, edit and export in minutes. No account, no setup, no waiting.",
    },
    {
      icon: Gauge,
      title: "Grows with you",
      description:
        "Cloud storage, folders and more document types are planned — one workspace for everything.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Why RamSpace
        </h2>
        <p className="mt-2 text-muted-foreground">
          A workspace designed around your documents — and your privacy.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {reasons.map((reason) => {
          const Icon = reason.icon;
          return (
            <div
              key={reason.title}
              className="flex flex-col gap-3 rounded-lg border border-border p-5"
            >
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">{reason.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {reason.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Privacy() {
  return (
    <section
      id="privacy"
      className="scroll-mt-16 border-t border-border bg-muted/30"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Your documents stay on your device
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            The current PDF workspace processes files locally in your browser
            using PDF.js and pdf-lib. Document contents are not uploaded to
            RamSpace servers or third-party services, and the editor works
            without sending your files anywhere.
          </p>
          <p className="mt-3 leading-7 text-muted-foreground">
            The guest export counter is stored only in your browser and is not
            security enforcement — clearing browser data resets it. Cloud
            storage, when it arrives, will be opt-in and account-based.
          </p>
        </div>
        <ul className="w-full max-w-sm space-y-3 text-sm text-muted-foreground">
          {[
            "Client-side PDF processing",
            "No document upload in the guest editor",
            "No analytics or tracking",
            "Open-source friendly architecture",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-foreground"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DocumentTypes() {
  return (
    <section
      id="documents"
      className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mb-10 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Supported document types
        </h2>
        <p className="mt-2 text-muted-foreground">
          PDF is available today. The rest of the workspace is being built.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
          <FileText className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">PDF</p>
          <p className="text-xs text-muted-foreground">
            View, annotate, edit pages, export
          </p>
        </div>
        <Badge className="shrink-0">Available now</Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COMING_SOON_DOCUMENTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 opacity-80"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                <Icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-muted-foreground">
            From PDF to finished document in three steps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.step}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold"
                aria-hidden="true"
              >
                {step.step}
              </span>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-12 text-center sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Start editing your PDFs — free
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Open the workspace as a guest right now. No account, no uploads — and
          three free exports to get you going.
        </p>
        <Button asChild size="lg" className="min-w-44">
          <Link href="/workspace">
            Try for Free
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="font-medium text-foreground">RamSpace</span>
          <span aria-hidden="true">·</span>
          <span>Private document workspace</span>
        </div>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <Link href="#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="#privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/workspace" className="hover:text-foreground">
            Open workspace
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <WhyRamSpace />
        <Privacy />
        <DocumentTypes />
        <HowItWorks />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
