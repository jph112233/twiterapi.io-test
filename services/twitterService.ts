// Twitter API Service for twitterapi.io

export interface Card {
    photo_image_full_size_large?: string;
    thumbnail_image?: string;
    description?: string;
    title?: string;
    domain?: string;
    [key: string]: any; // Allow for other card properties
}

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
    viewCount?: number;
    entities?: {
        media?: { media_url_https: string }[];
    };
    card?: Card;
    inReplyToStatusId?: string;
    inReplyToTweetId?: string;
    referencedTweets?: Array<{
        type: string;
        id: string;
    }>;
    repliedTo?: Tweet;
    // New reply relationship fields
    isReply?: boolean;
    inReplyToId?: string;
    conversationId?: string;
    inReplyToUserId?: string;
    inReplyToUsername?: string;
    displayTextRange?: [number, number];
    children?: Tweet[];
    _source?: 'main' | 'includes' | 'replied_to'; // Internal tracking for debugging
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

export interface AdvancedSearchParams {
    query: string;
    queryType?: 'Latest' | 'Top';
    cursor?: string;
    apiKey: string;
}

export interface AdvancedSearchResult {
    tweets: Tweet[];
    hasNextPage: boolean;
    nextCursor: string;
    requestUrl: string;
    rawResponse: string;
}

