import Link from 'next/link';
import { Video, Sparkles, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ClipSmart</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-6 pb-8 pt-16 md:pt-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Turn Long Videos Into
              <span className="text-primary"> Viral Shorts</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              AI-powered video processing that automatically identifies the best moments,
              generates subtitles, and creates viral-ready clips for TikTok, Reels, and Shorts.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button size="lg">Start Free</Button>
            </Link>
            <Button variant="outline" size="lg">
              View Demo
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container py-24">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Hook Generation"
              description="Automatically generate compelling hooks and titles optimized for viral engagement."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Viral Score"
              description="Get an explainable 0-100 score based on hook, emotion, pacing, clarity, and platform fit."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Fast Processing"
              description="FFmpeg-powered pipeline with silence detection and smart segment cutting."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 ClipSmart. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
