import axios from 'axios';

export interface Quote {
  content: string;
  author: string;
}

export const quoteService = {
  async getRandomQuote(): Promise<Quote> {
    try {
      const response = await axios.get('https://api.quotable.io/random');
      return {
        content: response.data.content,
        author: response.data.author
      };
    } catch (error) {
			console.log(error);
      // Fallback quotes
      const fallbackQuotes: Quote[] = [
        { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { content: "Stay hungry, stay foolish.", author: "Steve Jobs" }
      ];
      return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    }
  },

  async getAutoResponse(): Promise<string> {
    const quote = await this.getRandomQuote();
    return `${quote.content} — ${quote.author}`;
  }
};