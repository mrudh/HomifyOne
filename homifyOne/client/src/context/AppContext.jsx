import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const INITIAL_PROFILE = {
  household: "",
  kids_ages: [],
  lifestyle_pace: "",
  wfh: "",
  cooking_habit: "",
  kitchen_priorities: [],
  bathroom_feel: "",
  bathroom_extras: [],
  bedroom_priorities: [],
  wardrobe_size: "",
  living_uses: [],
  living_priorities: [],
  garden_uses: [],
  tech_level: "",
  security_needs: [],
  budget_approach: "",
  home_area: "",
  buyer_type: "",
  household_size: "",
  build_stage: "",
  bedroom_users: "",
  wardrobe_need: "",
  kitchen_usage: "",
  appliance_need: "",
  bathroom_priority: "",
  flooring_area: "",
  electrical_need: "",
  garden_priority: "",
  smart_home_need: "",
  sustainability_interest: "",
  upgrade_categories: [],
  priorities: [],
  preferred_style: "",
  budget_min: 0,
  budget_max: 0,
  biggest_problems: [],
  main_uses: [],
  additional_notes: "",
};

export function AppProvider({ children }) {
  const [profile, setProfile]                 = useState(INITIAL_PROFILE);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(INITIAL_PROFILE);
    setRecommendations([]);
  }, []);

  const buildNLPSentence = useCallback(() => {
    const p = profile;
    const parts = [];
    if (p.household) parts.push(`Household: ${p.household}`);
    if (p.lifestyle_pace)  parts.push(`Lifestyle: ${p.lifestyle_pace}`);
    if (p.wfh && p.wfh !== "never") parts.push(`works from home (${p.wfh})`);
    if (p.cooking_habit) parts.push(`cooking: ${p.cooking_habit}`);
    if (p.bathroom_feel) parts.push(`bathroom: ${p.bathroom_feel}`);
    if (p.tech_level) parts.push(`tech level: ${p.tech_level}`);
    if (p.budget_approach) parts.push(`budget: ${p.budget_approach}`);
    return parts.length ? parts.join(" · ") : "No profile data yet.";
  }, [profile]);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/recommendations", { profile });
      setRecommendations(data.recommendations || data || []);
    } catch (err) {
      console.error("fetchRecommendations error:", err);
      setError(err.response?.data?.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const fetchAISummary = useCallback(async () => {
    try {
      const { data } = await api.post("/recommendations/summary", { profile });
      return data.summary || "";
    } catch {
      return "";
    }
  }, [profile]);

  return (
    <AppContext.Provider
      value={{
        profile,
        updateProfile,
        resetProfile,
        recommendations,
        setRecommendations,
        loading,
        error,
        fetchRecommendations,
        fetchAISummary,
        buildNLPSentence,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}