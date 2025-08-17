import { specialists } from "../specialists";
import { Specialist } from "../types";

/**
 * Get specialist information by name
 * @param specialistName - The name of the specialist
 * @returns Specialist object or null if not found
 */
export const getSpecialist = (specialistName?: string): Specialist | null => {
  return specialistName ? specialists[specialistName] || null : null;
};

/**
 * Get specialist display name safely
 * @param specialistName - The name of the specialist
 * @param fallback - Fallback name to use if specialist not found
 * @returns Display name or fallback
 */
export const getSpecialistDisplayName = (
  specialistName?: string,
  fallback = "Elyx Team"
): string => {
  const specialist = getSpecialist(specialistName);
  return specialist?.displayName || fallback;
};

/**
 * Get specialist emoji safely
 * @param specialistName - The name of the specialist
 * @param fallback - Fallback emoji to use if specialist not found
 * @returns Emoji or fallback
 */
export const getSpecialistEmoji = (
  specialistName?: string,
  fallback = "🤔"
): string => {
  const specialist = getSpecialist(specialistName);
  return specialist?.emoji || fallback;
};
