'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const jobId = params.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle form submission to your backend
    // For now, we'll just show a success message and redirect
    alert('Application submitted successfully!')
    router.push('/opportunities')
  }

  return (
    <main className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Job Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input 
                id="experience" 
                name="experience" 
                type="number" 
                min="0"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume Link</Label>
              <Input 
                id="resume" 
                name="resume" 
                type="url" 
                placeholder="Link to your resume (Google Drive, Dropbox, etc.)"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter</Label>
              <Textarea 
                id="coverLetter" 
                name="coverLetter" 
                placeholder="Tell us why you're interested in this position..."
                className="h-32"
                required 
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="w-full">
                Submit Application
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
