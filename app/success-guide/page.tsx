"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Brain,
  FileText,
  Briefcase,
  Star,
  ArrowRight,
  CheckCircle,
  BookOpen,
  Target,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  ChevronRight
} from "lucide-react";

export default function SuccessGuidePage() {
  const { user, profile, refreshUser } = useAuth();

  const [cvProcessingStatus, setCvProcessingStatus] = useState<{
    stage: string;
    progress: number;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getProgressForStage = (stage: string | null): number => {
    if (!stage) return 100;
    switch (stage) {
      case 'uploading': return 25;
      case 'parsing': return 50;
      case 'analyzing': return 75;
      case 'matching': return 90;
      case 'complete': return 100;
      case 'error': return 0;
      default: return 100;
    }
  };

  const fetchCvProcessingStatusLocal = async (userId: string, isMountedCheck: () => boolean) => {
    try {
      if (!isMountedCheck()) return;
      setIsLoading(true); 
      console.log('[fetchCvProcessingStatusLocal] Fetching for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('cv_processing_status, cv_processing_error')
        .eq('id', userId)
        .single();
      
      console.log('[fetchCvProcessingStatusLocal] DB response:', { data, error });

      if (isMountedCheck()) {
        if (data) {
          const newStatus = {
            stage: data.cv_processing_status || 'complete',
            progress: getProgressForStage(data.cv_processing_status),
            error: data.cv_processing_error
          };
          console.log('[fetchCvProcessingStatusLocal] Setting new CV status state:', newStatus);
          setCvProcessingStatus(newStatus);
        } else if (error) {
          console.error('[fetchCvProcessingStatusLocal] Error fetching CV processing status:', error);
        }
      }
    } catch (err) {
      if (isMountedCheck()) console.error('[fetchCvProcessingStatusLocal] Exception fetching CV processing status:', err);
    } finally {
      if (isMountedCheck()) setIsLoading(false);
    }
  };
  
  useEffect(() => {
    let isMounted = true;
    const isMountedCheck = () => isMounted;

    if (user?.id) {
      fetchCvProcessingStatusLocal(user.id, isMountedCheck);
      const statusInterval = setInterval(() => {
        if (user?.id) fetchCvProcessingStatusLocal(user.id, isMountedCheck);
      }, 5000);
      return () => {
        isMounted = false;
        clearInterval(statusInterval);
      };
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const getProfileCompletion = () => {
    if (!profile) return 0;
    let score = 0;
    const totalItems = 5;
    if (profile.has_uploaded_cv) score++;
    if (profile.github_profile) score++;
    if ('skills' in profile && profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) score++;
    if ('education' in profile && profile.education && Array.isArray(profile.education) && profile.education.length > 0) score++;
    if ('experience' in profile && profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0) score++;
    return Math.round((score / totalItems) * 100);
  };

  const getCvStatusMessage = () => {
    console.log('[getCvStatusMessage] Current cvProcessingStatus state:', cvProcessingStatus);
    if (!cvProcessingStatus) return 'Checking CV status...';
    switch (cvProcessingStatus.stage) {
      case 'uploading': return 'Your CV is being uploaded...';
      case 'parsing': return 'Extracting information from your CV...';
      case 'analyzing': return 'Analyzing your skills and experience...';
      case 'matching': return 'Finding matching job opportunities...';
      case 'complete':
      case 'completed': return 'CV processing complete! Your profile is ready.';
      case 'error': return `CV processing error: ${cvProcessingStatus.error || 'Unknown issue'}`;
      default: 
        console.warn('[getCvStatusMessage] Hit default case with stage:', cvProcessingStatus.stage);
        return 'CV status is currently unknown.';
    }
  };

  const isCvProcessing = () => {
    if (!cvProcessingStatus) return true;
    return ['uploading', 'parsing', 'analyzing', 'matching'].includes(cvProcessingStatus.stage);
  };

  const handleRetry = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      await supabase
        .from('profiles')
        .update({ cv_processing_status: 'uploading', cv_processing_error: null })
        .eq('id', user.id);
      await supabase
        .from('cvs')
        .update({ status: 'uploaded', error_message: null })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      await refreshUser();
      if (user?.id) fetchCvProcessingStatusLocal(user.id, () => true);
    } catch (error) {
      console.error('Error resetting CV processing status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cardClasses = "bg-gradient-to-br from-[#111111] to-[#0A0A0A] p-6 md:p-8 rounded-xl border border-[#222222] backdrop-blur-sm transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)] relative overflow-hidden group";
  const sectionTitleClasses = "text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent";
  const sectionSubtitleClasses = "text-xl text-gray-400 mb-10 leading-relaxed";
  const iconWrapperClasses = "bg-gradient-to-br from-[#0A0A0A] to-black p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 border border-gray-800 group-hover:border-gray-700 transition-all duration-300 relative";

  if (isLoading && (!cvProcessingStatus || !profile)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="py-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-black to-transparent opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Your Path to Success
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto">
              Maximize your internship prospects by understanding our AI matching and perfecting your profile.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-black relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            <Card className={`${cardClasses} ${cvProcessingStatus?.stage === 'error' ? 'border-red-700/50 bg-red-950/30' : ''} before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-gray-800/5 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {isCvProcessing() && cvProcessingStatus?.stage !== 'error' ? (
                    <div className="relative">
                      <Loader2 className="h-7 w-7 text-blue-400 animate-spin flex-shrink-0" />
                      <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                    </div>
                  ) : cvProcessingStatus?.stage === 'error' ? (
                    <AlertCircle className="h-7 w-7 text-red-400 flex-shrink-0 animate-pulse" />
                  ) : (
                    <div className="relative">
                      <CheckCircle className="h-7 w-7 text-green-400 flex-shrink-0" />
                      <div className="absolute inset-0 bg-green-400/20 rounded-full scale-150 animate-pulse"></div>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold mb-1 text-gray-100">CV Processing Status</h2>
                    <p className={`text-sm ${cvProcessingStatus?.stage === 'error' ? 'text-red-300' : 'text-gray-400'}`}>
                      {getCvStatusMessage()}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {cvProcessingStatus?.stage === 'error' && (
                    <Button 
                      variant="outline" 
                      className="border-red-600/50 text-red-300 hover:bg-red-700/30 hover:text-red-200 px-4 py-2 text-sm transition-all duration-300"
                      onClick={handleRetry}
                      disabled={isLoading}
                    >
                      {isLoading && cvProcessingStatus.stage === 'error' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                       Retry Upload
                    </Button>
                  )}
                  {isCvProcessing() && cvProcessingStatus?.stage !== 'error' && cvProcessingStatus?.progress !== undefined && (
                    <div className="w-full sm:w-32 text-right">
                      <Progress value={cvProcessingStatus.progress} className="h-2 bg-gray-800/50 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-blue-400" />
                      <p className="text-xs text-gray-500 mt-1">{cvProcessingStatus.progress}% Complete</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#0A0A0A] relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-800/50 to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-5"></div>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-16">
            <div>
              <div className="text-center mb-12">
                <h2 className={sectionTitleClasses}>How Our AI Matching Works</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-gray-700 to-gray-500 mx-auto rounded-full"></div>
              </div>
              <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
                <div className={`${cardClasses} group`}>
                  <div className={`${iconWrapperClasses} group-hover:scale-110`}>
                    <FileText className="w-7 h-7 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100">1. CV Analysis</h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Our AI extracts skills, experience, and qualifications from your CV.</p>
                </div>
                <div className={`${cardClasses} group`}>
                  <div className={`${iconWrapperClasses} group-hover:scale-110`}>
                    <Target className="w-7 h-7 text-green-400 group-hover:text-green-300 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100">2. Job Matching</h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">We compare your profile against job requirements for best fit.</p>
                </div>
                <div className={`${cardClasses} group`}>
                  <div className={`${iconWrapperClasses} group-hover:scale-110`}>
                    <Star className="w-7 h-7 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100">3. Match Score</h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Receive a relevance score based on skill alignment and other factors.</p>
                </div>
              </div>
            </div>

            <div>
              <div className="text-center mb-12">
                <h2 className={sectionTitleClasses}>Supercharge Your Resume</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-gray-700 to-gray-500 mx-auto rounded-full"></div>
              </div>
              <Card className={cardClasses}>
                <ul className="space-y-6">
                  {[
                    { title: "Highlight Relevant Skills", text: "Focus on technical skills matching job descriptions. Use industry-standard terminology.", icon: <TrendingUp className="h-5 w-5 text-green-400 group-hover:text-green-300 transition-colors" /> },
                    { title: "Quantify Achievements", text: "Use numbers to show impact. E.g., \"Improved process efficiency by 20%\".", icon: <CheckCircle className="h-5 w-5 text-green-400 group-hover:text-green-300 transition-colors" /> },
                    { title: "Showcase Projects", text: "Link GitHub repos and live demos. Document your process and outcomes.", icon: <Briefcase className="h-5 w-5 text-green-400 group-hover:text-green-300 transition-colors" /> }
                  ].map((item, index) => (
                    <li key={item.title} className="flex items-start gap-4 p-4 rounded-lg bg-black/30 hover:bg-black/50 transition-colors">
                      <div className="bg-gradient-to-br from-[#0A0A0A] to-black p-2 rounded-lg border border-gray-800">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-200 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-400">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div>
              <div className="text-center mb-12">
                <h2 className={sectionTitleClasses}>Steps to Getting Hired</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-gray-700 to-gray-500 mx-auto rounded-full"></div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className={`${cardClasses} group`}>
                  <h3 className="text-lg font-semibold mb-4 text-gray-100 flex items-center">
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-2 rounded-lg mr-3">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                    </div>
                    Before Applying
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    {['Complete your OJTech profile thoroughly.', 'Ensure your GitHub showcases recent projects.', 'Research target companies and their tech stacks.'].map((text, index) => (
                      <li key={index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                        <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-purple-500/20 text-purple-300 font-medium">{index + 1}</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className={`${cardClasses} group`}>
                  <h3 className="text-lg font-semibold mb-4 text-gray-100 flex items-center">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-2 rounded-lg mr-3">
                      <Target className="h-5 w-5 text-blue-400" />
                    </div>
                    After Matching
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    {['Review job details and requirements carefully.', 'Prepare project examples for interviews.', 'Track application status and follow up.'].map((text, index) => (
                      <li key={index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                        <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-blue-500/20 text-blue-300 font-medium">{index + 1}</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>

            <div>
              <div className="text-center mb-12">
                <h2 className={sectionTitleClasses}>Valuable Resources</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-gray-700 to-gray-500 mx-auto rounded-full"></div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className={`${cardClasses} group`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-2 rounded-lg">
                      <BookOpen className="h-6 w-6 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-100">Technical Skill Boosters</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-400">
                    {['Practice on LeetCode/HackerRank.', 'Build full-stack projects with modern tech.', 'Contribute to open-source.'].map((text, index) => (
                      <li key={index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                        <Check className="h-4 w-4 text-orange-400" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className={`${cardClasses} group`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-2 rounded-lg">
                      <Brain className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-100">Soft Skill Development</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-400">
                    {['Practice mock interviews.', 'Document your problem-solving approach.', 'Hone technical communication.'].map((text, index) => (
                      <li key={index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                        <Check className="h-4 w-4 text-purple-400" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20 bg-black relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-800/50 to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Ready to Find Your Internship?
            </h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Your profile is your key. Keep it updated and start exploring opportunities tailored for you.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/opportunities" legacyBehavior>
                <a className="group inline-flex items-center justify-center px-6 py-3 rounded-lg text-black bg-gradient-to-r from-gray-200 to-white hover:to-gray-100 font-medium transition-all duration-300 hover:shadow-[0_8px_16px_rgba(255,255,255,0.1)] relative overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    Explore Opportunities
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              </Link>
              <Link href="/profile" legacyBehavior>
                <a className="group inline-flex items-center justify-center px-6 py-3 rounded-lg text-gray-300 bg-gradient-to-r from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 border border-gray-700 hover:border-gray-600 font-medium transition-all duration-300 hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                  <span className="flex items-center">
                    Update Your Profile
                    <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              </Link>
            </div>
            <p className="text-xs text-gray-600 mt-6">
              Our AI continuously learns to refine your job matches.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
} 