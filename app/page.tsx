import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { GraduationCap, BookOpen, FileText } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Student OJT Portal</h1>
          <p className="text-xl text-muted-foreground">
            Your gateway to meaningful internship opportunities
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-4">Complete Your Profile</h2>
              <p className="text-muted-foreground mb-6">
                Upload your CV and showcase your skills to potential employers
              </p>
              <Link href="/profile">
                <Button className="w-full">Update Profile</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-4">Browse Opportunities</h2>
              <p className="text-muted-foreground mb-6">
                Explore available internship positions matched to your skills
              </p>
              <Link href="/opportunities">
                <Button className="w-full">View Opportunities</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-4">Track Applications</h2>
              <p className="text-muted-foreground mb-6">
                Monitor the status of your internship applications
              </p>
              <Link href="/applications">
                <Button className="w-full">View Applications</Button>
              </Link>
            </div>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">Why Join Us?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-medium mb-2">AI-Powered Matching</h3>
              <p className="text-muted-foreground">
                Get matched with internships that align perfectly with your skills and interests
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">Verified Companies</h3>
              <p className="text-muted-foreground">
                Apply with confidence to thoroughly vetted internship opportunities
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">Career Growth</h3>
              <p className="text-muted-foreground">
                Gain valuable industry experience and kickstart your career
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}