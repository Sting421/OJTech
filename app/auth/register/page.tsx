"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const registerSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine((email) => email.includes(".edu") || email.includes("ac.") || email.includes("edu."), {
      message: "Please use a valid educational email address",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      // If registration was successful
      if (data.user) {
        try {
          // Directly create a profile in case the database trigger doesn't work
          // Import the server function using next/dynamic to handle server actions in client components
          const { createUserProfile } = await import('@/lib/actions/auth-trigger');
          await createUserProfile(data.user.id, values.email, values.fullName);
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          // Continue anyway, the auth callback will try again
        }
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });

      // For development purposes, if email verification is disabled
      if (data.session) {
        router.push('/onboarding');
      } else {
        // Show verification message for production where email verification is required
        router.push('/auth/verify-email');
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">Sign up to get started with OJTech</p>
        </div>

        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john.doe@university.edu" disabled={loading} />
                    </FormControl>
                    <FormDescription>
                      Please use your educational email address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <OAuthButtons />

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
