import { SearchResult, ScrapedEmail, GroundingSource } from "../types";

// Helper to simulate "scraping" without external API
export const searchEmailsWithGemini = async (query: string): Promise<SearchResult> => {
  // query is typically "John Smith California"

  // Simulate a very brief processing time (CPU work)
  await new Promise(resolve => setTimeout(resolve, 20));

  const parts = query.split(' ');
  const firstName = parts[0] || 'Unknown';
  const lastName = parts[1] || 'User';
  // Reconstruct location from remainder
  const location = parts.slice(2).join(' ') || 'USA';

  const providers = ['gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'icloud.com', 'comcast.net', 'att.net', 'live.com', 'msn.com', 'verizon.net'];
  const sources = ['zabasearch.com', 'whitepages.com', 'radaris.com', 'truthfinder.com', 'beenverified.com', 'intelius.com', 'spokeo.com'];

  const generatedEmails: ScrapedEmail[] = [];
  
  // Generate 1-4 emails per "person" to mimic rich search results
  const count = Math.floor(Math.random() * 4) + 1;

  for (let i = 0; i < count; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const separator = ['.', '_', '-', ''][Math.floor(Math.random() * 4)];
    const year = Math.floor(Math.random() * (2005 - 1960) + 1960); // Random birth year range
    const num = Math.floor(Math.random() * 999);
    
    // Algorithmic Email Generation Patterns
    let emailPrefix = '';
    const format = Math.random();
    
    // Clean names for email (remove special chars)
    const fn = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const ln = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();

    if (format < 0.25) {
        // john.smith
        emailPrefix = `${fn}${separator}${ln}`;
    } else if (format < 0.50) {
        // j.smith1985
        emailPrefix = `${fn.charAt(0)}${separator}${ln}${year}`;
    } else if (format < 0.75) {
        // smith_john_88
        emailPrefix = `${ln}${separator}${fn}${num}`;
    } else {
        // johns99
        emailPrefix = `${fn}${ln.charAt(0)}${num}`;
    }

    const email = `${emailPrefix}@${provider}`;

    generatedEmails.push({
        id: Math.random().toString(36).substring(7),
        email: email,
        context: `${firstName} ${lastName}, ${location}`,
        source: sources[Math.floor(Math.random() * sources.length)]
    });
  }

  // Mock grounding sources to maintain UI consistency
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
    rawText: "Synthetic Data Generation"
  };
};