export interface AdvancedSearchApiResponse {
    tweets: Tweet[];
    has_next_page: boolean;
    next_cursor: string;
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
 * Calculates engagement rate (relative to views) for a tweet.
 * Formula: (likeCount + replyCount + retweetCount + quoteCount) / viewCount
 * @param tweet The tweet to calculate engagement rate for
 * @returns Engagement rate as a percentage (0-100), or null if viewCount is not available
 */
export function calculateEngagementRate(tweet: Tweet): number | null {
    if (!tweet.viewCount || tweet.viewCount === 0) {
        console.log(`Tweet ${tweet.id} has no viewCount, cannot calculate engagement rate`);
        return null;
    }
    
    const totalEngagements = (tweet.likeCount || 0) + 
                             (tweet.replyCount || 0) + 
                             (tweet.retweetCount || 0) + 
                             (tweet.quoteCount || 0);
    
    const engagementRate = (totalEngagements / tweet.viewCount) * 100;
    console.log(`Tweet ${tweet.id}: ${totalEngagements} engagements / ${tweet.viewCount} views = ${engagementRate.toFixed(2)}%`);
    
    return engagementRate;
}

/**
 * Organizes tweets into hierarchical thread structures based on conversationId and inReplyToId.
 * Groups tweets by conversation and builds parent-child relationships.
 * @param tweets Array of tweets to organize
 * @returns Array of root tweets with nested children
 */
export function organizeTweetsIntoThreads(tweets: Tweet[]): Tweet[] {
    console.log("=== organizeTweetsIntoThreads called ===");
    console.log(`Organizing ${tweets.length} tweets into threads`);
    
    // Create a map of all tweets by ID for quick lookup
    const tweetMap = new Map<string, Tweet>();
    tweets.forEach(tweet => {
        if (tweet.id) {
            tweetMap.set(tweet.id, { ...tweet, children: [] });
        }
    });
    
    console.log(`Created tweet map with ${tweetMap.size} tweets`);
    
    // Group tweets by conversationId
    const conversationMap = new Map<string, Tweet[]>();
    const orphanTweets: Tweet[] = [];
    
    tweets.forEach(tweet => {
        if (tweet.conversationId) {
            if (!conversationMap.has(tweet.conversationId)) {
                conversationMap.set(tweet.conversationId, []);
            }
            conversationMap.get(tweet.conversationId)!.push(tweet);
        } else {
            // Tweets without conversationId are treated as standalone
            orphanTweets.push(tweet);
        }
    });
    
    console.log(`Found ${conversationMap.size} conversations and ${orphanTweets.length} standalone tweets`);
    
    const rootTweets: Tweet[] = [];
    
    // Process each conversation
    conversationMap.forEach((conversationTweets, conversationId) => {
        // Create a set of all tweet IDs in this conversation for quick lookup
        const conversationTweetIds = new Set(conversationTweets.map(t => t.id));
        
        // Find root tweets in this conversation (no inReplyToId or inReplyToId not in this conversation)
        const rootTweetsInConversation = conversationTweets.filter(tweet => {
            // Root tweet if: not a reply, or inReplyToId is null/undefined
            if (!tweet.isReply || !tweet.inReplyToId) {
                return true;
            }
            // Check if parent exists in this conversation
            // If parent is not in this conversation, this tweet is a root for display purposes
            return !conversationTweetIds.has(tweet.inReplyToId);
        });
        
        console.log(`Conversation ${conversationId}: ${conversationTweets.length} tweets, ${rootTweetsInConversation.length} root tweets`);
        
        // Build parent-child relationships recursively
        const processedIds = new Set<string>();
        
        const attachChildren = (parentTweet: Tweet): void => {
            if (processedIds.has(parentTweet.id)) {
                return; // Prevent infinite loops
            }
            processedIds.add(parentTweet.id);
            
            // Find all tweets that reply to this parent in this conversation
            const children = conversationTweets.filter(t => 
                t.inReplyToId === parentTweet.id && t.id !== parentTweet.id
            );
            
            if (children.length > 0) {
                parentTweet.children = children.map(child => {
                    const childCopy = { ...tweetMap.get(child.id)!, children: [] };
                    attachChildren(childCopy); // Recursively attach grandchildren
                    return childCopy;
                });
            }
        };
        
        // Process each root tweet and build its tree
        rootTweetsInConversation.forEach(rootTweet => {
            const rootCopy = { ...tweetMap.get(rootTweet.id)!, children: [] };
            attachChildren(rootCopy);
            rootTweets.push(rootCopy);
        });
    });
    
    // Add standalone tweets (no conversationId or not part of a conversation)
    orphanTweets.forEach(tweet => {
        if (!tweet.isReply || !tweet.inReplyToId) {
            // Standalone root tweet
            rootTweets.push({ ...tweetMap.get(tweet.id)!, children: [] });
        } else {
            // Orphan reply - try to find parent in all tweets
            const parentTweet = tweets.find(t => t.id === tweet.inReplyToId);
            if (parentTweet && parentTweet.conversationId) {
                // Parent is in a conversation, this reply should be attached there
                // Find the root tweet in that conversation and attach this reply
                const parentConversation = conversationMap.get(parentTweet.conversationId);
                if (parentConversation) {
                    // This should have been handled above, but handle edge cases
                    console.log(`Orphan reply ${tweet.id} has parent in conversation ${parentTweet.conversationId}`);
                }
            } else {
                // True orphan - add as standalone
                rootTweets.push({ ...tweetMap.get(tweet.id)!, children: [] });
            }
        }
    });
    
    console.log(`Organized into ${rootTweets.length} root tweets with nested children`);
    return rootTweets;
}

/**
 * Processes a raw tweet object into a Tweet format.
 * @param tweet Raw tweet object from API
 * @param isIncludedTweet Whether this tweet is from includes.tweets or replied_to_tweets (for grouping)
 * @returns Processed Tweet object, or undefined if tweet is invalid
 */
function processRawTweet(tweet: any, isIncludedTweet: boolean = false): Tweet | undefined {
    if (!tweet || !tweet.id) return undefined;
    
    const replyId = tweet.in_reply_to_status_id || 
                  tweet.in_reply_to_tweet_id || 
                  tweet.inReplyToStatusId || 
                  tweet.inReplyToTweetId ||
                  tweet.reply_to_status_id ||
                  tweet.reply_to_tweet_id ||
                  tweet.inReplyToId;
    
    const processedTweet: Tweet = {
        id: tweet.id,
        text: tweet.text || tweet.full_text || '',
        createdAt: tweet.createdAt || tweet.created_at || '',
        url: tweet.url,
        author: tweet.author || {
            userName: tweet.user?.userName || tweet.user?.username || 'unknown',
            name: tweet.user?.name || 'Unknown User',
            profilePicture: tweet.user?.profilePicture || tweet.user?.profile_image_url || ''
        },
        likeCount: tweet.likeCount || tweet.like_count || tweet.public_metrics?.like_count || 0,
        retweetCount: tweet.retweetCount || tweet.retweet_count || tweet.public_metrics?.retweet_count || 0,
        replyCount: tweet.replyCount || tweet.reply_count || tweet.public_metrics?.reply_count || 0,
        quoteCount: tweet.quoteCount || tweet.quote_count || tweet.public_metrics?.quote_count || 0,
        viewCount: tweet.viewCount || tweet.view_count || tweet.public_metrics?.impression_count,
        entities: tweet.entities,
        card: tweet.card || tweet.Card,
        inReplyToStatusId: tweet.in_reply_to_status_id || tweet.inReplyToStatusId,
        inReplyToTweetId: tweet.in_reply_to_tweet_id || tweet.inReplyToTweetId,
        referencedTweets: tweet.referenced_tweets || tweet.referencedTweets,
        isReply: tweet.isReply !== undefined ? tweet.isReply : (!!replyId),
        inReplyToId: tweet.inReplyToId || replyId || undefined,
        conversationId: tweet.conversationId || undefined,
        inReplyToUserId: tweet.inReplyToUserId || undefined,
        inReplyToUsername: tweet.inReplyToUsername || undefined,
        displayTextRange: tweet.displayTextRange || undefined,
    };
    
    return processedTweet;
}

/**
 * Creates a clean replied-to tweet object without nested reply data.
 * This prevents nested replies from being displayed when showing the replied-to tweet.
 * @param tweet Raw tweet object from API
 * @returns Clean Tweet object without nested reply structures, or undefined if tweet is invalid
 */
function createCleanRepliedToTweet(tweet: any): Tweet | undefined {
    if (!tweet) return undefined;
    
    // Extract only the fields we need for display, excluding nested replies
    const cleanTweet: Tweet = {
        id: tweet.id,
        text: tweet.text || tweet.full_text || '',
        createdAt: tweet.createdAt || tweet.created_at || '',
        url: tweet.url,
        author: tweet.author || {
            userName: tweet.user?.userName || tweet.user?.username || 'unknown',
            name: tweet.user?.name || 'Unknown User',
            profilePicture: tweet.user?.profilePicture || tweet.user?.profile_image_url || ''
        },
        likeCount: tweet.likeCount || tweet.like_count || tweet.public_metrics?.like_count || 0,
        retweetCount: tweet.retweetCount || tweet.retweet_count || tweet.public_metrics?.retweet_count || 0,
        replyCount: tweet.replyCount || tweet.reply_count || tweet.public_metrics?.reply_count || 0,
        quoteCount: tweet.quoteCount || tweet.quote_count || tweet.public_metrics?.quote_count || 0,
        viewCount: tweet.viewCount || tweet.view_count || tweet.public_metrics?.impression_count,
        entities: tweet.entities,
        card: tweet.card || tweet.Card,
        // Explicitly exclude nested reply data to prevent recursive display
        // Do NOT include: repliedTo, children, inReplyToId, etc.
    };
    
    return cleanTweet;
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
            next_cursor: apiResponse.next_cursor,
            dataKeys: Object.keys(apiResponse.data || {}),
            hasIncludes: !!(apiResponse.data as any)?.includes || !!(apiResponse as any)?.includes
        });
        
        // Log full response structure for debugging reply handling
        console.log("Full API response structure (first level):", JSON.stringify({
            status: apiResponse.status,
            dataKeys: Object.keys(apiResponse.data || {}),
            includesLocation: {
                dataIncludes: !!(apiResponse.data as any)?.includes,
                rootIncludes: !!(apiResponse as any)?.includes
            }
        }, null, 2));
        
        // Log the actual structure of data to see what's available
        if (apiResponse.data) {
            console.log("API response data structure:", {
                hasTweets: !!(apiResponse.data as any).tweets,
                hasIncludes: !!(apiResponse.data as any).includes,
                hasRepliedToTweets: !!(apiResponse.data as any).replied_to_tweets,
                dataKeys: Object.keys(apiResponse.data),
                includesKeys: (apiResponse.data as any).includes ? Object.keys((apiResponse.data as any).includes) : []
            });
        }

        // Extract tweets array from response - tweets are nested in data.tweets
        const rawTweets = apiResponse.data?.tweets || [];
        console.log(`Extracted ${rawTweets.length} tweets from data.tweets`);

        // Check if API response includes referenced tweets in a separate includes array
        // Check multiple possible locations: data.includes.tweets, includes.tweets, or root level includes
        const includesTweets = (apiResponse.data as any)?.includes?.tweets || 
                               (apiResponse as any)?.includes?.tweets || 
                               [];
        console.log(`Found ${includesTweets.length} tweets in includes array`);
        
        // Also check if there's a separate replied_to_tweets array or similar
        const repliedToTweets = (apiResponse.data as any)?.replied_to_tweets ||
                               (apiResponse.data as any)?.repliedToTweets ||
                               (apiResponse as any)?.replied_to_tweets ||
                               [];
        console.log(`Found ${repliedToTweets.length} tweets in replied_to_tweets array`);
        
        // Create a map of tweet IDs to tweet objects for quick lookup
        // Include all tweets from includes array and replied_to_tweets array
        const tweetMap = new Map<string, any>();
        [...includesTweets, ...repliedToTweets].forEach((tweet: any) => {
            if (tweet && tweet.id) {
                tweetMap.set(tweet.id, tweet);
            }
        });
        
        // Also add all raw tweets to the map in case replied-to tweets are in the main array
        rawTweets.forEach((tweet: any) => {
            if (tweet && tweet.id && !tweetMap.has(tweet.id)) {
                tweetMap.set(tweet.id, tweet);
            }
        });
        
        console.log(`Tweet map contains ${tweetMap.size} tweets for lookup`);

        // Process main tweets to extract replied-to information
        const processedMainTweets: Tweet[] = rawTweets.map((tweet: any) => {
            // Check for reply indicators in various field name formats
            const replyId = tweet.in_reply_to_status_id || 
                          tweet.in_reply_to_tweet_id || 
                          tweet.inReplyToStatusId || 
                          tweet.inReplyToTweetId ||
                          tweet.reply_to_status_id ||
                          tweet.reply_to_tweet_id;
            
            const hasReferencedTweets = tweet.referenced_tweets || tweet.referencedTweets;
            const hasRepliedTo = tweet.replied_to || tweet.repliedTo;
            
            console.log("Processing tweet:", {
                id: tweet.id,
                textPreview: tweet.text?.substring(0, 50),
                replyId: replyId,
                hasInReplyToStatusId: !!(tweet.in_reply_to_status_id || tweet.inReplyToStatusId),
                hasInReplyToTweetId: !!(tweet.in_reply_to_tweet_id || tweet.inReplyToTweetId),
                hasReferencedTweets: !!hasReferencedTweets,
                hasRepliedTo: !!hasRepliedTo,
                referencedTweetsType: hasReferencedTweets?.map((ref: any) => ref.type || ref.type),
                allKeys: Object.keys(tweet).filter(k => k.toLowerCase().includes('reply') || k.toLowerCase().includes('reference'))
            });

            const processedTweet: Tweet = {
                ...tweet,
                inReplyToStatusId: tweet.in_reply_to_status_id || tweet.inReplyToStatusId,
                inReplyToTweetId: tweet.in_reply_to_tweet_id || tweet.inReplyToTweetId,
                referencedTweets: tweet.referenced_tweets || tweet.referencedTweets,
                // Extract new reply relationship fields from API response
                isReply: tweet.isReply !== undefined ? tweet.isReply : (!!replyId),
                inReplyToId: tweet.inReplyToId || replyId || undefined,
                conversationId: tweet.conversationId || undefined,
                inReplyToUserId: tweet.inReplyToUserId || undefined,
                inReplyToUsername: tweet.inReplyToUsername || undefined,
                displayTextRange: tweet.displayTextRange || undefined,
                // Extract viewCount (handle both camelCase and snake_case)
                viewCount: tweet.viewCount || tweet.view_count || undefined,
                // Extract card data (handle both camelCase and snake_case)
                card: tweet.card || tweet.Card || undefined,
                _source: 'main', // Track that this is from main tweets array
            };
            
            // Log card data if present
            if (processedTweet.card) {
                console.log(`Tweet ${tweet.id} has card data:`, {
                    hasImage: !!(processedTweet.card.photo_image_full_size_large || processedTweet.card.thumbnail_image),
                    hasDescription: !!processedTweet.card.description,
                    hasTitle: !!processedTweet.card.title,
                    domain: processedTweet.card.domain
                });
            }

            // Try to extract replied-to tweet from various possible structures
            if (hasRepliedTo) {
                // If the API directly provides a replied_to field (snake_case or camelCase)
                const rawRepliedTo = tweet.replied_to || tweet.repliedTo;
                if (rawRepliedTo) {
                    processedTweet.repliedTo = createCleanRepliedToTweet(rawRepliedTo);
                    console.log("Found replied_to field in tweet:", tweet.id);
                }
            } else if (hasReferencedTweets) {
                // Look for replied_to in referenced_tweets (check both snake_case and camelCase)
                const referencedTweetsArray = tweet.referenced_tweets || tweet.referencedTweets || [];
                const repliedToRef = referencedTweetsArray.find((ref: any) => 
                    (ref.type === 'replied_to' || ref.type === 'repliedTo') ||
                    (ref.reference_type === 'replied_to' || ref.reference_type === 'repliedTo')
                );
                
                if (repliedToRef) {
                    // Check if the tweet data is nested in the reference
                    if (repliedToRef.tweet) {
                        processedTweet.repliedTo = createCleanRepliedToTweet(repliedToRef.tweet);
                        console.log("Found replied_to in referenced_tweets (nested):", tweet.id);
                    } else if (repliedToRef.id && tweetMap.has(repliedToRef.id)) {
                        // Look up the tweet in the includes array
                        const rawTweet = tweetMap.get(repliedToRef.id);
                        processedTweet.repliedTo = createCleanRepliedToTweet(rawTweet);
                        console.log("Found replied_to in includes array:", tweet.id, "->", repliedToRef.id);
                    } else if (repliedToRef.id) {
                        console.log("Found replied_to reference with ID:", repliedToRef.id, "but tweet not found in includes");
                    }
                }
            } 
            
            // If we have a reply ID but haven't found the replied-to tweet yet
            if (replyId && !processedTweet.repliedTo) {
                if (tweetMap.has(replyId)) {
                    const rawTweet = tweetMap.get(replyId);
                    processedTweet.repliedTo = createCleanRepliedToTweet(rawTweet);
                    console.log("Found replied_to in includes array by ID:", tweet.id, "->", replyId);
                } else {
                    // Try to find it in the rawTweets array
                    const repliedToTweet = rawTweets.find((t: any) => t.id === replyId);
                    if (repliedToTweet) {
                        processedTweet.repliedTo = createCleanRepliedToTweet(repliedToTweet);
                        console.log("Found replied_to in tweets array by ID:", tweet.id, "->", replyId);
                    } else {
                        console.log("Tweet is a reply to ID:", replyId, "but replied_to data not found in response");
                        // Log the full tweet structure for debugging
                        console.log("Full tweet structure for debugging:", JSON.stringify(tweet, null, 2));
                    }
                }
            }

            return processedTweet;
        });

        // Process includes.tweets and replied_to_tweets as separate tweets
        // Create a set of main tweet IDs to avoid duplicates
        const mainTweetIds = new Set(processedMainTweets.map(t => t.id));
        
        // Process includes.tweets
        const processedIncludesTweets: Tweet[] = includesTweets
            .filter((tweet: any) => {
                const isValid = tweet && tweet.id && !mainTweetIds.has(tweet.id);
                if (!isValid && tweet && tweet.id) {
                    console.log(`[fetchUserTweets] Skipping includes tweet ${tweet.id} - already in main tweets`);
                }
                return isValid;
            })
            .map((tweet: any) => {
                const processed = processRawTweet(tweet, true);
                if (processed) {
                    processed._source = 'includes'; // Track that this is from includes.tweets
                    // Try to match conversationId with a referencing tweet
                    // Find tweets that reference this included tweet by checking:
                    // 1. Main tweets that reply to this tweet (inReplyToId matches)
                    // 2. Main tweets that reference this tweet in referencedTweets
                    // 3. Main tweets that have this tweet's ID in any reply field
                    const referencingTweet = processedMainTweets.find(t => {
                        const matchesReplyId = t.inReplyToId === tweet.id || 
                                              t.inReplyToStatusId === tweet.id ||
                                              t.inReplyToTweetId === tweet.id;
                        const matchesReferenced = t.referencedTweets?.some(ref => ref.id === tweet.id);
                        return matchesReplyId || matchesReferenced;
                    });
                    
                    if (referencingTweet) {
                        // Use the referencing tweet's conversationId, or create one from the referencing tweet's ID
                        if (referencingTweet.conversationId) {
                            processed.conversationId = referencingTweet.conversationId;
                            console.log(`[fetchUserTweets] ✓ Grouped includes tweet ${tweet.id} with referencing tweet ${referencingTweet.id} (conversationId: ${referencingTweet.conversationId})`);
                        } else if (referencingTweet.id) {
                            // If referencing tweet has no conversationId, use its ID as conversationId for grouping
                            processed.conversationId = referencingTweet.id;
                            referencingTweet.conversationId = referencingTweet.id;
                            console.log(`[fetchUserTweets] ✓ Created conversationId ${referencingTweet.id} for includes tweet ${tweet.id} and referencing tweet ${referencingTweet.id}`);
                        }
                    } else {
                        console.log(`[fetchUserTweets] ⚠ Includes tweet ${tweet.id} has no referencing tweet found`);
                        // If no referencing tweet found, check if it has its own conversationId
                        if (processed.conversationId) {
                            console.log(`[fetchUserTweets] Includes tweet ${tweet.id} already has conversationId: ${processed.conversationId}`);
                        }
                    }
                }
                return processed;
            })
            .filter((tweet): tweet is Tweet => tweet !== undefined);
        
        console.log(`Processed ${processedIncludesTweets.length} tweets from includes.tweets`);
        
        // Process replied_to_tweets
        const processedRepliedToTweets: Tweet[] = repliedToTweets
            .filter((tweet: any) => {
                const isValid = tweet && tweet.id && !mainTweetIds.has(tweet.id);
                if (!isValid && tweet && tweet.id) {
                    console.log(`[fetchUserTweets] Skipping replied_to tweet ${tweet.id} - already in main tweets`);
                }
                return isValid;
            })
            .map((tweet: any) => {
                const processed = processRawTweet(tweet, true);
                if (processed) {
                    processed._source = 'replied_to'; // Track that this is from replied_to_tweets
                    // Try to match conversationId with a referencing tweet
                    // Find tweets that reply to this tweet
                    const referencingTweet = processedMainTweets.find(t => {
                        return t.inReplyToId === tweet.id || 
                               t.inReplyToStatusId === tweet.id ||
                               t.inReplyToTweetId === tweet.id;
                    });
                    
                    if (referencingTweet) {
                        // Use the referencing tweet's conversationId, or create one from the referencing tweet's ID
                        if (referencingTweet.conversationId) {
                            processed.conversationId = referencingTweet.conversationId;
                            console.log(`[fetchUserTweets] ✓ Grouped replied_to tweet ${tweet.id} with referencing tweet ${referencingTweet.id} (conversationId: ${referencingTweet.conversationId})`);
                        } else if (referencingTweet.id) {
                            // If referencing tweet has no conversationId, use its ID as conversationId for grouping
                            processed.conversationId = referencingTweet.id;
                            referencingTweet.conversationId = referencingTweet.id;
                            console.log(`[fetchUserTweets] ✓ Created conversationId ${referencingTweet.id} for replied_to tweet ${tweet.id} and referencing tweet ${referencingTweet.id}`);
                        }
                    } else {
                        console.log(`[fetchUserTweets] ⚠ Replied_to tweet ${tweet.id} has no referencing tweet found`);
                        // If no referencing tweet found, check if it has its own conversationId
                        if (processed.conversationId) {
                            console.log(`[fetchUserTweets] Replied_to tweet ${tweet.id} already has conversationId: ${processed.conversationId}`);
                        }
                    }
                }
                return processed;
            })
            .filter((tweet): tweet is Tweet => tweet !== undefined);
        
        console.log(`Processed ${processedRepliedToTweets.length} tweets from replied_to_tweets`);
        
        // Combine all tweets: main tweets + includes tweets + replied_to tweets
        const allTweets = [...processedMainTweets, ...processedIncludesTweets, ...processedRepliedToTweets];
        
        console.log(`Successfully processed ${allTweets.length} total tweets (${processedMainTweets.length} main + ${processedIncludesTweets.length} includes + ${processedRepliedToTweets.length} replied_to)`);
        
        // Summary log
        console.log("=== TWEET PROCESSING SUMMARY ===");
        console.log(`Main tweets: ${processedMainTweets.length}`);
        console.log(`Includes tweets found: ${includesTweets.length}, processed: ${processedIncludesTweets.length}`);
        console.log(`Replied_to tweets found: ${repliedToTweets.length}, processed: ${processedRepliedToTweets.length}`);
        console.log(`Total tweets in response: ${allTweets.length}`);
        
        if (processedIncludesTweets.length > 0) {
            console.log("Sample includes tweets:", processedIncludesTweets.slice(0, 3).map(t => ({ id: t.id, conversationId: t.conversationId })));
        }
        if (processedRepliedToTweets.length > 0) {
            console.log("Sample replied_to tweets:", processedRepliedToTweets.slice(0, 3).map(t => ({ id: t.id, conversationId: t.conversationId })));
        }
        
        if (allTweets.length > 0) {
            console.log("First tweet sample:", {
                id: allTweets[0].id,
                text: allTweets[0].text.substring(0, 50) + "...",
                author: allTweets[0].author?.userName,
                isReply: !!(allTweets[0].inReplyToStatusId || allTweets[0].inReplyToTweetId || allTweets[0].repliedTo),
                hasRepliedToData: !!allTweets[0].repliedTo,
                conversationId: allTweets[0].conversationId,
                source: (allTweets[0] as any)._source
            });
        }

        return {
            tweets: allTweets,
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

/**
 * Performs an advanced search for tweets using the twitterapi.io API.
 * @param params Parameters for advanced search
 * @returns Promise resolving to search results with tweets and pagination info
 */
export async function advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult> {
    const { query, queryType = 'Latest', cursor, apiKey } = params;

    console.log("=== advancedSearch called ===");
    console.log("Input params:", { query, queryType, cursor, apiKeyLength: apiKey?.length });

    if (!query?.trim()) {
        console.error("Validation error: Query is empty");
        throw new Error("Query cannot be empty.");
    }
    if (!apiKey.trim()) {
        console.error("Validation error: API Key is empty");
        throw new Error("API Key cannot be empty.");
    }

    // Construct the API URL with query parameters
    const apiUrl = new URL('https://api.twitterapi.io/twitter/tweet/advanced_search');
    const searchParams = new URLSearchParams();

    searchParams.set('query', query.trim());
    searchParams.set('queryType', queryType);

    if (cursor?.trim()) {
        searchParams.set('cursor', cursor.trim());
        console.log("Adding cursor parameter:", cursor.trim());
    }

    apiUrl.search = searchParams.toString();
    const directApiUrl = apiUrl.toString();

    console.log("Direct API URL:", directApiUrl);
    console.log("Request headers:", {
        'X-API-Key': `${apiKey.substring(0, 10)}...`,
        'Accept': 'application/json'
    });

    // Use Vite dev server proxy to avoid CORS issues
    const isDevelopment = import.meta.env.DEV;
    const proxyPath = '/api/twitter/twitter/tweet/advanced_search';
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

        const responseText = await response.text();
        console.log("Response text length:", responseText.length);
        console.log("Response text preview:", responseText.substring(0, 200));

        if (!response.ok) {
            console.error("API request failed with status:", response.status);
            console.error("Error response:", responseText);
            throw parseApiError(responseText, response);
        }

        console.log("Parsing JSON response...");
        const apiResponse: AdvancedSearchApiResponse = JSON.parse(responseText);
        console.log("Parsed API response structure:", {
            tweetsCount: apiResponse.tweets?.length || 0,
            has_next_page: apiResponse.has_next_page,
            next_cursor: apiResponse.next_cursor,
            dataKeys: Object.keys(apiResponse as any),
            hasIncludes: !!(apiResponse as any)?.includes || !!(apiResponse as any)?.data?.includes
        });

        // Extract main tweets array
        const rawTweets = apiResponse.tweets || [];
        console.log(`Extracted ${rawTweets.length} tweets from main array`);

        // Check if API response includes referenced tweets in a separate includes array
        // Check multiple possible locations: includes.tweets, data.includes.tweets, or root level includes
        const includesTweets = (apiResponse as any)?.includes?.tweets || 
                               (apiResponse as any)?.data?.includes?.tweets || 
                               [];
        console.log(`Found ${includesTweets.length} tweets in includes array`);
        
        // Also check if there's a separate replied_to_tweets array or similar
        const repliedToTweets = (apiResponse as any)?.replied_to_tweets ||
                               (apiResponse as any)?.repliedToTweets ||
                               (apiResponse as any)?.data?.replied_to_tweets ||
                               (apiResponse as any)?.data?.repliedToTweets ||
                               [];
        console.log(`Found ${repliedToTweets.length} tweets in replied_to_tweets array`);

        // Process main tweets
        const processedMainTweets: Tweet[] = rawTweets.map((tweet: any) => {
            const replyId = tweet.in_reply_to_status_id || 
                          tweet.in_reply_to_tweet_id || 
                          tweet.inReplyToStatusId || 
                          tweet.inReplyToTweetId ||
                          tweet.reply_to_status_id ||
                          tweet.reply_to_tweet_id ||
                          tweet.inReplyToId;

            const processedTweet: Tweet = {
                ...tweet,
                inReplyToStatusId: tweet.in_reply_to_status_id || tweet.inReplyToStatusId,
                inReplyToTweetId: tweet.in_reply_to_tweet_id || tweet.inReplyToTweetId,
                referencedTweets: tweet.referenced_tweets || tweet.referencedTweets,
                isReply: tweet.isReply !== undefined ? tweet.isReply : (!!replyId),
                inReplyToId: tweet.inReplyToId || replyId || undefined,
                conversationId: tweet.conversationId || undefined,
                inReplyToUserId: tweet.inReplyToUserId || undefined,
                inReplyToUsername: tweet.inReplyToUsername || undefined,
                displayTextRange: tweet.displayTextRange || undefined,
                viewCount: tweet.viewCount || tweet.view_count || undefined,
                // Extract card data (handle both camelCase and snake_case)
                card: tweet.card || tweet.Card || undefined,
            };
            
            // Log card data if present
            if (processedTweet.card) {
                console.log(`Tweet ${tweet.id} has card data:`, {
                    hasImage: !!(processedTweet.card.photo_image_full_size_large || processedTweet.card.thumbnail_image),
                    hasDescription: !!processedTweet.card.description,
                    hasTitle: !!processedTweet.card.title,
                    domain: processedTweet.card.domain
                });
            }

            return processedTweet;
        });

        // Process includes.tweets and replied_to_tweets as separate tweets
        // Create a set of main tweet IDs to avoid duplicates
        const mainTweetIds = new Set(processedMainTweets.map(t => t.id));
        
        // Process includes.tweets
        const processedIncludesTweets: Tweet[] = includesTweets
            .filter((tweet: any) => tweet && tweet.id && !mainTweetIds.has(tweet.id))
            .map((tweet: any) => {
                const processed = processRawTweet(tweet, true);
                if (processed) {
                    // Try to match conversationId with a referencing tweet
                    // Find tweets that reference this included tweet
                    const referencingTweet = processedMainTweets.find(t => 
                        t.inReplyToId === tweet.id || 
                        t.referencedTweets?.some(ref => ref.id === tweet.id)
                    );
                    if (referencingTweet?.conversationId) {
                        processed.conversationId = referencingTweet.conversationId;
                        console.log(`[advancedSearch] Grouped includes tweet ${tweet.id} with referencing tweet ${referencingTweet.id} (conversationId: ${referencingTweet.conversationId})`);
                    } else if (processed.conversationId) {
                        console.log(`[advancedSearch] Includes tweet ${tweet.id} already has conversationId: ${processed.conversationId}`);
                    }
                }
                return processed;
            })
            .filter((tweet): tweet is Tweet => tweet !== undefined);
        
        console.log(`Processed ${processedIncludesTweets.length} tweets from includes.tweets`);
        
        // Process replied_to_tweets
        const processedRepliedToTweets: Tweet[] = repliedToTweets
            .filter((tweet: any) => tweet && tweet.id && !mainTweetIds.has(tweet.id))
            .map((tweet: any) => {
                const processed = processRawTweet(tweet, true);
                if (processed) {
                    // Try to match conversationId with a referencing tweet
                    // Find tweets that reply to this tweet
                    const referencingTweet = processedMainTweets.find(t => 
                        t.inReplyToId === tweet.id || 
                        t.inReplyToStatusId === tweet.id ||
                        t.inReplyToTweetId === tweet.id
                    );
                    if (referencingTweet?.conversationId) {
                        processed.conversationId = referencingTweet.conversationId;
                        console.log(`[advancedSearch] Grouped replied_to tweet ${tweet.id} with referencing tweet ${referencingTweet.id} (conversationId: ${referencingTweet.conversationId})`);
                    } else if (processed.conversationId) {
                        console.log(`[advancedSearch] Replied_to tweet ${tweet.id} already has conversationId: ${processed.conversationId}`);
                    }
                }
                return processed;
            })
            .filter((tweet): tweet is Tweet => tweet !== undefined);
        
        console.log(`Processed ${processedRepliedToTweets.length} tweets from replied_to_tweets`);
        
        // Combine all tweets: main tweets + includes tweets + replied_to tweets
        const allTweets = [...processedMainTweets, ...processedIncludesTweets, ...processedRepliedToTweets];
        
        console.log(`Successfully processed ${allTweets.length} total tweets (${processedMainTweets.length} main + ${processedIncludesTweets.length} includes + ${processedRepliedToTweets.length} replied_to)`);

        return {
            tweets: allTweets,
            hasNextPage: apiResponse.has_next_page || false,
            nextCursor: apiResponse.next_cursor || '',
            requestUrl: requestUrl,
            rawResponse: responseText,
        };

    } catch (error) {
        console.error("=== Error in advancedSearch ===");
        console.error("Error type:", error?.constructor?.name);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        
        if (error instanceof Error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                console.error("CORS Error detected");
                throw new Error('CORS Error: The API server does not allow requests from this origin. Using CORS proxy to resolve this.');
            }
            throw error;
        }
        throw new Error("An unknown error occurred while performing advanced search.");
    }
}

