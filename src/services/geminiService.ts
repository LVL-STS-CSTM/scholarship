import { GoogleGenAI } from "@google/genai";
import { Application, Scholarship } from "../types";

// Rate Limiter implementation
class RateLimiter {
  private limit: number;
  private windowMs: number;
  private storageKey: string;

  constructor(limit: number, windowMs: number, storageKey: string = 'gemini_rate_limit') {
    this.limit = limit;
    this.windowMs = windowMs;
    this.storageKey = storageKey;
  }

  public checkLimit(): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{"requests": [], "lastReset": 0}');
    
    // Clean up old requests
    const filteredRequests = data.requests.filter((ts: number) => now - ts < this.windowMs);
    
    if (filteredRequests.length >= this.limit) {
      const oldestRequest = filteredRequests[0];
      const resetTime = oldestRequest + this.windowMs;
      return { allowed: false, remaining: 0, resetTime };
    }

    filteredRequests.push(now);
    localStorage.setItem(this.storageKey, JSON.stringify({ requests: filteredRequests, lastReset: now }));
    
    return { 
      allowed: true, 
      remaining: this.limit - filteredRequests.length, 
      resetTime: now + this.windowMs 
    };
  }

  public getStatus(): { remaining: number; resetTime: number } {
    const now = Date.now();
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{"requests": [], "lastReset": 0}');
    const filteredRequests = data.requests.filter((ts: number) => now - ts < this.windowMs);
    const resetTime = filteredRequests.length > 0 ? filteredRequests[0] + this.windowMs : now;
    return { remaining: this.limit - filteredRequests.length, resetTime };
  }
}

// 10 requests per minute limit
const geminiLimiter = new RateLimiter(10, 60 * 1000);

// Initialize Gemini
// Note: process.env.GEMINI_API_KEY is provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function getScholarshipMatchAnalysis(user: any, scholarship: Scholarship) {
  const limiterStatus = geminiLimiter.checkLimit();
  
  if (!limiterStatus.allowed) {
    const waitSeconds = Math.ceil((limiterStatus.resetTime - Date.now()) / 1000);
    throw new Error(`Rate limit exceeded. Please try again in ${waitSeconds} seconds.`);
  }

  try {
    const prompt = `
      You are an expert scholarship application consultant for a local Barangay.
      Analyze the match between this student profile and the scholarship requirements.
      
      STUDENT PROFILE:
      - Level: ${user.level}
      - Age: ${user.age}
      - GPA: ${user.gpa}
      - Bio: ${user.bio}
      
      SCHOLARSHIP:
      - Title: ${scholarship.title}
      - Category: ${scholarship.category}
      - Requirements: ${scholarship.requirements.join(', ')}
      - Min/Max Age: ${scholarship.minAge || 'N/A'}/${scholarship.maxAge || 'N/A'}
      
      Provide a JSON response with:
      1. score: (0-100) match percentage
      2. status: "Passed", "Flagged", or "Failed"
      3. feedback: (string) short constructive feedback for the student
      4. strengths: (string[]) what makes them a good fit
      5. gaps: (string[]) what they might be missing
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export function getGeminiUsage() {
  return geminiLimiter.getStatus();
}
