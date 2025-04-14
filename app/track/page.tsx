'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUserMostRecentCv } from "@/lib/actions/cv";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/auth-provider";

// Mock data - will be replaced with Supabase data later
const applications = [
  {
    id: 1,
    jobTitle: "Frontend Developer",
    company: "Tech Corp",
    appliedDate: "2024-03-25",
    status: "Under Review",
    lastUpdated: "2024-03-27",
    nextStep: "Technical Interview",
    requiredSkills: ["JavaScript", "TypeScript", "React", "Next.js", "CSS", "Tailwind", "Git"]
  },
  {
    id: 2,
    jobTitle: "Backend Engineer",
    company: "Data Systems",
    appliedDate: "2024-03-20",
    status: "Initial Screening",
    lastUpdated: "2024-03-22",
    nextStep: "HR Interview",
    requiredSkills: ["Java", "Spring Boot", "Python", "Django", "REST API", "Microservices", "Git"]
  },
  {
    id: 3,
    jobTitle: "UX Designer",
    company: "Creative Studio",
    appliedDate: "2024-03-15",
    status: "Shortlisted",
    lastUpdated: "2024-03-18",
    nextStep: "Portfolio Review",
    requiredSkills: ["Figma", "Adobe XD", "UI Design", "User Research", "Prototyping", "CSS"]
  }
]

const getStatusColor = (status: string) => {
  const statusColors = {
    'Under Review': 'bg-yellow-500',
    'Initial Screening': 'bg-blue-500',
    'Shortlisted': 'bg-green-500',
    'Rejected': 'bg-red-500',
    'Hired': 'bg-purple-500'
  } as const

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-500'
}

// Calculate match percentage based on skills
const calculateSkillMatch = (userSkills: string[], requiredSkills: string[]) => {
  if (!userSkills || !requiredSkills || requiredSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const userSkillsLower = userSkills.map(skill => skill.toLowerCase());
  const requiredSkillsLower = requiredSkills.map(skill => skill.toLowerCase());
  
  // Count matches
  let matches = 0;
  for (const skill of requiredSkillsLower) {
    if (userSkillsLower.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))) {
      matches++;
    }
  }
  
  return Math.round((matches / requiredSkills.length) * 100);
};

export default function TrackApplicationPage() {
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const { profile } = useAuth();
  
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
  
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Track Your Applications</h1>
      
      {userSkills.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
            <CardDescription>Skills extracted from your CV</CardDescription>
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
      
      <div className="space-y-6">
        {applications.map(app => {
          const matchPercentage = calculateSkillMatch(userSkills, app.requiredSkills);
          
          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{app.jobTitle}</CardTitle>
                    <CardDescription>{app.company}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(app.status)} text-white`}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Applied Date:</span>
                      <span>{app.appliedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Last Updated:</span>
                      <span>{app.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-medium">Skills Match:</span>
                      <span className="font-bold">{matchPercentage}%</span>
                    </div>
                    <Progress value={matchPercentage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Next Step:</span>
                      <span>{app.nextStep}</span>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium block mb-1">Required Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {app.requiredSkills.map((skill, index) => (
                          <Badge 
                            key={index} 
                            variant={userSkills.some(s => 
                              s.toLowerCase().includes(skill.toLowerCase()) || 
                              skill.toLowerCase().includes(s.toLowerCase())
                            ) ? "default" : "outline"}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button 
                        className="text-blue-500 hover:text-blue-700 font-medium"
                        onClick={() => alert('Details view coming soon!')}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  )
}
