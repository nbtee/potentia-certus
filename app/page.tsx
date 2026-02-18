import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Redirect authenticated users straight to dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/tech_stack_app_bg.jpg')" }}
    >
      <div className="max-w-2xl mx-auto text-center px-4">
        <Image
          src="/Potentia_logo_full.svg"
          alt="Potentia"
          width={200}
          height={50}
          className="mx-auto mb-8"
          priority
        />
        <h1 className="text-5xl font-bold text-white mb-4">
          Potentia Certus
        </h1>
        <p className="text-xl text-white/80 mb-8">
          Recruitment Data Intelligence Platform
        </p>
        <p className="text-white/60 mb-8">
          Transform your Bullhorn data into actionable insights with AI-powered dashboards
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-brand-dark transition-colors font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-white/10 text-white border border-white/30 rounded-lg hover:bg-white/20 backdrop-blur-sm transition-colors font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
