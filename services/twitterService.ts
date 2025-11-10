// Twitter API Service for twitterapi.io

export interface Tweet {
    id: string;
    text: string;
    createdAt: string;
    url?: string;
    author: {
        userName: string;
        name: string;
        profilePicture: string;
    };
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
    entities?: {
        media?: { media_url_https: string }[];
    };
}

// API Response structure
export interface TwitterApiResponse {
    status: string;
    code: number;
    msg: string;
    data: {
        pin_tweet: any | null;
        tweets: Tweet[];
    };
    has_next_page: boolean;
    next_cursor: string;
}

// Simplified error response interface
export interface ApiErrorResponse {
    message?: string;
    status?: string;
}

export interface FetchUserTweetsParams {
    userName?: string;
    userId?: string;
    apiKey: string;
    cursor?: string;
    includeReplies?: boolean;
}

export interface FetchUserTweetsResult {
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

/**
 * Fetches the last tweets from a Twitter user using the twitterapi.io API.
 * @param params Parameters for fetching tweets
 * @returns Promise resolving to tweets array and request details
 */
export async function fetchUserTweets(params: FetchUserTweetsParams): Promise<FetchUserTweetsResult> {
    const { userName, userId, apiKey, cursor, includeReplies } = params;

    console.log("=== fetchUserTweets called ===");
    console.log("Input params:", { userName, userId, cursor, includeReplies, apiKeyLength: apiKey?.length });

    if (!userName?.trim() && !userId?.trim()) {
        console.error("Validation error: Neither userName nor userId provided");
        throw new Error("Either userName or userId must be provided.");
    }
    if (!apiKey.trim()) {
        console.error("Validation error: API Key is empty");
        throw new Error("API Key cannot be empty.");
    }

    // Construct the API URL with query parameters
    const apiUrl = new URL('https://api.twitterapi.io/twitter/user/last_tweets');
    const searchParams = new URLSearchParams();

    // userId takes precedence over userName if both are provided
    if (userId?.trim()) {
        searchParams.set('userId', userId.trim());
        console.log("Using userId parameter:", userId.trim());
    } else if (userName?.trim()) {
        searchParams.set('userName', userName.trim());
        console.log("Using userName parameter:", userName.trim());
    }

    if (cursor?.trim()) {
        searchParams.set('cursor', cursor.trim());
        console.log("Adding cursor parameter:", cursor.trim());
    }

    if (includeReplies !== undefined) {
        searchParams.set('includeReplies', String(includeReplies));
        console.log("Setting includeReplies:", includeReplies);
    }

    apiUrl.search = searchParams.toString();
    const directApiUrl = apiUrl.toString();

    console.log("Direct API URL:", directApiUrl);
    console.log("Request headers:", {
        'X-API-Key': `${apiKey.substring(0, 10)}...`,
        'Accept': 'application/json'
    });

    // Use Vite dev server proxy to avoid CORS issues
    // The proxy runs server-side and can forward custom headers
    // In development: /api/twitter/* -> https://api.twitterapi.io/*
    // In production: You'll need a backend proxy or the API must support CORS
    const isDevelopment = import.meta.env.DEV;
    const proxyPath = '/api/twitter/twitter/user/last_tweets';
    const requestUrl = isDevelopment ? `${window.location.origin}${proxyPath}${apiUrl.search}` : directApiUrl;
    
    console.log("Using request URL:", requestUrl);
    console.log("Is development mode:", isDevelopment);
    
    try {
        console.log("Making fetch request...");
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json'
            }
        });

        console.log("Response received");
        console.log("Response status:", response.status);
        console.log("Response statusText:", response.statusText);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log("Response text length:", responseText.length);
        console.log("Response text preview:", responseText.substring(0, 200));

        if (!response.ok) {
            console.error("API request failed with status:", response.status);
            console.error("Error response:", responseText);
            throw parseApiError(responseText, response);
        }

        console.log("Parsing JSON response...");
        const apiResponse: TwitterApiResponse = JSON.parse(responseText);
        console.log("Parsed API response structure:", {
            status: apiResponse.status,
            code: apiResponse.code,
            msg: apiResponse.msg,
            tweetsCount: apiResponse.data?.tweets?.length || 0,
            has_next_page: apiResponse.has_next_page,
            next_cursor: apiResponse.next_cursor
        });

        // Extract tweets array from response - tweets are nested in data.tweets
        const tweets = apiResponse.data?.tweets || [];
        console.log(`Extracted ${tweets.length} tweets from data.tweets`);

        console.log(`Successfully fetched ${tweets.length} tweets`);
        if (tweets.length > 0) {
            console.log("First tweet sample:", {
                id: tweets[0].id,
                text: tweets[0].text.substring(0, 50) + "...",
                author: tweets[0].author?.userName
            });
        }

        return {
            tweets: tweets,
            requestUrl: requestUrl,
            rawResponse: responseText,
        };

    } catch (error) {
        console.error("=== Error in fetchUserTweets ===");
        console.error("Error type:", error?.constructor?.name);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        
        if (error instanceof Error) {
            // Check for CORS errors specifically
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                console.error("CORS Error detected - The API server does not allow requests from this origin.");
                console.error("Note: Access-Control-Allow-Origin header must be set by the API server (twitterapi.io), not the client.");
                throw new Error('CORS Error: The API server does not allow requests from this origin. Using CORS proxy to resolve this.');
            }
            throw error;
        }
        throw new Error("An unknown error occurred while fetching tweets.");
    }
}

