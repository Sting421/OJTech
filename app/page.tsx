import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Briefcase, Brain, UserCheck, Award, Rocket, CheckCircle } from "lucide-react";
import { HeroHeader } from "@/components/ui/wavey-hero-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#010915] text-white">
      {/* Reduced height hero section */}
      <div className="h-[70vh]">
        <HeroHeader 
          title="Find Your Perfect <br /> Internship Match"
          subtitle="Our AI-powered matching connects you with relevant job opportunities that align with your skills and aspirations."
          primaryButtonText="Explore Opportunities"
          primaryButtonUrl="/opportunities"
          secondaryButtonText="Upload Resume"
          secondaryButtonUrl="/profile"
          imageSrc="https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80"
        />
      </div>

      {/* About section with mission statement */}
      <section className="py-16 bg-[#010915]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-300 via-white to-gray-300 bg-clip-text text-transparent">
              Connecting Talented Students with Industry Opportunities
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              OJTech bridges the gap between academic learning and professional experience,
              using AI-powered matching to create meaningful connections between students and employers.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/opportunities">
                <Button className="group bg-white text-black hover:bg-gray-200">
                  Get Started <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-16 bg-[#010915]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How OJTech Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-[#000000] p-8 rounded-lg border border-[#111827]/40">
              <div className="bg-[#111111] p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Your Profile</h3>
              <p className="text-gray-300">
                Upload your resume and complete your profile. Our AI analyzes your skills, experience, 
                and educational background.
              </p>
            </div>
            
            <div className="bg-[#000000] p-8 rounded-lg border border-[#111827]/40">
              <div className="bg-[#111111] p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Matching</h3>
              <p className="text-gray-300">
                Our intelligent algorithm matches your profile with internship opportunities 
                that align with your skills and career goals.
              </p>
            </div>
            
            <div className="bg-[#000000] p-8 rounded-lg border border-[#111827]/40">
              <div className="bg-[#111111] p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Apply with Confidence</h3>
              <p className="text-gray-300">
                Review your matches, apply to positions with a single click, and track 
                your application status in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="py-16 bg-[#010915]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose OJTech</h2>
          
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto">
            <div className="flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Personalized Matching</h3>
                <p className="text-gray-300">
                  Our AI understands your unique skills and preferences to suggest only relevant opportunities.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Verified Employers</h3>
                <p className="text-gray-300">
                  All companies on our platform are thoroughly vetted to ensure legitimate opportunities.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Streamlined Applications</h3>
                <p className="text-gray-300">
                  Apply to multiple positions with just a few clicks - no repetitive form filling.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
                <p className="text-gray-300">
                  Receive instant notifications about application status, interview requests, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 bg-[#010915]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Launch Your Career?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of students who have found their perfect internship match with OJTech.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth/register">
                <Button className="bg-white text-black hover:bg-gray-200">
                  Sign Up Free
                </Button>
              </Link>
              <Link href="/opportunities">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  Browse Opportunities
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}