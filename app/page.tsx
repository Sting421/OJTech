import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { GraduationCap, BookOpen, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Student OJT Portal</h1>
          <p className="text-xl text-gray-400">
            Your gateway to meaningful internship opportunities
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="bg-gray-900 border-gray-800 p-6 hover:bg-gray-800 transition-colors">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-white" />
              <h2 className="text-2xl font-semibold mb-4 text-white">Complete Your Profile</h2>
              <p className="text-gray-400 mb-6">
                Upload your CV and showcase your skills to potential employers
              </p>
              <Link href="/profile">
                <Button className="w-full bg-white text-black hover:bg-gray-200">Update Profile</Button>
              </Link>
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6 hover:bg-gray-800 transition-colors">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-white" />
              <h2 className="text-2xl font-semibold mb-4 text-white">Browse Opportunities</h2>
              <p className="text-gray-400 mb-6">
                Explore available internship positions matched to your skills
              </p>
              <Link href="/opportunities">
                <Button className="w-full bg-white text-black hover:bg-gray-200">View Opportunities</Button>
              </Link>
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6 hover:bg-gray-800 transition-colors">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-white" />
              <h2 className="text-2xl font-semibold mb-4 text-white">Track Applications</h2>
              <p className="text-gray-400 mb-6">
                Monitor the status of your internship applications
              </p>
              <Link href="/track">
                <Button className="w-full bg-white text-black hover:bg-gray-200">View Applications</Button>
              </Link>
            </div>
          </Card>
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-semibold mb-12">Why Join Us?</h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-medium mb-3">AI-Powered Matching</h3>
              <p className="text-gray-400">
                Get matched with internships that align perfectly with your skills and interests
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-3">Verified Companies</h3>
              <p className="text-gray-400">
                Apply with confidence to thoroughly vetted internship opportunities
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-3">Career Growth</h3>
              <p className="text-gray-400">
                Gain valuable industry experience and kickstart your career
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}