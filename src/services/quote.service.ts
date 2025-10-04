import axios from 'axios';

export interface Quote {
  content: string;
  author: string;
}

export const quoteService = {
  async getRandomQuote(): Promise<Quote> {
    try {
    
      const response = await axios.get('http://api.quotable.io/random', {
        timeout: 5000
      });
      
      return {
        content: response.data.content,
        author: response.data.author
      };
    } catch (error) {
      console.error('Error fetching quote from HTTP, trying HTTPS...', error);
      
      try {
        const response = await axios.get('https://api.quotable.io/random', {
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
          timeout: 5000
        });
        
        return {
          content: response.data.content,
          author: response.data.author
        };
      } catch (httpsError) {
        console.error('Error fetching quote from HTTPS:', httpsError);
        
        return this.getFallbackQuote();
      }
    }
  },

  getFallbackQuote(): Quote {
    const fallbackQuotes: Quote[] = [
      { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { content: "Stay hungry, stay foolish.", author: "Steve Jobs" },
      { content: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
      { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { content: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
      { content: "Whoever is happy will make others happy too.", author: "Anne Frank" },
      { content: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" }
    ];
    
    const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
    return fallbackQuotes[randomIndex];
  },

  async getAutoResponse(): Promise<string> {
    const quote = await this.getRandomQuote();
    return `${quote.content} — ${quote.author}`;
  }
};