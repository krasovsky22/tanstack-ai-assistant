export const CONVERSATION_SOURCES = {
  CRONJOB: 'cronjob',
  TELEGRAM: 'telegram',
} as const;

export type ConversationSource =
  (typeof CONVERSATION_SOURCES)[keyof typeof CONVERSATION_SOURCES];
