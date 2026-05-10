export const ReportTypes = [
  'Content',
  'Formatting',
  'HateSpeech',
  'Harassment',
  'MaliciousLink',
  'DeadLink',
  'Misinformation',
  'Offensive',
  'Spam',
  'BadTranslation',
  'SuspectedBug',
  'SuspectedBot',
  'PhishingOrFraud',
] as const;
export type ReportType = (typeof ReportTypes)[number];
export enum ReportTypeEnum {
  Content = 'Content',
  Formatting = 'Formatting',
  HateSpeech = 'HateSpeech',
  Harassment = 'Harassment',
  MaliciousLink = 'MaliciousLink',
  DeadLink = 'DeadLink',
  Misinformation = 'Misinformation',
  Offensive = 'Offensive',
  Spam = 'Spam',
  BadTranslation = 'BadTranslation',
  SuspectedBug = 'SuspectedBug',
  SuspectedBot = 'SuspectedBot',
  PhishingOrFraud = 'PhishingOrFraud',
}
// TODO: use i18n properly
export const ReportTypeStrings = {
  'en-US': {
    Content: 'Content',
    Formatting: 'Formatting',
    HateSpeech: 'Hate Speech',
    Harassment: 'Harassment',
    MaliciousLink: 'Malicious Link',
    DeadLink: 'Dead Link',
    Misinformation: 'Misinformation',
    Offensive: 'Offensive',
    Spam: 'Spam',
    BadTranslation: 'Bad Translation',
    SuspectedBug: 'Suspected Bug',
    SuspectedBot: 'Suspected Bot',
    PhishingOrFraud: 'Phishing or Fraud',
  },
};
