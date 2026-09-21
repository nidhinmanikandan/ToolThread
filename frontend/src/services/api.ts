const BASE_URL = "http://localhost:5000";

// Mock API layer — replace with real fetch() calls when backend is ready.
import {
  trendingTools,
  todayInsight,
  roadmap,
  industryTrends,
  savedResources,
  progressStats,
  careerPlan,
  liveTrends,
  skillGap,
  careerGoalOptions,
  careerGoalState,
} from "./mockData";
import type { AiTool } from "@/types";

const delay = <T>(data: T, ms = 0): Promise<T> => new Promise((r) => setTimeout(() => r(data), ms));

export const api = {
  getFeed: async (params?: { type?: string; category?: string; limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);

    const queryString = searchParams.toString();
    const url = `${BASE_URL}/api/feed${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url);
    return res.json();
  },
  getTrendingTools: async () => {
    const data = await api.getFeed({ type: "trending", limit: 12 });
    return data.tools || [];
  },
  getTodayInsight: () => delay(todayInsight),
  getRoadmap: async () => {
    const response = await fetch(`${BASE_URL}/api/roadmap/1`);

    const data = await response.json();

    return data.roadmap.map(
      (
        item: {
          skill: string;
          completed: boolean;
        },
        index: number,
      ) => ({
        id: item.skill,
        step: index + 1,
        title: item.skill,
        status: item.completed
          ? "completed"
          : index === data.roadmap.findIndex((r: { completed: boolean }) => !r.completed)
            ? "active"
            : "upcoming",
        progress: item.completed ? 100 : 0,
      }),
    );
  },
  getIndustryTrends: () => delay(industryTrends),
  getSavedResources: () => delay(savedResources),
  getProgressStats: async () => {
    const response = await fetch(`${BASE_URL}/api/progress/1`);

    const progress = await response.json();

    return {
      completedSteps: progress.completedSkills.length,
      totalSteps: 3,
      currentStreak: progress.currentStreak,
      consistencyScore: progress.consistencyScore,
      weeklyActivity: progress.weeklyActivity,
    };
  },
  getCareerPlan: (_goal?: string) => delay(careerPlan, 400),
  getLiveTrends: () => delay(liveTrends),
  getSkillGap: async () => {
    const progressResponse = await fetch(`${BASE_URL}/api/progress/1`);

    const progress = await progressResponse.json();

    const response = await fetch(`${BASE_URL}/api/career/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentSkills: progress.completedSkills,
        targetRole: progress.targetRole,
      }),
    });

    const data = await response.json();

    return {
      target: data.targetRole,
      matchScore: data.completion,

      current: progress.completedSkills,

      missing: data.missingSkills.map((skill: any) => ({
        name: skill.skill,

        priority: skill.priority === 1 ? "High" : skill.priority === 2 ? "Medium" : "Low",
      })),
    };
  },
  getCareerGoalOptions: () => delay(careerGoalOptions),
  getCareerGoalState: async (): Promise<import("@/types").CareerGoalState> => {
    const progressResponse = await fetch(`${BASE_URL}/api/progress/1`);

    const progress = await progressResponse.json();

    const mentorResponse = await fetch(`${BASE_URL}/api/career/mentor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentSkills: progress.completedSkills,
        targetRole: progress.targetRole,
      }),
    });

    const mentor = await mentorResponse.json();

    console.log("MENTOR DATA", mentor);

    return {
      selected:
        progress.targetRole === "Frontend Developer"
          ? "frontend"
          : progress.targetRole === "UI/UX Designer"
            ? "uiux"
            : progress.targetRole === "Mobile Developer"
              ? "mobile"
              : "ai",
      completedSkills: progress.completedSkills.length,
      totalSkills: 3,
      progress: Math.round((progress.completedSkills.length / 3) * 100),
      nextSkill: mentor.nextSkill?.skill || "Completed",

      mentorData: mentor,
    };
  },
  markSkillComplete: async (skill: string) => {
    const response = await fetch(`${BASE_URL}/api/progress/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1,
        skill,
      }),
    });

    return response.json();
  },

  changeCareer: async (targetRole: string) => {
    const response = await fetch(`${BASE_URL}/api/progress/career`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1,
        targetRole,
      }),
    });

    return response.json();
  },

  getTools: async () => {
    const data = await api.getFeed({ type: "popular", limit: 50 });
    return data.tools || [];
  },

  async getToolRoadmap(tool: AiTool) {
    const res = await fetch(`${BASE_URL}/api/roadmap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tool }),
    });

    if (!res.ok) {
      throw new Error("Roadmap generation failed");
    }

    return res.json();
  },
};
