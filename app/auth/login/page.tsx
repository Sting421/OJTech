"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      
      // Check if the user is an admin
      const { data: user } = await supabase.auth.getUser();

      if (!user || !user.user) {
        console.error("User not found after login attempt");
        return;
      }

      // Check user role and onboarding status
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, has_completed_onboarding")
        .eq("id", user.user.id)
        .single();
      
      // If admin, redirect to admin dashboard
      if (profile && profile.role === "admin") {
        toast.success("Logged in successfully");
        router.refresh();
        window.location.href = "/admin/dashboard";
        return;
      }
      
      // If employer and hasn't completed onboarding, redirect to employer onboarding
      if (profile && profile.role === "employer" && !profile.has_completed_onboarding) {
        toast.success("Logged in successfully");
        router.refresh();
        window.location.href = "/onboarding/employer";
        return;
      }
      
      // For all other users, refresh and redirect to home
      toast.success("Logged in successfully");
      router.refresh();
        // For all other users, refresh and redirect to home
        toast.success("Logged in successfully");
        router.refresh();
        window.location.href = "/";
    } catch (error) {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="flex min-h-screen flex-col items-center justify-center p-4">
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-6">
          <OAuthButtons />
        </div>
      </div>

      <p className="text-center text-sm text-gray-600 mt-8">
        Don't have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign up
        </Link>
      </p>
    </div>
  </div>
);
}
