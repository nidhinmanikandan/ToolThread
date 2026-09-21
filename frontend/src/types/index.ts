export interface AiTool {
  name: string;
  category: string;
  description: string;
  officialUrl: string;
  logoDomain?: string;
  logo?: string;
  isTrending?: boolean;
  tags?: string[];
  githubStars?: number;

  // Optional UI fields (for old data)
  id?: string;
  popularity?: string;
  tag?: string;
  logoBg?: string;
  logoText?: string;
}
export interface RoadmapItem {
  id: string;
  step: number;
  title: string;
  status: "completed" | "active" | "upcoming";
  progress: number;
}

export interface IndustryTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

export interface SavedResource {
  id: string;
  title: string;
  type: string;
  icon: string;
  iconBg: string;
}

export interface Insight {
  headline: string;
  recommendation: {
    title: string;
    description: string;
    estimatedTime: string;
    difficulty: string;
    category: string;
  };
}

export interface ProgressStats {
  completedSteps: number;
  totalSteps: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  weeklyActivity: number[]; // 7 days, 0-100
}

export interface CareerPlan {
  goal: string;
  timeline: string;
  roadmap: { id: string; title: string; duration: string }[];
  tools: string[];
  resources: string[];
}

export interface LiveTrend {
  id: string;
  source: "GitHub" | "Product Hunt" | "Hacker News" | "AI Newsletter";
  title: string;
  summary: string;
  meta: string;
}

export interface SkillGap {
  current: string[];
  target: string;
  missing: { name: string; priority: "High" | "Medium" | "Low" }[];
  matchScore: number;
}

export type CareerGoalId = "frontend" | "uiux" | "ai" | "mobile";

export interface CareerGoalOption {
  id: CareerGoalId;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

export interface CareerGoalState {
  selected: string;
  completedSkills: number;
  totalSkills: number;
  progress: number;
  nextSkill: string;

  mentorData?: {
    nextSkill: string;
    difficulty: string;
    estimatedTime: string;
    why: string;
    resources: {
      title: string;
      url: string;
    }[];
  } | null;
}

export interface Tool {
  name: string;
  category: string;
  description: string;
  officialUrl: string;
  isTrending?: boolean;
}
