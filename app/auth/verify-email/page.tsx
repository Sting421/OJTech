"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-300" />
          </div>
          
          <h1 className="text-2xl font-bold">Check your email</h1>
          
          <p className="text-muted-foreground">
            We've sent you a verification link to complete your registration.
            Please check your email inbox and click the link to verify your account.
          </p>
          
          <div className="text-sm text-muted-foreground mt-2">
            <p>The email might take a few minutes to arrive.</p>
            <p>Be sure to check your spam folder if you don't see it.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
