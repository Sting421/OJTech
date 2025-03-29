'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ButtonColorful } from "@/components/ui/button-colorful"
import { ArrowLeft } from "lucide-react"
import { mockJobData } from "@/lib/data/jobs"

const getJobDetails = (id: string) => {
  return mockJobData[parseInt(id) as keyof typeof mockJobData];
}

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const job = getJobDetails(params.id)

  if (!job) {
    return (
      <main className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Job Not Found</h1>
      </main>
    )
  }

  return (
    <main className="container mx-auto py-8">
      <Link href="/opportunities" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Opportunities
      </Link>
      
      <Card className="relative">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{job.title}</CardTitle>
              <CardDescription className="text-xl mt-2">{job.company}</CardDescription>
            </div>
            <Link href={`/opportunities/apply/${job.id}`}>
              <ButtonColorful
                label="Apply Now"
              />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold">Location:</p>
              <p>{job.location}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Type:</p>
              <p>{job.type}</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Salary Range:</p>
              <p>{job.salary}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Description</h3>
            <p className="text-gray-600">{job.description}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Requirements</h3>
            <ul className="list-disc pl-5 space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-gray-600">{req}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-2">
              {job.responsibilities.map((resp, index) => (
                <li key={index} className="text-gray-600">{resp}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
