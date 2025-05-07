"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Company size options
const companySizeOptions = [
  { label: "1-10 employees", value: "1-10" },
  { label: "11-50 employees", value: "11-50" },
  { label: "51-200 employees", value: "51-200" },
  { label: "201-500 employees", value: "201-500" },
  { label: "501-1,000 employees", value: "501-1000" },
  { label: "1,001+ employees", value: "1001+" },
];

// Industry options
const industryOptions = [
  { label: "Information Technology", value: "Information Technology" },
  { label: "Software Development", value: "Software Development" },
  { label: "Web Development", value: "Web Development" },
  { label: "Mobile Development", value: "Mobile Development" },
  { label: "Data Science & Analytics", value: "Data Science" },
  { label: "AI & Machine Learning", value: "AI" },
  { label: "Cybersecurity", value: "Cybersecurity" },
  { label: "Cloud Computing", value: "Cloud Computing" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "Financial Technology", value: "FinTech" },
  { label: "Healthcare Technology", value: "HealthTech" },
  { label: "Education Technology", value: "EdTech" },
  { label: "Gaming", value: "Gaming" },
  { label: "Digital Marketing", value: "Digital Marketing" },
  { label: "Telecommunications", value: "Telecommunications" },
  { label: "Other", value: "Other" },
];

// Form validation schema
const formSchema = z.object({
  companySize: z.string().min(1, "Please select company size"),
  industry: z.string().min(1, "Please select an industry"),
  companyWebsite: z.string().url("Please enter a valid URL").or(z.string().length(0)),
  companyDescription: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyInfoFormProps {
  onSubmit: (data: FormValues) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}

interface ExtendedCompanyInfoFormProps extends CompanyInfoFormProps {
  companyName?: string;
}

export default function CompanyInfoForm({ onSubmit, defaultValues, companyName }: ExtendedCompanyInfoFormProps) {
  const [loading, setLoading] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      companyWebsite: "",
      companySize: "",
      industry: "",
      companyDescription: "",
    },
  });

  // Form submission handler
  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting company info:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      {companyName && (
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-medium text-lg">Company Name</h3>
          <p className="text-muted-foreground">{companyName}</p>
        </div>
      )}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="companyWebsite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Website</FormLabel>
              <FormControl>
                <Input placeholder="https://www.example.com" {...field} />
              </FormControl>
              <FormDescription>Optional but recommended</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="companySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Size</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companySizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="companyDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your company, its mission, and what makes it unique..."
                  {...field}
                  rows={5}
                />
              </FormControl>
              <FormDescription>
                This will be visible to candidates applying for your jobs
              </FormDescription>
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
