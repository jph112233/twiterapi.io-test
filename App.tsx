import React, { useState, useCallback } from 'react';
import { fetchUserTweets, advancedSearch, organizeTweetsIntoThreads, calculateEngagementRate, Tweet } from './services/twitterService';

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 2.293a1 1 0 011.414 0L8 8.586l1.293-1.293a1 1 0 111.414 1.414L9.414 10l1.293 1.293a1 1 0 01-1.414 1.414L8 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 10 5.293 8.707a1 1 0 010-1.414zM12 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
);


const LoadingSpinner = () => (
    <div className="flex justify-center items-center space-x-2 my-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
        <span className="text-gray-400">Fetching tweets...</span>
    </div>
);

const TweetCard: React.FC<{ tweet: Tweet; depth?: number; isIncludedTweet?: boolean }> = ({ tweet, depth = 0, isIncludedTweet = false }) => {
    const author = tweet.author || { name: 'Unknown User', userName: 'unknown', profilePicture: ''};
    const isReply = tweet.isReply || !!tweet.inReplyToId;
    
    // Use displayTextRange to exclude @mention prefix for replies
    let displayText = tweet.text;
    if (isReply && tweet.displayTextRange && tweet.displayTextRange.length >= 2) {
        const [start, end] = tweet.displayTextRange;
        if (start >= 0 && end <= tweet.text.length && start < end) {
            displayText = tweet.text.substring(start, end);
        }
    }
    
    // Calculate indentation and styling based on depth
    const marginLeft = depth > 0 ? `${Math.min(depth * 1, 4)}rem` : '0';
    const borderColor = depth > 0 ? 'border-teal-500/30' : 'border-gray-700';
    const bgColor = depth > 0 ? 'bg-gray-800/40' : 'bg-gray-800/50';
    const threadLineLeft = depth > 0 ? `${(depth - 1) * 1 + 0.5}rem` : '0';
    
    return (
        <div 
            className={`${bgColor} backdrop-blur-sm rounded-xl p-4 shadow-lg border ${borderColor} animate-fade-in relative`}
            style={{ marginLeft }}
        >
            {/* Show indicator for included/replied-to tweets */}
            {isIncludedTweet && (
                <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/30">
                    Included Tweet
                </div>
            )}
            {/* Show thread connector line for replies */}
            {depth > 0 && (
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-teal-500/20" 
                    style={{ left: threadLineLeft }}
                ></div>
            )}
            
            {/* Show reply indicator with username if available */}
            {isReply && tweet.inReplyToUsername && (
                <div className="mb-2 flex items-center space-x-2">
                    <span className="text-gray-500 text-xs">↩️</span>
                    <p className="text-gray-500 text-sm">Replying to</p>
                    <p className="text-teal-400 text-sm font-medium">@{tweet.inReplyToUsername}</p>
                </div>
            )}
            
            {isReply && tweet.repliedTo && !tweet.inReplyToUsername && (
                <div className="mb-3 pl-4 border-l-4 border-gray-600 bg-gray-900/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                        <p className="text-gray-500 text-sm">Replying to</p>
                        <p className="text-gray-400 text-sm truncate">@{tweet.repliedTo.author?.userName || 'unknown'}</p>
                    </div>
                    <div className="flex space-x-3">
                        <img 
                            src={tweet.repliedTo.author?.profilePicture || ''} 
                            alt={tweet.repliedTo.author?.name || 'User'} 
                            className="w-8 h-8 rounded-full flex-shrink-0" 
                        />
                        <div className="flex-1 overflow-hidden min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                                <p className="font-semibold text-gray-300 text-sm truncate">{tweet.repliedTo.author?.name || 'Unknown User'}</p>
                                <p className="text-gray-500 text-xs truncate">@{tweet.repliedTo.author?.userName || 'unknown'}</p>
                                {tweet.repliedTo.createdAt && (
                                    <>
                                        <p className="text-gray-600">·</p>
                                        <p className="text-gray-500 text-xs whitespace-nowrap">{new Date(tweet.repliedTo.createdAt).toLocaleString()}</p>
                                    </>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap break-words">{tweet.repliedTo.text}</p>
                            {tweet.repliedTo.entities?.media?.[0]?.media_url_https && (
                                <img 
                                    src={tweet.repliedTo.entities.media[0].media_url_https} 
                                    alt="Reply media" 
                                    className="mt-2 rounded-lg w-full max-h-48 object-cover border border-gray-700" 
                                />
                            )}
                            {tweet.repliedTo.card && (
                                <div className="mt-2 border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
                                    {tweet.repliedTo.card.photo_image_full_size_large || tweet.repliedTo.card.thumbnail_image ? (
                                        <img 
                                            src={tweet.repliedTo.card.photo_image_full_size_large || tweet.repliedTo.card.thumbnail_image} 
                                            alt={tweet.repliedTo.card.title || "Link preview"} 
                                            className="w-full max-h-48 object-cover"
                                        />
                                    ) : null}
                                    <div className="p-3">
                                        {tweet.repliedTo.card.domain && (
                                            <p className="text-gray-500 text-xs mb-1 uppercase">{tweet.repliedTo.card.domain}</p>
                                        )}
                                        {tweet.repliedTo.card.title && (
                                            <h3 className="text-white font-semibold text-xs mb-1">{tweet.repliedTo.card.title}</h3>
                                        )}
                                        {tweet.repliedTo.card.description && (
                                            <p className="text-gray-400 text-xs line-clamp-2">{tweet.repliedTo.card.description}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex space-x-4 relative">
                <img src={author.profilePicture} alt={author.name} className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center space-x-2 flex-wrap">
                        {isReply && !tweet.inReplyToUsername && (
                            <span className="text-gray-500 text-xs mr-1">↩️</span>
                        )}
                        <p className="font-bold text-white truncate">{author.name}</p>
                        <p className="text-gray-400 truncate">@{author.userName}</p>
                        <p className="text-gray-500">·</p>
                        {tweet.url ? (
                            <a 
                                href={tweet.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-500 text-sm whitespace-nowrap hover:text-teal-400 hover:underline transition-colors cursor-pointer"
                            >
                                {new Date(tweet.createdAt).toLocaleString()}
                            </a>
                        ) : (
                            <p className="text-gray-500 text-sm whitespace-nowrap">{new Date(tweet.createdAt).toLocaleString()}</p>
                        )}
                    </div>
                    <p className="text-gray-300 mt-2 whitespace-pre-wrap break-words">{displayText}</p>
                    {tweet.entities?.media?.[0]?.media_url_https && (
                        <img src={tweet.entities.media[0].media_url_https} alt="Tweet media" className="mt-3 rounded-lg w-full max-h-80 object-cover border border-gray-700" />
                    )}
                    {tweet.card && (
                        <div className="mt-3 border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
                            {tweet.card.photo_image_full_size_large || tweet.card.thumbnail_image ? (
                                <img 
                                    src={tweet.card.photo_image_full_size_large || tweet.card.thumbnail_image} 
                                    alt={tweet.card.title || "Link preview"} 
                                    className="w-full max-h-64 object-cover"
                                />
                            ) : null}
                            <div className="p-4">
                                {tweet.card.domain && (
                                    <p className="text-gray-500 text-xs mb-1 uppercase">{tweet.card.domain}</p>
                                )}
                                {tweet.card.title && (
                                    <h3 className="text-white font-semibold text-sm mb-2">{tweet.card.title}</h3>
                                )}
                                {tweet.card.description && (
                                    <p className="text-gray-400 text-sm line-clamp-2">{tweet.card.description}</p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center space-x-6 mt-4 text-gray-500">
                        <span>❤️ {tweet.likeCount || 0}</span>
                        <span>🔁 {tweet.retweetCount || 0}</span>
                        {tweet.replyCount > 0 && (
                            <span>💬 {tweet.replyCount}</span>
                        )}
                        {tweet.quoteCount > 0 && (
                            <span>💭 {tweet.quoteCount}</span>
                        )}
                    </div>
                    {(() => {
                        const engagementRate = calculateEngagementRate(tweet);
                        if (engagementRate !== null) {
                            return (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-sm">Engagement Rate:</span>
                                        <span className="text-teal-400 font-semibold text-sm">
                                            {engagementRate.toFixed(2)}%
                                        </span>
                                    </div>
                                    {tweet.viewCount && (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-gray-500 text-xs">
                                                {((tweet.likeCount || 0) + (tweet.replyCount || 0) + (tweet.retweetCount || 0) + (tweet.quoteCount || 0))} engagements
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                {tweet.viewCount.toLocaleString()} views
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        </div>
    );
};

const AdvancedOptionInput: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, type?: string, disabled: boolean}> = 
({label, value, onChange, placeholder, type = "text", disabled}) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-gray-900 text-gray-200 rounded-lg px-4 py-2 border border-gray-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition duration-200 placeholder-gray-500 text-sm"
            disabled={disabled}
            aria-label={label}
        />
    </div>
);

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'user' | 'advancedSearch'>('user');
    const [apiKey, setApiKey] = useState<string>('new1_c216fca4d29d462995d60c8bb58c8f78');
    
    // User tab state
    const [username, setUsername] = useState<string>('gregisenberg');
    const [userId, setUserId] = useState<string>('');
    const [cursor, setCursor] = useState<string>('');
    const [includeReplies, setIncludeReplies] = useState<boolean>(false);
    
    // Advanced Search tab state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [queryType, setQueryType] = useState<'Latest' | 'Top'>('Latest');
    const [searchCursor, setSearchCursor] = useState<string>('');
    
    // Shared state
    const [responseData, setResponseData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [showDebug, setShowDebug] = useState<boolean>(false);
    const [debugInfo, setDebugInfo] = useState<{ requestUrl: string; rawResponse: string } | null>(null);
    const [hasNextPage, setHasNextPage] = useState<boolean>(false);
    const [nextCursor, setNextCursor] = useState<string>('');


    const handleFetch = useCallback(async () => {
        setError('');
        setResponseData(null);
        setIsLoading(true);
        setDebugInfo(null);
        setHasNextPage(false);
        setNextCursor('');
        try {
            const result = await fetchUserTweets({ 
                userName: username || undefined, 
                userId: userId || undefined,
                apiKey, 
                cursor: cursor || undefined, 
                includeReplies 
            });
            setResponseData(result.tweets); // result.tweets holds the parsed JSON data
            setDebugInfo({ requestUrl: result.requestUrl, rawResponse: result.rawResponse });
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [username, userId, apiKey, cursor, includeReplies]);

    const handleAdvancedSearch = useCallback(async () => {
        setError('');
        setResponseData(null);
        setIsLoading(true);
        setDebugInfo(null);
        setHasNextPage(false);
        setNextCursor('');
        try {
            const result = await advancedSearch({ 
                query: searchQuery,
                queryType,
                cursor: searchCursor || undefined,
                apiKey
            });
            setResponseData(result.tweets);
            setHasNextPage(result.hasNextPage);
            setNextCursor(result.nextCursor);
            setDebugInfo({ requestUrl: result.requestUrl, rawResponse: result.rawResponse });
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, queryType, searchCursor, apiKey]);

    const handleLoadMore = useCallback(async () => {
        if (!nextCursor || isLoading) return;
        setIsLoading(true);
        setError('');
        try {
            if (activeTab === 'advancedSearch') {
                const result = await advancedSearch({ 
                    query: searchQuery,
                    queryType,
                    cursor: nextCursor,
                    apiKey
                });
                setResponseData((prev: Tweet[]) => [...(prev || []), ...result.tweets]);
                setHasNextPage(result.hasNextPage);
                setNextCursor(result.nextCursor);
            } else {
                const result = await fetchUserTweets({ 
                    userName: username || undefined, 
                    userId: userId || undefined,
                    apiKey, 
                    cursor: nextCursor, 
                    includeReplies 
                });
                setResponseData((prev: Tweet[]) => [...(prev || []), ...result.tweets]);
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [nextCursor, isLoading, activeTab, searchQuery, queryType, apiKey, username, userId, includeReplies]);
    
    const prettyPrintJson = (jsonString: string) => {
        try {
            return JSON.stringify(JSON.parse(jsonString), null, 2);
        } catch {
            return jsonString; // Return original string if it's not valid JSON
        }
    }

    // Recursive function to render a tweet and its children
    const renderTweetThread = (tweet: Tweet, depth: number = 0): React.ReactNode => {
        const isIncludedTweet = (tweet as any)._source === 'includes' || (tweet as any)._source === 'replied_to';
        return (
            <div key={tweet.id} className="relative">
                <TweetCard tweet={tweet} depth={depth} isIncludedTweet={isIncludedTweet} />
                {tweet.children && tweet.children.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {tweet.children.map(child => renderTweetThread(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderResults = () => {
        if (isLoading) return <LoadingSpinner />;
        if (error) {
            return (
                <div role="alert" className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-left animate-fade-in">
                    <p className="font-bold">An Error Occurred</p>
                    <p className="text-sm mt-1 break-words">{error}</p>
                </div>
            );
        }
        if (!responseData) return null;

        // Check if the response looks like an array of tweets
        const isTweetArray = Array.isArray(responseData) && (responseData.length === 0 || (responseData[0] && typeof responseData[0].id === 'string' && typeof responseData[0].text === 'string'));

        if (isTweetArray) {
            if (responseData.length === 0) {
                 return (
                    <div role="status" className="bg-gray-800/60 border border-gray-700 text-gray-300 px-4 py-3 rounded-lg text-center animate-fade-in">
                        <p className="font-bold">No Results</p>
                        <p className="text-sm mt-1">
                            {activeTab === 'user' 
                                ? `No tweets found for user "${username}". This could be because the user has no recent tweets, the account is private, or the username is incorrect.`
                                : `No tweets found for your search query. Try adjusting your search terms or filters.`
                            }
                        </p>
                    </div>
                );
            }
            
            const tweets = responseData as Tweet[];
            
            // Group tweets by conversationId first
            const conversationGroups = new Map<string, Tweet[]>();
            const standaloneTweets: Tweet[] = [];
            
            tweets.forEach(tweet => {
                if (tweet.conversationId) {
                    if (!conversationGroups.has(tweet.conversationId)) {
                        conversationGroups.set(tweet.conversationId, []);
                    }
                    conversationGroups.get(tweet.conversationId)!.push(tweet);
                } else {
                    standaloneTweets.push(tweet);
                }
            });
            
            // Sort conversation groups by oldest tweet's createdAt (oldest first)
            const sortedConversations = Array.from(conversationGroups.entries()).sort(([idA, tweetsA], [idB, tweetsB]) => {
                // Find the oldest tweet in each conversation
                const oldestA = tweetsA.reduce((oldest, tweet) => {
                    const tweetDate = new Date(tweet.createdAt).getTime();
                    const oldestDate = new Date(oldest.createdAt).getTime();
                    return tweetDate < oldestDate ? tweet : oldest;
                });
                
                const oldestB = tweetsB.reduce((oldest, tweet) => {
                    const tweetDate = new Date(tweet.createdAt).getTime();
                    const oldestDate = new Date(oldest.createdAt).getTime();
                    return tweetDate < oldestDate ? tweet : oldest;
                });
                
                // Compare oldest tweets - older (smaller timestamp) comes first
                return new Date(oldestA.createdAt).getTime() - new Date(oldestB.createdAt).getTime();
            });
            
            // Sort standalone tweets by createdAt (oldest first)
            const sortedStandaloneTweets = standaloneTweets.sort((a, b) => {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
            
            return (
                <div className="space-y-6">
                    {/* Render conversation groups - organize each group into threads, ordered oldest to newest */}
                    {sortedConversations.map(([conversationId, conversationTweets]) => {
                        // Sort tweets within conversation by createdAt (oldest first) before organizing into threads
                        // This ensures included/replied-to tweets appear before the tweets that reference them
                        const sortedConversationTweets = [...conversationTweets].sort((a, b) => {
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        });
                        
                        // Organize tweets within this conversation into threads
                        const organizedThreads = organizeTweetsIntoThreads(sortedConversationTweets);
                        
                        // Sort threads within conversation by root tweet's createdAt (oldest first)
                        const sortedThreads = organizedThreads.sort((a, b) => {
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        });
                        
                        return (
                            <div 
                                key={conversationId} 
                                className="bg-gray-900/30 rounded-xl p-4 border-2 border-teal-500/20 shadow-lg"
                            >
                                <div className="space-y-3">
                                    {sortedThreads.map(tweet => renderTweetThread(tweet, 0))}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Render standalone tweets (no conversationId) - organize into threads, ordered oldest to newest */}
                    {sortedStandaloneTweets.length > 0 && (
                        <div className="space-y-4">
                            {organizeTweetsIntoThreads(sortedStandaloneTweets)
                                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                .map(tweet => renderTweetThread(tweet, 0))}
                        </div>
                    )}
                </div>
            );
        } else {
            // Render other JSON objects in a readable format
            return (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-300 mb-2">API JSON Response</h3>
                    <pre className="text-white whitespace-pre-wrap break-all max-h-[40rem] overflow-y-auto bg-black/20 p-3 rounded font-mono text-sm">
                        <code>{prettyPrintJson(JSON.stringify(responseData))}</code>
                    </pre>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 font-sans">
            <div className="w-full max-w-3xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 text-transparent bg-clip-text">
                        Twitter API Viewer
                    </h1>
                    <p className="text-gray-400 mt-2">Fetch user tweets and search via twitterapi.io</p>
                </header>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-700">
                    <nav className="flex space-x-1" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('user')}
                            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                                activeTab === 'user'
                                    ? 'bg-gray-800/50 text-teal-400 border-b-2 border-teal-400'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                            }`}
                        >
                            User
                        </button>
                        <button
                            onClick={() => setActiveTab('advancedSearch')}
                            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                                activeTab === 'advancedSearch'
                                    ? 'bg-gray-800/50 text-teal-400 border-b-2 border-teal-400'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                            }`}
                        >
                            Advanced Search
                        </button>
                    </nav>
                </div>

                <main>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-gray-700 space-y-4">
                        <div className="relative">
                            <KeyIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your twitterapi.io API Key"
                                className="w-full bg-gray-900 text-gray-200 rounded-lg pl-11 pr-4 py-3 border-2 border-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 placeholder-gray-500"
                                disabled={isLoading}
                                aria-label="API Key"
                            />
                        </div>

                        {activeTab === 'user' ? (
                            <>
                                <div className="relative">
                                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter a Twitter username (e.g., gregisenberg)"
                                        className="w-full bg-gray-900 text-gray-200 rounded-lg pl-11 pr-4 py-3 border-2 border-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 placeholder-gray-500"
                                        disabled={isLoading}
                                        aria-label="Twitter Username"
                                    />
                                </div>
                                {/* Advanced Options */}
                                <div className="pt-2">
                                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-center w-full text-gray-400 hover:text-white transition">
                                        <span>Advanced Options</span>
                                        <ChevronDownIcon className={`w-5 h-5 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showAdvanced && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                            <AdvancedOptionInput label="User ID" type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g., 123456789" disabled={isLoading} />
                                            <AdvancedOptionInput label="Cursor" type="text" value={cursor} onChange={e => setCursor(e.target.value)} placeholder="Pagination cursor" disabled={isLoading} />
                                            <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2 border border-gray-600 h-full">
                                                <label htmlFor="include-replies" className="text-sm font-medium text-gray-300">Include Replies</label>
                                                <input
                                                    id="include-replies"
                                                    type="checkbox"
                                                    checked={includeReplies}
                                                    onChange={e => setIncludeReplies(e.target.checked)}
                                                    disabled={isLoading}
                                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-teal-500 focus:ring-teal-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleFetch}
                                    disabled={isLoading || (!username && !userId) || !apiKey}
                                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center text-lg shadow-lg mt-4"
                                >
                                    {isLoading ? 'Fetching...' : 'Fetch Tweets'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Search Query</label>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder='e.g., "AI" OR "Twitter" from:elonmusk since:2021-12-31_23:59:59_UTC'
                                        className="w-full bg-gray-900 text-gray-200 rounded-lg px-4 py-3 border-2 border-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 placeholder-gray-500"
                                        disabled={isLoading}
                                        aria-label="Search Query"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Use advanced search syntax. See{' '}
                                        <a 
                                            href="https://github.com/igorbrigadir/twitter-advanced-search" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-teal-400 hover:underline"
                                        >
                                            examples
                                        </a>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Query Type</label>
                                    <select
                                        value={queryType}
                                        onChange={(e) => setQueryType(e.target.value as 'Latest' | 'Top')}
                                        className="w-full bg-gray-900 text-gray-200 rounded-lg px-4 py-3 border-2 border-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200"
                                        disabled={isLoading}
                                    >
                                        <option value="Latest">Latest</option>
                                        <option value="Top">Top</option>
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-center w-full text-gray-400 hover:text-white transition">
                                        <span>Advanced Options</span>
                                        <ChevronDownIcon className={`w-5 h-5 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showAdvanced && (
                                        <div className="mt-4 animate-fade-in">
                                            <AdvancedOptionInput label="Cursor" type="text" value={searchCursor} onChange={e => setSearchCursor(e.target.value)} placeholder="Pagination cursor" disabled={isLoading} />
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleAdvancedSearch}
                                    disabled={isLoading || !searchQuery || !apiKey}
                                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center text-lg shadow-lg mt-4"
                                >
                                    {isLoading ? 'Searching...' : 'Search Tweets'}
                                </button>
                            </>
                        )}
                    </div>

                    {debugInfo && (
                        <div className="mt-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-700">
                             <button onClick={() => setShowDebug(!showDebug)} className="flex items-center justify-between w-full text-gray-400 hover:text-white transition">
                                <div className="flex items-center">
                                    <TerminalIcon className="w-5 h-5 mr-2" />
                                    <span>API Call Details</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 ml-1 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
                            </button>
                            {showDebug && (
                                <div className="mt-3 p-4 bg-gray-900/70 rounded-lg border border-gray-600 font-mono text-sm space-y-4 animate-fade-in">
                                    <div>
                                        <p className="text-gray-500 text-xs">// API Request URL</p>
                                        <code className="text-cyan-300 break-all select-all">{debugInfo.requestUrl}</code>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">// API Response Body (Raw)</p>
                                        <pre className="text-green-300 whitespace-pre-wrap break-all max-h-96 overflow-y-auto bg-black/20 p-2 rounded">
                                            <code>{prettyPrintJson(debugInfo.rawResponse)}</code>
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {hasNextPage && activeTab === 'advancedSearch' && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading || !hasNextPage}
                                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition duration-200"
                            >
                                {isLoading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}

                    <div className="mt-8 min-h-[10rem]">
                        {renderResults()}
                    </div>
                </main>

                <footer className="text-center mt-12 text-gray-500 text-sm">
                    <p>Displaying data from twitterapi.io</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
