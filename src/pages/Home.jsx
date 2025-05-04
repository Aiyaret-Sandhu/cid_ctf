import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

function Home() {
    const [user, setUser] = useState(null);
    const [eventStatus, setEventStatus] = useState('loading'); // loading, not-started, active, ended
    const [teamData, setTeamData] = useState(null);
    const [qualified, setQualified] = useState(null); // Use null instead of false initially
    const [qualificationChecked, setQualificationChecked] = useState(false);

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [challenges, setChallenges] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    const [isRegistered, setIsRegistered] = useState(null); // Change false to null initially
    const [registrationChecking, setRegistrationChecking] = useState(true); // Add new loading state

    const navigate = useNavigate();

    // Handle sign out
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Check user auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Check if the user is registered as a team member
    useEffect(() => {
        const checkRegistration = async (email) => {
            setRegistrationChecking(true); // Start checking
            try {
                const teamsRef = collection(db, "teams");
                const teamQuery = query(teamsRef, where("email", "==", email));
                const teamSnapshot = await getDocs(teamQuery);

                if (!teamSnapshot.empty) {
                    setIsRegistered(true);
                } else {
                    setIsRegistered(false);
                }
            } catch (error) {
                console.error("Error checking registration:", error);
            } finally {
                setRegistrationChecking(false); // Done checking
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                checkRegistration(currentUser.email);
            } else {
                setUser(null);
                setRegistrationChecking(false);
                setLoading(false);
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // Load event settings and team data
    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchSettings();
                if (user) {
                    await fetchTeamData(user.email);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
            }
        };

        fetchData();
    }, [user]);

    // Fetch settings and determine event status
    const fetchSettings = async () => {
        try {
            const settingsRef = doc(db, "settings", "eventConfig");
            const settingsSnapshot = await getDoc(settingsRef);

            if (settingsSnapshot.exists()) {
                const data = settingsSnapshot.data();
                setSettings(data);

                // Check event status based on current time and settings
                const now = new Date();
                const startTime = data.eventStartTime?.toDate();
                const endTime = data.eventEndTime?.toDate();

                if (startTime && now < startTime) {
                    setEventStatus('not-started');
                } else if (endTime && now > endTime) {
                    setEventStatus('ended');
                    // If event ended, check if user's team qualified
                    if (user) {
                        checkQualificationStatus(user.email, data.finalistCount);
                    }
                } else {
                    setEventStatus('active');
                    // If event is active and user is logged in, try to fetch challenges
                    if (user) {
                        fetchChallenges();
                        // Also fetch teams for leaderboard
                        fetchLeaderboard();
                    }
                }
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    };

    // Fetch team data for the current user
    const fetchTeamData = async (userEmail) => {
        if (!userEmail) return;

        try {
            const teamsRef = collection(db, "teams");
            const teamQuery = query(teamsRef, where("email", "==", userEmail));
            const teamSnapshot = await getDocs(teamQuery);

            if (!teamSnapshot.empty) {
                const teamDoc = teamSnapshot.docs[0];
                const team = { id: teamDoc.id, ...teamDoc.data() };
                setTeamData(team);

                // If event is active, fetch challenges and leaderboard after getting team data
                if (eventStatus === 'active') {
                    fetchChallenges();
                    fetchLeaderboard();
                }
            }
        } catch (error) {
            console.error("Error fetching team data:", error);
        }
    };

    // Fetch available challenges (only when event is active)
    const fetchChallenges = async () => {
        try {
            const challengesRef = collection(db, "challenges");
            const activeChallengesQuery = query(challengesRef, where("active", "==", true));
            const challengesSnapshot = await getDocs(activeChallengesQuery);

            const challengesList = challengesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            setChallenges(challengesList);
            // console.log("Challenges loaded:", challengesList.length);
        } catch (error) {
            console.error("Error fetching challenges:", error);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            console.log("Fetching leaderboard data...");
            setLeaderboardLoading(true);
            const teamsRef = collection(db, "teams");
            const teamsSnapshot = await getDocs(teamsRef);

            if (teamsSnapshot.empty) {
                console.log("No teams found in the database");
                setAllTeams([]);
                return;
            }

            const teamsList = teamsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || "Unknown Team",
                    email: data.email || "",
                    score: data.score || 0,
                    solvedChallenges: data.solvedChallenges || [],
                    completedAt: data.completedAt || null, // Ensure this field exists in Firestore
                };
            });

            // Sort by score (highest first), then by completion time (earliest first)
            const sortedTeams = teamsList.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; // Higher score first
                }
                if (a.completedAt && b.completedAt) {
                    return a.completedAt.toMillis() - b.completedAt.toMillis(); // Earlier completion first
                }
                return 0; // If no completion time, keep order
            });

            // console.log("Teams loaded for leaderboard:", sortedTeams.length);
            // console.log(sortedTeams);
            setAllTeams(sortedTeams);
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
            setAllTeams([]);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    // Check if user's team is in top finalists when event ends
    const checkQualificationStatus = async (userEmail, finalistCount) => {
        if (!userEmail || !finalistCount) return;

        try {
            // Find user's team
            const teamsRef = collection(db, "teams");
            const teamQuery = query(teamsRef, where("email", "==", userEmail));
            const teamSnapshot = await getDocs(teamQuery);

            if (!teamSnapshot.empty) {
                const teamDoc = teamSnapshot.docs[0];
                const team = { id: teamDoc.id, ...teamDoc.data() };
                setTeamData(team);

                // Get all teams sorted by score
                const allTeamsSnapshot = await getDocs(teamsRef);
                const allTeams = allTeamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort teams by score (highest first)
                const sortedTeams = allTeams.sort((a, b) => b.score - a.score);

                // Find team's rank
                const teamRank = sortedTeams.findIndex(t => t.id === team.id) + 1;

                // Check if team is in top finalists
                setQualified(teamRank <= finalistCount);
            }
        } catch (error) {
            console.error("Error checking qualification status:", error);
        } finally {
            // Mark qualification check as complete regardless of result
            setQualificationChecked(true);
        }
    };

    // Calculate team progress percentages and challenge completion status
    const calculateTeamProgress = () => {
        if (!teamData || !challenges.length) return { percent: 0, solved: 0, total: 0 };

        const solvedCount = teamData.solvedChallenges?.length || 0;
        const totalCount = challenges.length;
        const percentComplete = Math.round((solvedCount / totalCount) * 100);

        return {
            percent: percentComplete,
            solved: solvedCount,
            total: totalCount
        };
    };

    // Check if all challenges are completed
    const allChallengesCompleted = challenges.length > 0 &&
        teamData?.solvedChallenges &&
        challenges.every(challenge => teamData.solvedChallenges.includes(challenge.id));

    // Force refresh leaderboard and challenges when needed
    useEffect(() => {
        if (eventStatus === 'active' && user && teamData) {
            fetchChallenges();
            fetchLeaderboard();
        }
    }, [eventStatus, user, teamData]);

    // Improved loader UI with yellow/black theme
    if (loading || registrationChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center p-6 bg-black border border-yellow-700/30 rounded-xl shadow-xl backdrop-blur-sm max-w-md">
                    <div className="relative mx-auto w-20 h-20 mb-6">
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20"></div>
                        {/* Spinning element */}
                        <div className="absolute inset-2 rounded-full border-t-4 border-l-4 border-yellow-500 animate-spin"></div>
                        {/* Pulsing center */}
                        <div className="absolute inset-5 rounded-full bg-yellow-600/80 animate-pulse flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-yellow-300"></div>
                        </div>
                    </div>

                    <h3 className="text-xl font-mono text-yellow-300 mb-2">SECURE SYSTEM LOADING</h3>
                    <p className="text-yellow-500/80 font-mono text-sm flex items-center justify-center">
                        <span className="h-1.5 w-1.5 bg-yellow-500 rounded-full mr-2 animate-ping"></span>
                        Establishing secure connection...
                    </p>

                    {/* Fake terminal-like progress indicator */}
                    <div className="mt-4 bg-black border border-yellow-700/50 rounded p-2 text-left font-mono text-xs">
                        <div className="text-yellow-500/70"> Initializing CID database...</div>
                        <div className="text-yellow-500/70"> Loading authentication protocols...</div>
                        <div className="flex items-center text-yellow-300">
                            <span className="animate-pulse mr-1"></span> Verifying credentials
                            <span className="ml-1 animate-pulse">_</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    // Updated registration required UI with yellow/black theme
    if (isRegistered === false) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center p-8 bg-black border border-yellow-700/30 rounded-xl shadow-xl max-w-md mx-auto">
                    <div className="w-16 h-16 bg-yellow-900/40 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-yellow-300 mb-4 font-mono">REGISTRATION REQUIRED</h2>
                    <div className="border-t border-yellow-700/30 pt-4">
                        <p className="text-yellow-100/70 mb-6 font-mono">
                            You need to register your team before participating in the CTF operation.
                        </p>
                    </div>
                    <div className="flex justify-center space-x-4 mt-6">
                        <button
                            onClick={handleSignOut}
                            className="px-5 py-2 bg-red-900/70 text-red-100 border border-red-700/50 rounded hover:bg-red-800 transition flex items-center font-mono"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6a1 1 0 102 0V6zm-6 0a1 1 0 10-2 0v6a1 1 0 102 0V6z" clipRule="evenodd" />
                            </svg>
                            EXIT SYSTEM
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Only UI changes - all functionality remains the same
    return (
        <div className="min-h-screen bg-black text-gray-100">
            {/* Header with yellow/black theme */}
            <header className="bg-black border-b border-yellow-500 shadow-lg">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="flex items-center text-yellow-400">
                            <div className="p-2 bg-yellow-900 rounded-lg mr-3 shadow-inner">
                                <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-2xl font-black tracking-tight">CID CTF</span>
                                <div className="text-xs font-mono text-yellow-500 -mt-1">Cipher Investigate Decrypt</div>
                            </div>
                        </Link>
                        <div className="flex items-center">
                            {user ? (
                                <div className="flex items-center">
                                    {teamData && (
                                        <div className="flex items-center bg-yellow-900/30 backdrop-blur-sm px-4 py-2 rounded-lg mr-4 border border-yellow-700 shadow-md">
                                            <div className="w-8 h-8 bg-yellow-900 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-yellow-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-yellow-100">{teamData.name}</span>
                                                {teamData.score > 0 && (
                                                    <div className="text-xs font-mono text-yellow-300 flex items-center">
                                                        <span className="text-yellow-400 mr-1">●</span>
                                                        {teamData.score} points
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-sm text-yellow-200 mr-4 hidden sm:block font-mono border-l border-yellow-700 pl-4">
                                        <span className="opacity-70">AGENT:</span> {user.email}
                                    </div>

                                    <Link
                                        to="/leaderboard"
                                        className="inline-flex items-center px-3 py-2 border border-yellow-700 text-sm font-medium rounded-md text-black bg-yellow-500 hover:bg-yellow-400 mr-2 transition-all shadow-lg hover:shadow-yellow-700/20"
                                    >
                                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Leaderboard
                                    </Link>

                                    <button
                                        onClick={handleSignOut}
                                        className="inline-flex items-center px-3 py-2 border border-red-700 text-sm font-medium rounded-md text-white bg-red-900 hover:bg-red-800 transition-all shadow-lg hover:shadow-red-700/20"
                                    >
                                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6a1 1 0 102 0V6zm-6 0a1 1 0 10-2 0v6a1 1 0 102 0V6z" clipRule="evenodd" />
                                        </svg>
                                        Exit
                                    </button>
                                </div>
                            ) : (
                                <div className="flex space-x-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center px-4 py-2 border border-yellow-600 text-sm font-medium rounded-md text-black bg-yellow-500 hover:bg-yellow-400 transition-all shadow-lg"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center px-4 py-2 border border-yellow-600/30 text-sm font-medium rounded-md text-yellow-100 bg-yellow-700/50 hover:bg-yellow-700/70 transition-all shadow-lg backdrop-blur-sm"
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Status Alerts - Yellow/Black theme */}
                {eventStatus === 'not-started' && (
                    <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-r-lg shadow-lg backdrop-blur-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-300 font-mono">
                                    STANDBY: CTF commences on {settings?.eventStartTime?.toDate().toLocaleDateString()} at {settings?.eventStartTime?.toDate().toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {eventStatus === 'active' && (
                    <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-r-lg shadow-lg backdrop-blur-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <div className="h-5 w-5 text-yellow-400 animate-pulse">●</div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-300 font-mono">
                                    <span className="font-semibold">STATUS: ACTIVE</span> Operation in progress.
                                    {settings?.eventEndTime && (
                                        <span className="font-medium"> Termination at {settings.eventEndTime.toDate().toLocaleDateString()} - {settings.eventEndTime.toDate().toLocaleTimeString()}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {eventStatus === 'ended' && (
                    <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-r-lg shadow-lg backdrop-blur-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-300 font-mono">
                                    <span className="font-semibold">MISSION COMPLETE:</span> Operation terminated. Files sealed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results after event ended - with updated yellow/black theme */}
                {eventStatus === 'ended' && user && teamData && qualificationChecked && (
                    <div className="bg-gray-900/70 border border-yellow-700/50 rounded-xl p-6 mb-8 shadow-xl backdrop-blur-md">
                        <h2 className="text-2xl font-black text-yellow-300 mb-5 flex items-center font-mono">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            MISSION REPORT
                        </h2>

                        {qualified ? (
                            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 border border-yellow-700/50 rounded-xl p-6 shadow-inner backdrop-blur-sm">
                                <h3 className="text-xl font-semibold text-yellow-300 mb-3 flex items-center font-mono">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    ACCESS GRANTED: {teamData.name}
                                </h3>
                                <p className="text-yellow-300 mb-4 pl-8 font-mono">
                                    Your credentials have been verified with performance rating: <span className="font-bold bg-yellow-900/50 px-2 py-0.5 rounded">Level {teamData.score || 0}</span>
                                </p>
                                <div className="border-t border-yellow-700/30 pt-4 mt-4">
                                    <h4 className="font-medium text-yellow-300 mb-2 font-mono">NEXT OPERATION BRIEFING:</h4>
                                    <p className="text-yellow-300 font-mono">{settings?.nextRoundInfo}</p>
                                    {settings?.venue && (
                                        <p className="text-yellow-300 mt-2 flex items-center font-mono">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            LOCATION: {settings.venue}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-yellow-700/30 rounded-xl p-6 shadow-inner">
                                <h3 className="text-xl font-medium text-yellow-300 mb-3 font-mono">OPERATION STATUS: COMPLETE</h3>
                                <p className="text-gray-400 mb-4 font-mono">
                                    {settings?.eliminationMessage || "Mission parameters not satisfied for next phase access."}
                                </p>
                                <p className="text-gray-400 flex items-center pl-8 font-mono">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    PERFORMANCE SCORE: <span className="font-semibold text-yellow-300">{teamData.score || 0}</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Active Challenges Section */}
                {eventStatus === 'active' && user && teamData && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-6 font-mono tracking-wider flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            ACTIVE CHALLENGES
                        </h2>

                        <div>
                            <Link
                                // Conditionally navigate to finalist waiting page if they're already a finalist
                                to={teamData.isFinalist ? "/finalist-waiting" : "/challenges"}
                                className="group bg-black/30 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-6 hover:bg-black/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-yellow-400 font-mono mb-2">
                                        CID Challenge Files
                                    </h3>
                                    <p className="text-yellow-100/70">
                                        {teamData.isFinalist
                                            ? "You've qualified as a finalist. Check your status."
                                            : "Access the active challenge files to compete in the CTF"}
                                    </p>
                                </div>
                                <div className="text-yellow-400 group-hover:translate-x-2 transition-transform duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}


                {/* Tab Switches Alert Section */}
                {teamData && teamData.challengeAttempts && Object.keys(teamData.challengeAttempts).some(id =>
                    teamData.challengeAttempts[id].lockedDueToTabSwitches) && (
                        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6 font-mono">
                            <div className="flex items-center mb-2">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-red-300">
                                        <span className="font-semibold">LOCKED CHALLENGES:</span> The following challenges were locked due to excessive tab switching.
                                    </p>
                                </div>
                            </div>
                            <div className="pl-8 mt-2">
                                <ul className="list-disc space-y-1">
                                    {Object.entries(teamData.challengeAttempts)
                                        .filter(([_, data]) => data.lockedDueToTabSwitches)
                                        .map(([challengeId, data]) => {
                                            // Find the challenge details
                                            const challenge = challenges.find(c => c.id === challengeId);
                                            return (
                                                <li key={challengeId} className="text-red-200">
                                                    {challenge ? challenge.title : "Unknown Challenge"} -
                                                    <span className="text-red-300"> {data.tabSwitches} tab switches detected</span>
                                                </li>
                                            );
                                        })}
                                </ul>
                            </div>
                        </div>
                    )}

                {/* Tab Switch Counter and Limit */}
                {settings?.maxTabSwitches && teamData && eventStatus === 'active' && (
                    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-6 font-mono">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h10v8H5V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex justify-between w-full">
                                <p className="text-yellow-300">
                                    <span className="font-semibold">TAB SWITCHING LIMIT:</span> Maximum {settings.maxTabSwitches} tab switches allowed per challenge
                                </p>
                                <p className="text-yellow-300">
                                    <span className="font-semibold">TOTAL TAB SWITCHES:</span> {teamData.totalTabSwitches || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Dashboard Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    {/* Dashboard Side Column for Key Stats */}
                    <div className="lg:col-span-1">
                        {user && eventStatus === 'active' && teamData && (
                            <div className="bg-gray-900 border border-yellow-700/30 rounded-xl p-5 shadow-xl mb-6">
                                <h3 className="text-lg font-bold text-yellow-300 mb-4 flex items-center border-b border-yellow-700/30 pb-3 font-mono">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                    </svg>
                                    INTEL REPORT
                                </h3>

                                <div className="space-y-4">
                                    {/* Agent Status */}
                                    <div className="bg-black rounded-lg p-3 border border-yellow-700/30">
                                        <div className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Agent Status</div>
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
                                            <span className="text-yellow-300 font-medium">Active</span>
                                        </div>
                                    </div>

                                    {/* Team Performance */}
                                    <div className="bg-black rounded-lg p-3 border border-yellow-700/30">
                                        <div className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Performance</div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-yellow-300 font-medium">{calculateTeamProgress().percent}% Complete</span>
                                            <span className="text-xs font-mono text-yellow-400">{calculateTeamProgress().solved}/{calculateTeamProgress().total}</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                                            <div
                                                className="bg-yellow-500 h-2 rounded-full"
                                                style={{ width: `${calculateTeamProgress().percent}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="bg-black rounded-lg p-3 border border-yellow-700/30">
                                        <div className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Score</div>
                                        <div className="flex items-center">
                                            <span className="text-2xl font-bold text-yellow-400 font-mono">{teamData.score || 0}</span>
                                            <span className="ml-2 text-xs text-yellow-500">points</span>
                                        </div>
                                    </div>

                                    {/* Challenges Completed */}
                                    <div className="bg-black rounded-lg p-3 border border-yellow-700/30">
                                        <div className="text-xs text-yellow-500 uppercase tracking-wider mb-1">Challenges Completed</div>
                                        <div className="flex items-center">
                                            <span className="text-2xl font-bold text-yellow-400 font-mono">{calculateTeamProgress().solved}</span>
                                            <span className="ml-2 text-xs text-yellow-500">of {calculateTeamProgress().total}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Link for Challenges */}
                                <Link to="/challenges" className="mt-4 flex items-center justify-center w-full py-3 bg-yellow-900/60 hover:bg-yellow-800/80 text-yellow-200 rounded-lg border border-yellow-700/50 transition-all shadow-md">
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    View Active Missions
                                </Link>
                            </div>
                        )}

                        {/* Info Cards - Redesigned for yellow/black theme */}
                        <div className="space-y-4">
                            <div className="bg-black p-5 rounded-xl border border-yellow-700/30 shadow-xl hover:shadow-yellow-900/10 transition-all duration-300">
                                <div className="bg-yellow-900/50 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-yellow-200 mb-3">About CID CTF</h3>
                                <p className="text-sm text-yellow-100/70 leading-relaxed font-mono">
                                    The CID Capture The Flag competition is designed to test your cybersecurity skills in a challenging environment. Compete with other teams to solve security challenges.
                                </p>
                            </div>

                            <div className="bg-black p-5 rounded-xl border border-yellow-700/30 shadow-xl hover:shadow-yellow-900/10 transition-all duration-300">
                                <div className="bg-yellow-900/50 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-yellow-200 mb-3">Rules of Engagement</h3>
                                <ul className="text-sm text-yellow-100/70 list-disc pl-5 space-y-2 font-mono">
                                    <li>No attacking the infrastructure</li>
                                    <li>No sharing of flags or solutions</li>
                                    <li>Be respectful to other participants</li>
                                    <li>Any form of cheating = disqualification</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area - 2/3 width */}
                    <div className="lg:col-span-2">
                        {/* Welcome Panel */}
                        <div className="bg-gray-900 border border-yellow-700/30 rounded-xl p-6 shadow-xl mb-6 backdrop-blur-sm">
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-300 mb-4 font-mono tracking-tight">
                                {user ? 'WELCOME BACK, AGENT' : 'CID CYBERSECURITY DIVISION'}
                            </h2>

                            {!user ? (
                                <div className="py-6">
                                    <div className="flex items-center mb-6">
                                        <span className="h-3 w-3 bg-yellow-500 animate-pulse rounded-full mr-2"></span>
                                        <p className="text-yellow-300 text-lg font-mono">
                                            Authenticate to access classified CTF missions and test your security skills.
                                        </p>
                                    </div>

                                    <div className="flex space-x-4">
                                        <Link
                                            to="/login"
                                            className="px-5 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg shadow-lg hover:shadow-yellow-900/50 transition-all duration-300 flex items-center border border-yellow-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" />
                                            </svg>
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-yellow-200 font-medium rounded-lg shadow-lg hover:shadow-gray-900/30 transition-all duration-300 flex items-center border border-yellow-700/30"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                            </svg>
                                            Register
                                        </Link>
                                    </div>
                                </div>
                            ) : eventStatus === 'active' ? (
                                <div>
                                    <div className="flex items-center mb-6">
                                        <span className="h-3 w-3 bg-yellow-500 animate-pulse rounded-full mr-2"></span>
                                        <p className="text-yellow-300 font-mono">
                                            SECURE CONNECTION ESTABLISHED | SYSTEM ACCESS GRANTED
                                        </p>
                                    </div>

                                    {/* Challenge Link Card */}
                                    <div className="mb-6">
                                        <Link to="/challenges" className="block p-5 bg-gradient-to-r from-yellow-900/50 to-yellow-800/40 rounded-xl border border-yellow-700/30 hover:border-yellow-600/50 transition-all duration-300 hover:shadow-lg group">
                                            <div className="flex items-center">
                                                <div className="p-3 bg-yellow-800/50 rounded-lg mr-4 group-hover:bg-yellow-700/70 transition-all">
                                                    <svg className="h-7 w-7 text-yellow-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-semibold text-yellow-300 mb-1 group-hover:text-yellow-200 transition-colors font-mono">
                                                        ACCESS CHALLENGES
                                                    </h3>
                                                    <p className="text-sm text-yellow-400/70 font-mono">
                                                        Decrypt, exploit, and solve missions to earn points and climb the ranks
                                                    </p>
                                                </div>
                                                <div className="text-yellow-400 group-hover:translate-x-2 transition-transform duration-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>

                                    {/* All challenges completed message */}
                                    {allChallengesCompleted && (
                                        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-8 font-mono">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-yellow-300">
                                                        <span className="font-semibold">MISSION COMPLETE:</span> All challenges successfully neutralized.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Leaderboard Section */}
                                    <div className="mt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-yellow-300 flex items-center font-mono">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                                </svg>
                                                FIELD OPERATIONS - TOP AGENTS
                                            </h3>
                                            <button
                                                onClick={fetchLeaderboard}
                                                className="flex items-center px-3 py-1.5 bg-yellow-900/50 text-yellow-300 hover:bg-yellow-800/50 rounded-md transition-all text-sm font-medium border border-yellow-700/50"
                                                disabled={leaderboardLoading}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1.5 ${leaderboardLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                </svg>
                                                {leaderboardLoading ? 'SYNCING...' : 'SYNC'}
                                            </button>
                                        </div>

                                        {leaderboardLoading ? (
                                            <div className="flex justify-center py-6 bg-black border border-yellow-700/30 rounded-lg">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto bg-black rounded-lg border border-yellow-700/30 shadow-lg">
                                                <table className="min-w-full divide-y divide-yellow-700/30 font-mono">
                                                    <thead className="bg-yellow-900/30">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                                                Rank
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                                                Team
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                                                Status
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                                                Score
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-yellow-700/20">
                                                        {allTeams.length > 0 ? allTeams.slice(0, 8).map((team, index) => {
                                                            // Special styling for current team
                                                            const isCurrentTeam = teamData && team.id === teamData.id;

                                                            // Different styling for top teams
                                                            let rowClass = "transition-colors";
                                                            if (isCurrentTeam) rowClass += " bg-yellow-900/30";
                                                            else if (index === 0) rowClass += " bg-yellow-800/20"; // 1st
                                                            else if (index === 1) rowClass += " bg-yellow-900/10";   // 2nd
                                                            else if (index === 2) rowClass += " bg-yellow-900/5"; // 3rd

                                                            return (
                                                                <tr key={team.id} className={rowClass}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-300">
                                                                        {index + 1}
                                                                        {index < 3 && (
                                                                            <span className="ml-1">
                                                                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isCurrentTeam ? "font-bold text-yellow-300" : "text-yellow-200"}`}>
                                                                        {team.name}
                                                                        {isCurrentTeam && (
                                                                            <span className="ml-2 text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded border border-yellow-700/50">YOU</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-200/70">
                                                                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                                                                            <div
                                                                                className={`${isCurrentTeam ? "bg-yellow-500" : "bg-yellow-700/50"} h-1.5 rounded-full`}
                                                                                style={{ width: `${challenges.length > 0 ? ((team.solvedChallenges?.length || 0) / challenges.length) * 100 : 0}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-yellow-500 mt-1 block">
                                                                            {team.solvedChallenges?.length || 0} / {challenges.length}
                                                                        </span>
                                                                    </td>
                                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${isCurrentTeam ? "font-bold text-yellow-300" : "font-medium text-yellow-200"}`}>
                                                                        {team.score || 0}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }) : (
                                                            <tr>
                                                                <td colSpan="4" className="px-6 py-4 text-sm text-center text-yellow-500">
                                                                    No teams have registered yet
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6">
                                    {eventStatus === 'not-started' ? (
                                        <div className="flex flex-col items-center text-center p-6 bg-black rounded-xl border border-yellow-700/30">
                                            <div className="w-20 h-20 bg-yellow-900/40 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-yellow-200 text-lg mb-2 font-medium font-mono">
                                                STANDBY FOR MISSION BRIEFING
                                            </p>
                                            <p className="text-yellow-500 font-mono">
                                                Prepare for deployment. Review protocols and await further instructions.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-center p-6 bg-black rounded-xl border border-yellow-700/30">
                                            <div className="w-20 h-20 bg-yellow-900/40 rounded-full flex items-center justify-center mb-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-yellow-200 text-lg mb-2 font-medium font-mono">
                                                OPERATION COMPLETE
                                            </p>
                                            <p className="text-yellow-500 font-mono">
                                                Mission files have been sealed. Thank you for your service.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Additional Information Card */}
                        <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 p-5 rounded-xl border border-yellow-700/30 shadow-xl">
                            <div className="bg-yellow-900/50 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-yellow-200 mb-3 font-mono">CONTACT COMMAND</h3>
                            <p className="text-sm text-yellow-100/70 leading-relaxed font-mono">
                                For mission assistance, encrypted channel available at: <a href="mailto:opensourcechandigarh@chitkara.edu.in" className="text-yellow-300 hover:text-yellow-200 font-medium underline">opensourcechandigarh@chitkara.edu.in</a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Yellow/Black themed footer */}
            <footer className="bg-black border-t border-yellow-700/30 mt-12 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center md:flex-row md:justify-between">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="h-1 w-1 bg-yellow-500 rounded-full mr-1 animate-ping"></div>
                            <div className="h-1 w-1 bg-yellow-500 rounded-full mr-2"></div>
                            <span className="font-mono text-yellow-400 text-sm">CID CTF::PLATFORM</span>
                        </div>
                        <p className="text-sm text-yellow-700 font-mono">
                            &copy; Open Source Chandigarh. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
export default Home;
