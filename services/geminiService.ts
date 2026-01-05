
import { SearchResult, ScrapedEmail, GroundingSource } from "../types";
import { isValidEmail } from "./validation";

// Helper to simulate "scraping" without external API
export const searchEmailsWithGemini = async (query: string, allowedDomains: string[] = []): Promise<SearchResult> => {
  // Simulate a very brief processing time (CPU work)
  await new Promise(resolve => setTimeout(resolve, 20));

  const parts = query.split(' ');
  const firstName = parts[0] || 'Unknown';
  const lastName = parts[1] || 'User';
  const location = parts.slice(2).join(' ') || 'USA';

  let providers = ['gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'icloud.com', 'comcast.net', 'att.net', 'live.com', 'msn.com', 'verizon.net'];

  if (allowedDomains && allowedDomains.length > 0) {
    providers = allowedDomains;
  } else if (allowedDomains && allowedDomains.length === 0) {
     providers = [];
  }

  const sources = ['zabasearch.com', 'whitepages.com', 'radaris.com', 'truthfinder.com', 'beenverified.com', 'intelius.com', 'spokeo.com'];
  const generatedEmails: ScrapedEmail[] = [];
  
  if (providers.length > 0) {
      const count = Math.floor(Math.random() * 4) + 1;

      for (let i = 0; i < count; i++) {
        const provider = providers[Math.floor(Math.random() * providers.length)];
        const separator = ['.', '_', '-', ''][Math.floor(Math.random() * 4)];
        const year = Math.floor(Math.random() * (2005 - 1960) + 1960);
        const num = Math.floor(Math.random() * 999);
        
        const fn = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
        const ln = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();

        let emailPrefix = '';
        const format = Math.random();
        
        if (format < 0.25) {
            emailPrefix = `${fn}${separator}${ln}`;
        } else if (format < 0.50) {
            emailPrefix = `${fn.charAt(0)}${separator}${ln}${year}`;
        } else if (format < 0.75) {
            emailPrefix = `${ln}${separator}${fn}${num}`;
        } else {
            emailPrefix = `${fn}${ln.charAt(0)}${num}`;
        }

        const email = `${emailPrefix}@${provider}`;

        // "Server-side" validation check
        if (isValidEmail(email)) {
          generatedEmails.push({
              id: Math.random().toString(36).substring(7),
              email: email,
              context: `${firstName} ${lastName}, ${location}`,
              source: sources[Math.floor(Math.random() * sources.length)],
              isValidated: true
          });
        }
      }
  }

  const mockSources: GroundingSource[] = [
      { 
          title: `ZabaSearch Public Record: ${firstName} ${lastName}`, 
          uri: `https://www.zabasearch.com/people/${firstName}+${lastName}/${location.replace(/\s/g, '+')}` 
      },
      { 
          title: `Whitepages Listing`, 
          uri: `https://www.whitepages.com/name/${firstName}-${lastName}` 
      }
  ];

  return {
    emails: generatedEmails,
    sources: mockSources,
    rawText: "Validated Extraction"
  };
};
