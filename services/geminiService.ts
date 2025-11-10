// Note: This file has been repurposed to handle Twitter API calls.

export interface Tweet {
    id: string;
    text: string;
    created_at: string;
    user: {
      name: string;
      username: string;
      profile_image_url: string;
    };
    public_metrics: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
    entities?: {
      media?: { media_url_https: string }[];
    };
}

// Simplified error response interface
export interface ApiErrorResponse {
    message?: string;
}

export interface FetchTweetsParams {
    username: string;
    apiKey: string;
    count?: string;
    includeReplies?: boolean;
}

export interface FetchTweetsResult {
    tweets: Tweet[];
    requestUrl: string;
    rawResponse: string;
}


/**
 * A helper function to parse and throw a detailed error from an API response text.
 * @param responseText The raw text from the failed response.
 * @param response The original failed fetch Response object.
 * @returns An Error object.
 */
function parseApiError(responseText: string, response: Response): Error {
    try {
        const errorData: ApiErrorResponse = JSON.parse(responseText);
        const message = errorData.message || `API Error ${response.status}`;
        return new Error(message);
    } catch (e) {
        return new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }
}
  
export async function fetchTweets(params: FetchTweetsParams): Promise<FetchTweetsResult> {
    const { username, apiKey, count, includeReplies } = params;

    if (!username.trim()) throw new Error("Username cannot be empty.");
    if (!apiKey.trim()) throw new Error("API Key cannot be empty.");
    
    // 1. Construct the final API URL with all parameters
    const apiUrl = new URL('https://api.twitterapi.io/twitter/user/last_tweets');
    const searchParams = new URLSearchParams();

    searchParams.set('userName', username);
    if (includeReplies !== undefined) searchParams.set('includeReplies', String(includeReplies));
    if (count) searchParams.set('count', count);
    
    apiUrl.search = searchParams.toString();
    
    // 2. Prepend a CORS proxy to the final URL to bypass browser security restrictions.
    const proxiedApiUrl = `https://corsproxy.io/?${apiUrl.toString()}`;

    try {
      const response = await fetch(proxiedApiUrl, {
        headers: { 
            'X-API-Key': apiKey,
            'Accept': 'application/json' 
        }
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw parseApiError(responseText, response);
      }
      
      const tweets: Tweet[] = JSON.parse(responseText);
      
      return {
        tweets: tweets || [],
        requestUrl: proxiedApiUrl,
        rawResponse: responseText,
      };

    } catch (error) {
      console.error("Error fetching tweets:", error);
      if (error instanceof Error) {
        // Add a more helpful message for network errors.
        if (error.message.includes('Failed to fetch')) {
             throw new Error('Network error: Could not connect to the API. This might be due to a CORS proxy issue or your network connection.');
        }
        throw error;
      }
      throw new Error("An unknown error occurred while fetching tweets.");
    }
}