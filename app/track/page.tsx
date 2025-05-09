'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUserMostRecentCv } from "@/lib/actions/cv";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/auth-provider";
import { getStudentApplications } from "@/lib/actions/application";
import { Loader2, Briefcase, MapPin, Calendar, Clock, CheckCircle, AlertCircle, ArrowRight, Building, ArrowUpDown } from "lucide-react";
import { formatDate } from "@/lib/utils/date-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApplicationCard } from "@/components/ui/application-card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Add custom CSS for progress indicators
import "./track.css";

// Map job application status to display colors
const getStatusColor = (status: string) => {
  const statusColors = {
    'pending': 'bg-yellow-500',
    'reviewed': 'bg-blue-500',
    'shortlisted': 'bg-green-500',
    'rejected': 'bg-red-500',
    'hired': 'bg-purple-500'
  } as const

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-500'
}

// Function to process skill text for better matching
const normalizeSkill = (skill: string): string => {
  return skill
    .toLowerCase()
    .replace(/[-_.&+,/()]/g, ' ')  // Replace common separators with spaces
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .trim();                        // Remove leading/trailing spaces
}

// Calculate skill match percentage with improved algorithm
const calculateSkillMatch = (userSkills: string[], requiredSkills: string[]): number => {
  if (!userSkills || !requiredSkills || requiredSkills.length === 0) return 0;
  
  // Normalize skills for better matching
  const userSkillsNormalized = userSkills.map(normalizeSkill);
  const requiredSkillsNormalized = requiredSkills.map(normalizeSkill);
  
  // Create variant forms of skills
  const userSkillVariants = new Set<string>();
  userSkillsNormalized.forEach(skill => {
    userSkillVariants.add(skill);
    
    // Add common abbreviations and variations
    const words = skill.split(' ');
    if (words.length > 1) {
      // Add acronym (e.g., "React Native" -> "rn")
      userSkillVariants.add(words.map(word => word[0]).join(''));
      
      // Add first word (e.g., "javascript programming" -> "javascript")
      userSkillVariants.add(words[0]);
    }
    
    // Handle common skill variations
    const variations: Record<string, string[]> = {
      'javascript': ['js', 'es6', 'ecmascript'],
      'typescript': ['ts'],
      'react': ['reactjs', 'react.js'],
      'node': ['nodejs', 'node.js'],
      'python': ['py'],
      'java': ['java programming'],
      'c#': ['csharp', 'c sharp'],
      'machine learning': ['ml'],
      'artificial intelligence': ['ai'],
      'aws': ['amazon web services'],
      'azure': ['microsoft azure'],
      'ui': ['user interface'],
      'ux': ['user experience'],
    };
    
    // Add variations
    Object.entries(variations).forEach(([key, vals]) => {
      if (skill.includes(key)) {
        vals.forEach(v => userSkillVariants.add(v));
      }
      if (vals.some(v => skill.includes(v))) {
        userSkillVariants.add(key);
      }
    });
  });
  
  // Calculate matches with weighted scoring
  let totalScore = 0;
  const requiredSkillsCount = requiredSkillsNormalized.length;
  
  requiredSkillsNormalized.forEach(requiredSkill => {
    // Exact match (highest weight)
    if (userSkillVariants.has(requiredSkill)) {
      totalScore += 1.0;
      return;
    }
    
    // Partial matches (lower weights)
    let bestPartialScore = 0;
    
    userSkillVariants.forEach(userSkill => {
      // Skill contains the required skill or vice versa (e.g., "React" matches "React Native")
      if (userSkill.includes(requiredSkill) || requiredSkill.includes(userSkill)) {
        const containmentScore = 0.8;
        bestPartialScore = Math.max(bestPartialScore, containmentScore);
    }
      
      // Individual word matches (for multi-word skills)
      const userWords = userSkill.split(' ');
      const requiredWords = requiredSkill.split(' ');
      
      if (userWords.length > 1 || requiredWords.length > 1) {
        const commonWords = userWords.filter(word => 
          word.length > 2 && requiredWords.some(reqWord => reqWord === word)
        );
        
        if (commonWords.length > 0) {
          const wordMatchScore = 0.5 * (commonWords.length / Math.max(userWords.length, requiredWords.length));
          bestPartialScore = Math.max(bestPartialScore, wordMatchScore);
        }
      }
    });
    
    totalScore += bestPartialScore;
  });
  
  // Convert to percentage and ensure within bounds
  const matchPercentage = Math.round((totalScore / requiredSkillsCount) * 100);
  return Math.min(100, Math.max(0, matchPercentage));
};

