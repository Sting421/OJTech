"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// Form validation schema
const formSchema = z.object({
  contactPerson: z.string().min(2, "Contact person name must be at least 2 characters"),
  position: z.string().min(2, "Position must be at least 2 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.union([
    z.string().length(0),
    z.string().min(10, "Phone number must be at least 10 digits")
  ]),
  companyAddress: z.string().min(5, "Address must be at least 5 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactDetailsFormProps {
  onSubmit: (data: FormValues) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}

export default function ContactDetailsForm({ onSubmit, defaultValues }: ContactDetailsFormProps) {
  const [loading, setLoading] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      contactPerson: "",
      position: "",
      contactEmail: "",
      contactPhone: "",
      companyAddress: "",
    },
  });

  // Form submission handler
  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting contact details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8"> {/* Increased overall spacing */}
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} readOnly />
              </FormControl>
              <FormDescription>The primary contact person for your company</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="HR Manager" {...field} readOnly />
              </FormControl>
              <FormDescription>The position of the contact person</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="contact@example.com" type="email" {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormDescription>Optional</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="companyAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Business St, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </Form>
  );
}
