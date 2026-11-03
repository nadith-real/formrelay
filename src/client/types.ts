export type Project = {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FormItem = {
  id: string;
  projectId: string;
  name: string;
  endpointSlug: string;
  enabled: boolean;
  allowedOrigins: string[];
  redirectUrl: string | null;
  successMessage: string | null;
  validationConfig: Record<string, unknown>;
  honeypotField: string | null;
  spamProtection: boolean;
  rateLimitPerMinute: number;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
};

export type Submission = {
  id: string;
  formId: string;
  formName?: string;
  data: Record<string, unknown>;
  status: "unread" | "read" | "spam";
  deviceType: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  userAgent: string | null;
  createdAt: string;
  sender?: string | null;
};

export type IntegrationPublic = {
  provider: string;
  enabled: boolean;
  configured: boolean;
  settings: Record<string, unknown>;
  masked: Record<string, string>;
};

export type Overview = {
  stats: {
    total: number;
    today: number;
    week: number;
    month: number;
    range: number;
    previousRange: number;
    changePercent: number | null;
  };
  activity: { date: string; count: number }[];
  hourly: { hour: number; count: number }[];
  forms: { formId: string; name: string; count: number }[];
  devices: { desktop: number; mobile: number; tablet: number; unknown: number };
  browsers: { Chrome: number; Firefox: number; Safari: number; Edge: number; Other: number };
  countries: { country: string; count: number }[];
  recent: { id: string; formName: string; createdAt: string; deviceType: string | null; status: string }[];
};