// Get the next step message based on application status
const getNextStepMessage = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Your application is awaiting review by the employer';
    case 'reviewed':
      return 'Employer has reviewed your application and is considering shortlisting';
    case 'shortlisted':
      return 'Congratulations! You have been shortlisted for an interview';
    case 'rejected':
      return 'The employer has chosen to proceed with other candidates';
    case 'hired':
      return 'Congratulations! You have been hired for this position';
    default:
      return 'Application status is being processed';
  }
};

export default function TrackApplicationPage() {
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [sortOption, setSortOption] = useState("date");
  const { profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Load CV skills
  useEffect(() => {
    async function loadCvSkills() {
      try {
        // First check if skills are in the profile cv_data
        if (profile?.cv_data?.extracted_skills || profile?.cv_data?.skills) {
          const skills = profile.cv_data.extracted_skills || profile.cv_data.skills;
          console.log("Using skills from profile cv_data:", skills);
          setUserSkills(skills);
          return;
        }
        
        // If not in profile, try to get from CV
        const result = await getCurrentUserMostRecentCv();
        if (result.success && result.data && result.data.skills) {
          console.log("Using skills from CV record:", result.data.skills.skills);
          setUserSkills(result.data.skills.skills || []);
        }
      } catch (error) {
        console.error("Error loading CV skills:", error);
      }
    }
    
    loadCvSkills();
  }, [profile]);
  
  // Load applications
  useEffect(() => {
    async function loadApplications() {
      try {
        setIsLoading(true);
        const result = await getStudentApplications(1, 50); // Get up to 50 applications
        
        if (result.success && result.data) {
          setApplications(result.data.applications);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load applications",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading applications:", error);
        toast({
          title: "Error",
          description: "Failed to load your applications",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadApplications();
  }, [toast]);

  // Filter applications based on active tab
  const filteredApplications = activeTab === "all" 
    ? applications
    : applications.filter(app => app.status === activeTab);
  
  // Sort applications based on sort option
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortOption === "match") {
      const scoreA = typeof a.match_score === 'number' ? a.match_score : 0;
      const scoreB = typeof b.match_score === 'number' ? b.match_score : 0;
      return scoreB - scoreA; // Sort by match score descending
    } else {
      // Default: sort by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  
  // Handler for viewing job details
  const handleViewJobDetails = (jobId: string) => {
    // Since we've removed opportunities/[id], let's just provide feedback to the user
    toast({
      title: "Job Details",
      description: "Detailed job information is now available directly on this page",
    });
  };
  
  return (
    <main className="container mx-auto py-10 px-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Track Your Applications</h1>
              <p className="text-muted-foreground mt-2">
                Monitor your job applications and track their progress
              </p>
            </div>
            <Button
              onClick={() => router.push('/opportunities')}
              className="self-start md:self-end"
            >
              Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {userSkills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Skills from Your CV</CardTitle>
                <CardDescription>These skills are used to match you with job opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userSkills.slice(0, 15).map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                  {userSkills.length > 15 && (
                    <Badge variant="outline">+{userSkills.length - 15} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="h-auto p-1">
                <TabsTrigger value="all" className="rounded-md px-3 py-1.5">
                  All Applications
                </TabsTrigger>
                <TabsTrigger value="pending" className="rounded-md px-3 py-1.5">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="reviewed" className="rounded-md px-3 py-1.5">
                  Reviewed
                </TabsTrigger>
                <TabsTrigger value="shortlisted" className="rounded-md px-3 py-1.5">
                  Shortlisted
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Select 
                  value={sortOption} 
                  onValueChange={setSortOption}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Date Applied</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="match">
                      <div className="flex items-center">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <span>Match Score</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  {filteredApplications.length} 
                  {activeTab === "all" 
                    ? " total applications" 
                    : ` ${activeTab} application${filteredApplications.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading your applications...</p>
                  </CardContent>
                </Card>
              ) : filteredApplications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="bg-muted rounded-full p-3 mb-4">
                      <Briefcase className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No applications found</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      {activeTab === "all" 
                        ? "You haven't applied to any jobs yet. Start exploring opportunities to kickstart your career." 
                        : `You don't have any applications with '${activeTab}' status.`}
                    </p>
                    {activeTab === "all" && (
                      <Button onClick={() => router.push('/opportunities')}>
                        Browse Job Opportunities
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {sortedApplications.map(app => {
                    // Get required skills from job data if available
                    const requiredSkills = app.job?.required_skills || [];
                    
                    // Use the match_score from the application if available (from database)
                    // Otherwise fall back to calculating it on the frontend
                    const matchPercentage = typeof app.match_score === 'number' 
                      ? Math.round(app.match_score) 
                      : calculateSkillMatch(userSkills, Array.isArray(requiredSkills) ? requiredSkills : []);
                    
                    return (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        userSkills={userSkills}
                        matchPercentage={matchPercentage}
                        onViewDetails={handleViewJobDetails}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
