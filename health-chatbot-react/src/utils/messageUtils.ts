/**
 * Utility functions for message handling
 */

/**
 * Generate a unique message ID
 * @returns Unique message ID string
 */
export const generateMessageId = (): string => {
  return Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9);
};

/**
 * Create a timestamp for messages
 * @returns Current timestamp as Date object
 */
export const createMessageTimestamp = (): Date => {
  return new Date();
};
