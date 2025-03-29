'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock data - will be replaced with Supabase data later
const applications = [
  {
    id: 1,
    jobTitle: "Frontend Developer",
    company: "Tech Corp",
    appliedDate: "2024-03-25",
    status: "Under Review",
    lastUpdated: "2024-03-27",
    nextStep: "Technical Interview"
  },
  {
    id: 2,
    jobTitle: "Backend Engineer",
    company: "Data Systems",
    appliedDate: "2024-03-20",
    status: "Initial Screening",
    lastUpdated: "2024-03-22",
    nextStep: "HR Interview"
  },
  {
    id: 3,
    jobTitle: "UX Designer",
    company: "Creative Studio",
    appliedDate: "2024-03-15",
    status: "Shortlisted",
    lastUpdated: "2024-03-18",
    nextStep: "Portfolio Review"
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

export default function TrackApplicationPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Track Your Applications</h1>
      
      <div className="space-y-6">
        {applications.map(app => (
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
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Next Step:</span>
                    <span>{app.nextStep}</span>
                  </div>
                  <div className="flex justify-end">
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
        ))}
      </div>
    </main>
  )
}
