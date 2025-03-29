export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  salary: string;
  requirements: string[];
  responsibilities: string[];
}

export const mockJobData: Record<number, Job> = {
  1: {
    id: 1,
    title: "Frontend Developer",
    company: "Tech Corp",
    location: "Singapore",
    type: "Full-time",
    description: "Looking for an experienced Frontend Developer proficient in React and TypeScript.",
    salary: "$4,000 - $7,000",
    requirements: [
      "3+ years of experience with React",
      "Strong TypeScript skills",
      "Experience with Next.js",
      "Understanding of UI/UX principles"
    ],
    responsibilities: [
      "Develop and maintain web applications",
      "Collaborate with designers and backend developers",
      "Optimize application for maximum speed and scalability",
      "Write clean, maintainable code"
    ]
  },
  2: {
    id: 2,
    title: "Backend Engineer",
    company: "Data Systems",
    location: "Remote",
    type: "Full-time",
    description: "Seeking a Backend Engineer with strong Node.js and database experience.",
    salary: "$5,000 - $8,000",
    requirements: [
      "4+ years of backend development",
      "Strong Node.js experience",
      "Database design and optimization",
      "API development expertise"
    ],
    responsibilities: [
      "Design and implement scalable backend services",
      "Manage database architecture",
      "Integrate third-party services",
      "Ensure security best practices"
    ]
  },
  3: {
    id: 3,
    title: "UX Designer",
    company: "Creative Studio",
    location: "Singapore",
    type: "Contract",
    description: "Join our team as a UX Designer to create beautiful and functional interfaces.",
    salary: "$4,500 - $7,500",
    requirements: [
      "3+ years of UX design experience",
      "Proficiency in Figma or similar tools",
      "Strong portfolio of work",
      "User research experience"
    ],
    responsibilities: [
      "Create user-centered designs",
      "Conduct user research and testing",
      "Develop wireframes and prototypes",
      "Collaborate with developers"
    ]
  }
};
