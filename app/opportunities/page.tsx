"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ButtonColorful } from "@/components/ui/button-colorful"
import Link from "next/link"

import { mockJobData } from "@/lib/data/jobs"

const jobListings = Object.values(mockJobData)

export default function OpportunitiesPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Job Opportunities</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobListings.map(job => (
          <Link 
            href={`/opportunities/${job.id}`} 
            key={job.id}
            className="block relative hover:no-underline"
          >
            <Card className="relative hover:shadow-lg transition-shadow cursor-pointer">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>{job.company}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span>
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Type:</span>
                  <span>{job.type}</span>
                </div>
                <p className="mt-6 text-white-600">{job.description}</p>
                <div onClick={(e) => e.stopPropagation()}>
                  <Link href={`/opportunities/apply/${job.id}`}>
                    <ButtonColorful
                      label="Apply Now"
                      className="mt-4 w-full"
                    />
                  </Link>
                </div>
              </div>
            </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
