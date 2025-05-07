"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Loader2, PlusCircle, X, Check } from "lucide-react";
import { createJob, updateJob } from "@/lib/actions/job-client";
import { getEmployerByUserId } from "@/lib/actions/employer";
import { Job, JobStatus } from "@/lib/types/employer";
import { cn } from "@/lib/utils";
import { log } from "console";

// Form validation schema
const formSchema = z.object({
  title: z.string().min(5, "Job title must be at least 5 characters"),
  company_name: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Job location is required"),
  job_type: z.enum(["Full-time", "Part-time", "Contract", "Internship", "Freelance"], {
    required_error: "Job type is required"
  }),
  description: z.string().min(50, "Description must be at least 50 characters"),
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  application_deadline: z.string().optional(),
  status: z.enum(["open", "closed", "draft"] as [JobStatus, ...JobStatus[]]).default("open"),
  required_skills: z.array(z.string()).min(1, "At least one required skill is needed"),
});

type FormValues = z.infer<typeof formSchema>;

interface JobFormProps {
  job?: Job;
  isEditing?: boolean;
}

export default function JobForm({ job, isEditing = false }: JobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
      defaultValues: {
        title: job?.title || "Software Engineering Intern",
        company_name: "",  // Will be populated from employer data
        location: job?.location || "", // Location will be populated from employer data
        job_type: (job?.job_type || "Internship") as "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance",
        description: job?.description || "",
        min_salary: job?.min_salary,
        max_salary: job?.max_salary,
        application_deadline: job?.application_deadline ?
          new Date(job.application_deadline).toISOString().split('T')[0] : undefined,
        status: (job?.status as JobStatus) || "open",
        required_skills: job?.required_skills || [],
      },
  });

  useEffect(() => {
    // Fetch employer data using server action
    const fetchEmployerData = async () => {
      try {
        const result = await getEmployerByUserId();
        if (result.success && result.data) {
          form.setValue('company_name', result.data.name);
          form.setValue('location', result.data.company_address || "");
        } else {
          console.error('Failed to fetch employer data:', result.error);
          toast({
            title: "Error",
            description: result.warning || result.error || "Failed to load employer data",
            variant: "destructive",
          });
          router.push("/onboarding/employer"); // Redirect to employer onboarding
        }
      } catch (error) {
        console.error('Failed to fetch employer data:', error);
        // Optionally handle the error
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployerData();
  }, [form]); // Add form as a dependency

  // Get required skills from job or use empty array
  const initialRequiredSkills = Array.isArray(job?.required_skills) ? job.required_skills : [];
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initialRequiredSkills);

  // Log to debug
  useEffect(() => {
    if (job) {
      console.log("[JobForm] Initializing with job:", job);
      console.log("[JobForm] Required skills from job:", job.required_skills);
      console.log("[JobForm] Initial required skills set:", initialRequiredSkills);
    }
  }, [job, initialRequiredSkills]);

  const [newSkill, setNewSkill] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>(
    job?.preferred_skills || []
  );
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const newSkillInputRef = useRef<HTMLInputElement>(null);
  const newPreferredSkillInputRef = useRef<HTMLInputElement>(null);
  const [openRequiredSkillsPopover, setOpenRequiredSkillsPopover] = useState(false);
  const [openPreferredSkillsPopover, setOpenPreferredSkillsPopover] = useState(false);

  // Dummy list of skills for autocomplete
  const availableSkills = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express.js",
    "Python", "Django", "Flask", "Java", "Spring", "C#", ".NET", "Go", "Ruby",
    "Ruby on Rails", "PHP", "Laravel", "SQL", "PostgreSQL", "MySQL", "MongoDB",
    "REST API", "GraphQL", "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud",
    "CI/CD", "Agile", "Scrum", "Git", "HTML", "CSS", "Tailwind CSS", "Redux",
    "Vue.js", "Angular", "Swift", "Kotlin", "Rust", "DevOps", "Machine Learning",
    "Data Science", "Cybersecurity", "Blockchain", "Problem Solving", "Communication",
    "Teamwork", "Leadership", "Critical Thinking", "Adaptability", "Time Management", "Android Studio",
    "iOS Development", "UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator",
    "SEO", "Digital Marketing", "Content Writing", "Public Speaking", "Networking",
    "Project Management", "Business Analysis", "Financial Analysis", "Data Analysis",
    "Statistical Analysis", "Research", "Customer Service", "Sales", "Negotiation",
    "Presentation Skills", "Interpersonal Skills", "Creativity", "Attention to Detail",
    "Analytical Skills", "Decision Making", "Conflict Resolution", "Mentoring", "Objective-C",
    "Xamarin", "React Native", "Flutter"
  ];

  const onSubmit = async (data: FormValues) => {
    console.log("onSubmit called");
    console.log("Form errors:", form.formState.errors);
    console.log("Required Skills:", requiredSkills); // Log requiredSkills
    setIsSubmitting(true);
    try {
      let result;
      // Use the form data directly since we're already syncing required_skills
  
      // Ensure company_name is included from the form
      const companyName = form.getValues('company_name');
      if (!companyName) {
        throw new Error("Company name is required. Please wait for employer data to load.");
      }

      const { min_salary, max_salary, ...rest } = data;

      // Create salary_range object only if at least one salary value is provided
      let salary_range = undefined;
      if (min_salary !== undefined || max_salary !== undefined) {
        salary_range = {
          min: min_salary || 0,
          max: max_salary || 0
        };
      }

      const jobData = {
        ...rest,
        company_name: companyName,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        salary_range
      };

      console.log("Job Data:", jobData); // Log jobData

      if (isEditing && job) {
        // Update existing job
        console.log("Updating job with ID:", job.id);
        console.log("Job Data for update:", jobData); // Log jobData for update
        
        result = await updateJob(job.id, jobData);
      } else {
        // Create new job
        result = await createJob(jobData);
      }

      if (result.success) {
        toast({
          title: isEditing ? "Job Updated" : "Job Created",
          description: isEditing
            ? "Your job posting has been updated successfully."
            : "Your job posting has been created successfully.",
        });
        router.push("/employer/jobs");
      } else {
        console.error("Server error:", result.error);
        toast({
          title: "Error",
          description: `Server error: ${result.error || "Something went wrong"}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting job:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRequiredSkill = (skill: string) => {
    if (skill.trim() && !requiredSkills.includes(skill.trim())) {
      const updatedSkills = [...requiredSkills, skill.trim()];
      setRequiredSkills(updatedSkills);
      form.setValue('required_skills', updatedSkills); // Update form value
      setNewSkill("");
      setOpenRequiredSkillsPopover(false);
      if (newSkillInputRef.current) {
        newSkillInputRef.current.focus();
      }
    }
  };

  const removeRequiredSkill = (skill: string) => {
    const updatedSkills = requiredSkills.filter((s) => s !== skill);
    setRequiredSkills(updatedSkills);
    form.setValue('required_skills', updatedSkills); // Update form value
  };

  const addPreferredSkill = (skill: string) => {
    if (skill.trim() && !preferredSkills.includes(skill.trim())) {
      setPreferredSkills([...preferredSkills, skill.trim()]);
      setNewPreferredSkill("");
      setOpenPreferredSkillsPopover(false);
      if (newPreferredSkillInputRef.current) {
        newPreferredSkillInputRef.current.focus();
      }
    }
  };

  const removePreferredSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter((s) => s !== skill));
  };

  const handleSkillKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRequiredSkill(newSkill);
    }
  };

  const handlePreferredSkillKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPreferredSkill(newPreferredSkill);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Software Engineer, Web Developer"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hidden fields for form data */}
          <input type="hidden" {...form.register('company_name')} />
          <input type="hidden" {...form.register('required_skills')} />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Location <span className="text-red-500">*</span></FormLabel>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="remote"
                      value="Remote"
                      checked={field.value === "Remote"}
                      onChange={() => field.onChange("Remote")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <label htmlFor="remote">Remote</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="company"
                      value={form.getValues('location')} // Use current form value for company location
                      checked={field.value !== "Remote"}
                      onChange={() => {
                        const companyAddress = form.getValues('location');
                        if (companyAddress && companyAddress !== "Remote") {
                          field.onChange(companyAddress);
                        }
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <label htmlFor="company" >{form.getValues('location') !== "Remote" ? form.getValues('location') : 'Company Address'}</label>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="job_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Type <span className="text-red-500">*</span></FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="min_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Salary</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Optional - minimum salary offered</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Salary</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 70000"
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Optional - maximum salary offered</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="application_deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Deadline</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional - the last day applications will be accepted</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the job, responsibilities, and requirements..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
          </FormItem>
        )}
        />

        <div>
          <FormLabel>Required Skills <span className="text-red-500">*</span></FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {requiredSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeRequiredSkill(skill)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {skill}</span>
                </Button>
              </Badge>
            ))}
          </div>
          <Popover open={openRequiredSkillsPopover} onOpenChange={setOpenRequiredSkillsPopover}>
            <PopoverTrigger asChild>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a required skill"
                  value={newSkill}
                  onChange={(e) => {
                    console.log("Input value:", e.target.value);
                    setNewSkill(e.target.value);
                    console.log("New skill state after set:", newSkill); // Note: This will log the *previous* state value
                    setOpenRequiredSkillsPopover(true);
                  }}
                  onKeyDown={handleSkillKeyPress}
                  ref={newSkillInputRef}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addRequiredSkill(newSkill)}
                  disabled={!newSkill.trim()}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search skills..." value={newSkill} onValueChange={setNewSkill} />
                <CommandList>
                  <CommandEmpty>No skills found.</CommandEmpty>
                  <CommandGroup>
                    {availableSkills
                      .filter(skill => skill.toLowerCase().includes(newSkill.toLowerCase()) && !requiredSkills.includes(skill))
                      .map(skill => (
                        <CommandItem
                          key={skill}
                          value={skill}
                          onSelect={(currentValue) => {
                            addRequiredSkill(currentValue);
                          }}
                        >
                          {skill}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              requiredSkills.includes(skill) ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <FormLabel>Preferred Skills (Optional)</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {preferredSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="gap-1">
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removePreferredSkill(skill)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {skill}</span>
                </Button>
              </Badge>
            ))}
          </div>
          <Popover open={openPreferredSkillsPopover} onOpenChange={setOpenPreferredSkillsPopover}>
            <PopoverTrigger asChild>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a preferred skill"
                  value={newPreferredSkill}
                  onChange={(e) => {
                    setNewPreferredSkill(e.target.value);
                    setOpenPreferredSkillsPopover(true);
                  }}
                  onKeyDown={handlePreferredSkillKeyPress}
                  ref={newPreferredSkillInputRef}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addPreferredSkill(newPreferredSkill)}
                  disabled={!newPreferredSkill.trim()}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search skills..." value={newPreferredSkill} onValueChange={setNewPreferredSkill} />
                <CommandList>
                  <CommandEmpty>No skills found.</CommandEmpty>
                  <CommandGroup>
                    {availableSkills
                      .filter(skill => skill.toLowerCase().includes(newPreferredSkill.toLowerCase()) && !preferredSkills.includes(skill))
                      .map(skill => (
                        <CommandItem
                          key={skill}
                          value={skill}
                          onSelect={(currentValue) => {
                            addPreferredSkill(currentValue);
                          }}
                        >
                          {skill}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              preferredSkills.includes(skill) ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Status <span className="text-red-500">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Draft: Save without publishing. Open: Visible to candidates. Closed: No longer accepting applications.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/employer/jobs")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{isEditing ? "Update Job" : "Create Job"}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
