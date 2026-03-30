export const CONVERSATION_SOURCES = {
  CRONJOB: 'cronjob',
  TELEGRAM: 'telegram',
  WIDGET: 'widget',
} as const;

export type ConversationSource =
  (typeof CONVERSATION_SOURCES)[keyof typeof CONVERSATION_SOURCES];
