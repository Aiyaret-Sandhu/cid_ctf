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
            console.log("Challenges loaded:", challengesList.length);
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
    
            console.log("Teams loaded for leaderboard:", sortedTeams.length);
            console.log(sortedTeams);
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

    if (loading || registrationChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (isRegistered === false) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="bg-white shadow-lg rounded-lg p-8 max-w-md mx-auto">
                        <svg className="h-16 w-16 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-4">Registration Required</h2>
                        <p className="text-gray-600 mb-6">You need to register your team before participating in the CTF.</p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleSignOut}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Enhanced header with gradient */}
            <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="flex items-center text-white">
                            <svg className="h-8 w-8 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-xl font-bold">CID CTF Platform</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            {user ? (
                                <div className="flex items-center">
                                    {teamData && (
                                        <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg mr-4 border border-white/30 shadow-sm">
                                            <svg className="w-4 h-4 text-white mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm font-medium text-white">{teamData.name}</span>
                                            {teamData.score > 0 && (
                                                <span className="ml-2 px-2 py-0.5 bg-white text-indigo-800 text-xs font-medium rounded-full shadow-sm">
                                                    {teamData.score} pts
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-sm text-white mr-3 hidden sm:block">
                                        {user.email}
                                    </div>

                                    <button
                                        onClick={handleSignOut}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all shadow-sm hover:shadow"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex space-x-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all shadow-sm"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center px-3 py-1.5 border border-white/30 text-sm leading-4 font-medium rounded-md text-white bg-indigo-700/40 hover:bg-indigo-700/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm backdrop-blur-sm"
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
                {/* Enhanced Event Status Banners */}
                {eventStatus === 'not-started' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg shadow-sm transform transition-all animate-fadeIn">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    The CTF competition has not started yet. Please check back on {settings?.eventStartTime?.toDate().toLocaleDateString()} at {settings?.eventStartTime?.toDate().toLocaleTimeString()}.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {eventStatus === 'active' && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-lg shadow-sm transform transition-all animate-fadeIn">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-700">
                                    <span className="font-semibold">Active competition!</span> Good luck and happy hacking.
                                    {settings?.eventEndTime && (
                                        <span className="font-medium"> Ends on {settings.eventEndTime.toDate().toLocaleDateString()} at {settings.eventEndTime.toDate().toLocaleTimeString()}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {eventStatus === 'ended' && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-lg shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    <span className="font-semibold">Competition ended.</span> Thank you for participating!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results after event ended - with enhanced styling */}
                {eventStatus === 'ended' && user && teamData && qualificationChecked && (
                    <div className="bg-white shadow-lg rounded-xl p-6 mb-8 border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Competition Results
                        </h2>

                        {qualified ? (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-inner">
                                <h3 className="text-xl font-semibold text-green-800 mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Congratulations, {teamData.name}!
                                </h3>
                                <p className="text-green-700 mb-4 pl-8">
                                    Your team has qualified for the next round with a score of <span className="font-bold">{teamData.score || 0}</span>.
                                </p>
                                <div className="border-t border-green-200 pt-4 mt-4">
                                    <h4 className="font-medium text-green-800 mb-2">Next Round Information:</h4>
                                    <p className="text-green-700">{settings?.nextRoundInfo}</p>
                                    {settings?.venue && (
                                        <p className="text-green-700 mt-2 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Venue: {settings.venue}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-inner">
                                <h3 className="text-xl font-medium text-gray-800 mb-3">Thank you for participating</h3>
                                <p className="text-gray-600 mb-4">
                                    {settings?.eliminationMessage || "Unfortunately, your team did not qualify for the next round."}
                                </p>
                                <p className="text-gray-600 flex items-center pl-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Your final score: <span className="font-semibold">{teamData.score || 0}</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Main content with enhanced design */}
                <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100 mb-8">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-4">Welcome to the CID CTF Platform</h2>

                    {!user ? (
                        <div className="py-6">
                            <p className="text-gray-600 mb-6 text-lg">
                                Sign in to your account to participate in our Capture The Flag competition and test your cybersecurity skills.
                            </p>

                            <div className="flex space-x-4">
                                <Link
                                    to="/login"
                                    className="px-5 py-3 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" />
                                    </svg>
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg hover:shadow transition-all duration-300 flex items-center"
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
                            <p className="text-gray-600 mb-6 text-lg">
                                Welcome back! You're signed in and ready to solve challenges.
                            </p>

                            {/* Enhanced navigation cards */}
                            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                                <Link to="/challenges" className="flex items-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-md group">
                                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg mr-4 group-hover:shadow-lg transition-all duration-300">
                                        <svg className="h-7 w-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors">Challenges</h3>
                                        <p className="text-sm text-gray-600">Browse and solve challenges to earn points and compete with other teams</p>
                                    </div>
                                    <div className="text-indigo-500 group-hover:translate-x-2 transition-transform duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </div>
                                </Link>
                            </div>

                            {/* Team Progress Section */}
                            <div className="mb-10">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Your Team Progress
                                </h3>

                                {teamData && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-medium text-gray-700">
                                                {teamData.name} - {calculateTeamProgress().solved} of {calculateTeamProgress().total} challenges solved
                                            </span>
                                            <span className="font-semibold text-indigo-600">
                                                {calculateTeamProgress().percent}%
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                            <div
                                                className="bg-indigo-600 h-2.5 rounded-full"
                                                style={{ width: `${calculateTeamProgress().percent}%` }}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between text-sm">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-green-700">
                                                    {calculateTeamProgress().solved} solved
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                                </svg>
                                                <span className="text-indigo-700">
                                                    Score: {teamData.score || 0} pts
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* All challenges completed message */}
                            {allChallengesCompleted && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-green-700">
                                                <span className="font-semibold">Congratulations!</span> You've completed all available challenges.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Leaderboard Section */}
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                        </svg>
                                        Leaderboard
                                    </h3>
                                    <button
                                        onClick={() => {
                                            fetchLeaderboard();
                                        }}
                                        className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors text-sm font-medium"
                                        disabled={leaderboardLoading}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1.5 ${leaderboardLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                        {leaderboardLoading ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>

                                {leaderboardLoading ? (
                                    <div className="flex justify-center py-6 bg-white rounded-lg border border-gray-200">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Rank
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Team
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Challenges
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Score
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {allTeams.length > 0 ? allTeams.map((team, index) => {
                                                    // Special styling for current team
                                                    const isCurrentTeam = teamData && team.id === teamData.id;

                                                    // Styling for top 3 teams
                                                    let rowClass = "";
                                                    if (index === 0) rowClass = "bg-yellow-50"; // 1st place
                                                    else if (index === 1) rowClass = "bg-gray-50"; // 2nd place
                                                    else if (index === 2) rowClass = "bg-orange-50"; // 3rd place

                                                    // If it's current team, override with stronger highlight
                                                    if (isCurrentTeam) {
                                                        rowClass = "bg-blue-50";
                                                    }

                                                    return (
                                                        <tr key={team.id} className={rowClass}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                {index + 1}
                                                                {index < 3 && (
                                                                    <span className="ml-1">
                                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isCurrentTeam ? "font-bold text-blue-700" : "text-gray-900"}`}>
                                                                {team.name}
                                                                {isCurrentTeam && (
                                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">You</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                    <div
                                                                        className={`${isCurrentTeam ? "bg-blue-600" : "bg-indigo-600"} h-1.5 rounded-full`}
                                                                        style={{ width: `${challenges.length > 0 ? ((team.solvedChallenges?.length || 0) / challenges.length) * 100 : 0}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-xs text-gray-500 mt-1 block">
                                                                    {team.solvedChallenges?.length || 0} / {challenges.length}
                                                                </span>
                                                            </td>
                                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${isCurrentTeam ? "font-bold text-blue-700" : "font-medium text-gray-900"}`}>
                                                                {team.score || 0}
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-4 text-sm text-center text-gray-500">
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
                                <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-gray-700 text-lg mb-2 font-medium">
                                        Welcome! The competition will begin soon.
                                    </p>
                                    <p className="text-gray-600">
                                        Get ready by exploring the platform and familiarizing yourself with the rules.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-gray-700 text-lg mb-2 font-medium">
                                        Thank you for participating in our CTF competition.
                                    </p>
                                    <p className="text-gray-600">
                                        The event has ended. We hope you enjoyed the challenges!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Enhanced information cards with hover effects */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-white to-gray-50 p-6 shadow-md rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-indigo-100">
                        <div className="bg-indigo-100 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">About CID CTF</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            The CID Capture The Flag competition is designed to test your cybersecurity skills in a fun and challenging environment. Compete with other teams to solve a variety of security challenges.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-white to-gray-50 p-6 shadow-md rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-indigo-100">
                        <div className="bg-red-100 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Competition Rules</h3>
                        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-2">
                            <li>No attacking the infrastructure</li>
                            <li>No sharing of flags or solutions</li>
                            <li>Be respectful to other participants</li>
                            <li>Any form of cheating will result in disqualification</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-white to-gray-50 p-6 shadow-md rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-indigo-100">
                        <div className="bg-green-100 p-2 w-10 h-10 rounded-lg mb-4 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Support</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            If you have any questions or need assistance, please contact our support team at <a href="mailto:support@cidctf.example.com" className="text-indigo-600 hover:text-indigo-800 font-medium">support@cidctf.example.com</a>.
                        </p>
                    </div>
                </div>
            </main>

            {/* Enhanced footer with gradient and better spacing */}
            <footer className="bg-gradient-to-r from-gray-100 to-gray-50 border-t border-gray-200 mt-12 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center md:flex-row md:justify-between">
                        <div className="flex items-center mb-4 md:mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium text-indigo-600">CID CTF Platform</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            &copy; {new Date().getFullYear()} CID CTF Platform. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;