import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ClientAuthProvider } from "@/providers/client-auth-provider";
import { OnboardingCheckLayout } from '@/components/layouts/onboarding-check-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OJT Management Portal',
  description: 'Connect students with employers for internship opportunities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white min-h-screen`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClientAuthProvider>
            <Navbar />
            <main className="flex-grow">
              <OnboardingCheckLayout>
                {children}
              </OnboardingCheckLayout>
            </main>
            <Footer />
            <Toaster />
          </ClientAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
