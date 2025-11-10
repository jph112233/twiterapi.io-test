import React, { useState, useCallback } from 'react';
import { fetchUserTweets, Tweet } from './services/twitterService';

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

const TweetCard: React.FC<{ tweet: Tweet }> = ({ tweet }) => {
    const author = tweet.author || { name: 'Unknown User', userName: 'unknown', profilePicture: ''};
    
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700 flex space-x-4 animate-fade-in">
            <img src={author.profilePicture} alt={author.name} className="w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center space-x-2 flex-wrap">
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
                <p className="text-gray-300 mt-2 whitespace-pre-wrap break-words">{tweet.text}</p>
                {tweet.entities?.media?.[0]?.media_url_https && (
                    <img src={tweet.entities.media[0].media_url_https} alt="Tweet media" className="mt-3 rounded-lg w-full max-h-80 object-cover border border-gray-700" />
                )}
                <div className="flex items-center space-x-6 mt-4 text-gray-500">
                    <span>❤️ {tweet.likeCount || 0}</span>
                    <span>🔁 {tweet.retweetCount || 0}</span>
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
    const [apiKey, setApiKey] = useState<string>('new1_c216fca4d29d462995d60c8bb58c8f78');
    const [username, setUsername] = useState<string>('gregisenberg');
    const [responseData, setResponseData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [showDebug, setShowDebug] = useState<boolean>(false);
    const [debugInfo, setDebugInfo] = useState<{ requestUrl: string; rawResponse: string } | null>(null);

    // Advanced Options State
    const [userId, setUserId] = useState<string>('');
    const [cursor, setCursor] = useState<string>('');
    const [includeReplies, setIncludeReplies] = useState<boolean>(false);


    const handleFetch = useCallback(async () => {
        setError('');
        setResponseData(null);
        setIsLoading(true);
        setDebugInfo(null);
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
    
    const prettyPrintJson = (jsonString: string) => {
        try {
            return JSON.stringify(JSON.parse(jsonString), null, 2);
        } catch {
            return jsonString; // Return original string if it's not valid JSON
        }
    }

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
                        <p className="text-sm mt-1">No tweets found for user "{username}". This could be because the user has no recent tweets, the account is private, or the username is incorrect.</p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {(responseData as Tweet[]).map(tweet => <TweetCard key={tweet.id} tweet={tweet} />)}
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
                    <p className="text-gray-400 mt-2">Fetch user tweets via twitterapi.io</p>
                </header>

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
