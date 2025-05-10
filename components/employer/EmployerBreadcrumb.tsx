"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, Building, Briefcase, Loader2, Users, ChevronRight } from "lucide-react";
import { getJobById } from '@/lib/actions/job-actions';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrentPage?: boolean;
}

export function EmployerBreadcrumb() {
  const pathname = usePathname();
  const params = useParams();
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch dynamic data like job titles when there are dynamic segments
  useEffect(() => {
    const fetchDynamicData = async () => {
      if (pathname.includes('/jobs/') && params.id) {
        setIsLoading(true);
        try {
          // Fetch job details
          const result = await getJobById(params.id as string);
          if (result.success && result.data) {
            setDynamicLabels({
              ...dynamicLabels,
              [params.id as string]: result.data.title
            });
          }
        } catch (error) {
          console.error("Error fetching job details for breadcrumb:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchDynamicData();
  }, [pathname, params]);
  
  // Generate breadcrumb items based on the current path
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    // Always start with home
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];
    
    // Add employer
    breadcrumbs.push({ label: 'Employer', href: '/employer' });
    
    // Add path segments
    let currentPath = '/employer';
    
    // Handle special case for applications
    const isApplicationsPage = pathname.includes('/applications');
    
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      
      // Check if this segment is a dynamic route parameter like [id]
      if (segment.match(/^\[.*\]$/)) {
        // Find the actual parameter value from params
        const paramKey = segment.replace(/^\[|\]$/g, '');
        const paramValue = params[paramKey];
        
        if (paramValue) {
          // Use a meaningful label if we have one, otherwise use the param value
          const label = dynamicLabels[paramValue as string] || `Job ${paramValue}`;
          
          // For job applications, add both the job and the applications segments
          if (isApplicationsPage && i === pathSegments.length - 2) {
            breadcrumbs.push({
              label,
              href: currentPath.replace(segment, paramValue as string),
              isCurrentPage: false
            });
          } else {
            breadcrumbs.push({
              label,
              href: currentPath.replace(segment, paramValue as string),
              isCurrentPage: i === pathSegments.length - 1 && !isApplicationsPage
            });
          }
        }
        continue;
      }
      
      // Special handling for "applications" segment
      if (segment === 'applications' && i === pathSegments.length - 1) {
        breadcrumbs.push({
          label: 'Applications',
          href: currentPath,
          isCurrentPage: true
        });
        continue;
      }
      
      // Format the label to be more readable
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // The last segment is the current page
      const isCurrentPage = i === pathSegments.length - 1;
      
      if (dynamicLabels[segment]) {
        breadcrumbs.push({
          label: dynamicLabels[segment],
          href: currentPath,
          isCurrentPage
        });
      } else {
        breadcrumbs.push({
          label,
          href: currentPath,
          isCurrentPage
        });
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();

  // Helper to get the appropriate icon for a breadcrumb
  const getIcon = (label: string) => {
    switch(label) {
      case 'Home':
        return <Home size={16} strokeWidth={2} />;
      case 'Employer':
        return <Building size={16} strokeWidth={2} className="mr-1.5" />;
      case 'Jobs':
        return <Briefcase size={16} strokeWidth={2} className="mr-1.5" />;
      case 'Applications':
        return <Users size={16} strokeWidth={2} className="mr-1.5" />;
      default:
        return null;
    }
  };

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList className="text-sm text-muted-foreground">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={breadcrumb.href}>
            <BreadcrumbItem>
              {isLoading && index === breadcrumbs.length - 1 ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </span>
              ) : breadcrumb.isCurrentPage ? (
                <BreadcrumbPage className="text-foreground">
                  {getIcon(breadcrumb.label) && (
                    <span className="flex items-center">
                      {getIcon(breadcrumb.label)}
                      {breadcrumb.label}
                    </span>
                  )}
                  {!getIcon(breadcrumb.label) && breadcrumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    href={breadcrumb.href}
                    className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors",
                    )}
                  >
                    {getIcon(breadcrumb.label) ? (
                      <span className="flex items-center">
                        {getIcon(breadcrumb.label)}
                        {breadcrumb.label !== 'Home' && breadcrumb.label}
                      </span>
                    ) : (
                      breadcrumb.label
                    )}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <ChevronRight size={14} className="text-muted-foreground/50" />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
} 