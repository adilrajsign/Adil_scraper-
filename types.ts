export interface ScrapedEmail {
  id: string;
  email: string;
  context: string; // Name, Role, or Company associated with the email
  source: string; // Website or domain
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SearchResult {
  emails: ScrapedEmail[];
  sources: GroundingSource[];
  rawText: string;
}

export enum ScrapeStatus {
  IDLE = 'idle',
  SEARCHING = 'searching',
  PARSING = 'parsing',
  COMPLETED = 'completed',
  ERROR = 'error',
}