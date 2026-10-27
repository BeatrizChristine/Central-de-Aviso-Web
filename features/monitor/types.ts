export type Visitor = {
  name: string;
  department: string;
  page: string;
  time: string;
  browser: string;
  ip: string;
  machine: string;
  lastActivity: string;
};

export type ActivitySample = {
  timestamp: number;
  online: number;
};
