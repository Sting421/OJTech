"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Star, Trash2, AlertCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillAssessment as SkillAssessmentType } from "@/lib/types/database";
import {
  getCurrentUserSkillAssessments,
  saveSkillAssessment,
  deleteSkillAssessment,
  getSuggestedSkills,
} from "@/lib/actions/skill-assessment";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const proficiencyLevels = [
  { value: 1, label: "Beginner", description: "Basic knowledge with limited practical experience" },
  { value: 2, label: "Elementary", description: "Working knowledge with some practical experience" },
  { value: 3, label: "Intermediate", description: "Practical application with solid understanding" },
  { value: 4, label: "Advanced", description: "Thorough understanding and extensive experience" },
  { value: 5, label: "Expert", description: "Authoritative knowledge, recognized expertise" },
];

export function SkillAssessment() {
  const [assessments, setAssessments] = useState<SkillAssessmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState<string>("3");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getCurrentUserSkillAssessments();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to load skill assessments");
      }
      
      setAssessments(result.data || []);
      
      // Load suggested skills
      await loadSuggestedSkills();
    } catch (error) {
      console.error("Error loading skill assessments:", error);
      setError("Failed to load skill assessments. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load skill assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedSkills = async () => {
    try {
      setLoadingSuggestions(true);
      
      const result = await getSuggestedSkills();
      
      if (result.success) {
        setSuggestedSkills(result.data || []);
      }
    } catch (error) {
      console.error("Error loading suggested skills:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSkill = async () => {
    try {
      if (!newSkill.trim()) {
        toast({
          title: "Error",
          description: "Skill name cannot be empty",
          variant: "destructive",
        });
        return;
      }
      
      setSaving(true);
      
      const result = await saveSkillAssessment(
        newSkill.trim(),
        parseInt(proficiencyLevel),
        notes.trim() || undefined
      );
      
      if (!result.success) {
        throw new Error(result.error || "Failed to save skill assessment");
      }
      
      toast({
        title: "Success",
        description: "Skill assessment saved successfully",
      });
      
      // Refresh assessments
      await loadAssessments();
      
      // Reset form
      setNewSkill("");
      setProficiencyLevel("3");
      setNotes("");
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error saving skill assessment:", error);
      toast({
        title: "Error",
        description: "Failed to save skill assessment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      setDeleting(id);
      
      const result = await deleteSkillAssessment(id);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete skill assessment");
      }
      
      toast({
        title: "Success",
        description: "Skill assessment deleted successfully",
      });
      
      // Refresh assessments
      await loadAssessments();
    } catch (error) {
      console.error("Error deleting skill assessment:", error);
      toast({
        title: "Error",
        description: "Failed to delete skill assessment",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectSuggestedSkill = (skill: string) => {
    setNewSkill(skill);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skill Self-Assessment</CardTitle>
          <CardDescription>Evaluate your proficiency in various skills</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skill Self-Assessment</CardTitle>
          <CardDescription>Evaluate your proficiency in various skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-destructive gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button onClick={loadAssessments}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Skill Self-Assessment</CardTitle>
          <CardDescription>Rate your proficiency in various skills that may not be in your resume</CardDescription>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="mr-2 h-4 w-4" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Skill Assessment</DialogTitle>
              <DialogDescription>
                Add a new skill and rate your proficiency level
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="skill">Skill Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g. React, Python, Project Management"
                  />
                  
                  {suggestedSkills.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="flex-shrink-0"
                          disabled={loadingSuggestions}
                        >
                          {loadingSuggestions ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="end">
                        <div className="p-2">
                          <p className="text-sm font-medium mb-2">Suggested Skills</p>
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {suggestedSkills.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary/10"
                                onClick={() => handleSelectSuggestedSkill(skill)}
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proficiency">Proficiency Level</Label>
                <Select value={proficiencyLevel} onValueChange={setProficiencyLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select proficiency level" />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value.toString()}>
                        {level.label} - {level.value}/5
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {proficiencyLevels.find(
                    (level) => level.value === parseInt(proficiencyLevel)
                  )?.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details about your experience with this skill"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddSkill} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Skill"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {assessments.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              You haven't assessed any skills yet. Add your first skill to get started.
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Skill
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{assessment.skill_name}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-3.5 w-3.5 ${
                                  index < assessment.proficiency_level
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted stroke-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {
                              proficiencyLevels.find(
                                (level) => level.value === assessment.proficiency_level
                              )?.label
                            }{" "}
                            ({assessment.proficiency_level}/5)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {assessment.notes && (
                    <p className="text-xs text-muted-foreground">
                      {assessment.notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteSkill(assessment.id)}
                  disabled={deleting === assessment.id}
                >
                  {deleting === assessment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 