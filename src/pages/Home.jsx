import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
    const [user, setUser] = useState(null);
    const [eventStatus, setEventStatus] = useState('loading'); // loading, not-started, active, ended
    const [teamData, setTeamData] = useState(null);
    const [qualified, setQualified] = useState(null); // Use null instead of false initially
    const [qualificationChecked, setQualificationChecked] = useState(false);

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [challenges, setChallenges] = useState([]);

    const [isRegistered, setIsRegistered] = useState(false);

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
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                checkRegistration(currentUser.email);
            } else {
                setUser(null);
                setLoading(false);
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // Load event settings and team data
    useEffect(() => {
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
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        };

        if (user) {
            fetchSettings();
            fetchTeamData(user.email);
        } else {
            fetchSettings(); // Still fetch settings for event status even if no user
        }
    }, [user]);

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
            }
        } catch (error) {
            console.error("Error fetching team data:", error);
        }
    };

    // Fetch available challenges (only when event is active)
    const fetchChallenges = async () => {
        try {
            const challengesRef = collection(db, "challenges");
            const challengesSnapshot = await getDocs(challengesRef);

            const challengesList = challengesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(challenge => challenge.active); // Only get active challenges

            setChallenges(challengesList);
        } catch (error) {
            console.error("Error fetching challenges:", error);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isRegistered) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600">You have not registered for the event.</p>
                    <button
                        onClick={handleSignOut}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">CID CTF Platform</h1>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center">
                                {teamData && (
                                    <div className="flex items-center bg-gray-100 px-3 py-1 rounded-lg mr-4">
                                        <svg className="w-4 h-4 text-gray-600 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="text-sm font-medium text-gray-700">{teamData.name}</span>
                                        {teamData.score > 0 && (
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                                                {teamData.score} pts
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="text-sm text-gray-600 mr-3">
                                    {user.email}
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex space-x-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Event Status Banners */}
                {eventStatus === 'not-started' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
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
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-700">
                                    The CTF competition is active! Good luck and happy hacking.
                                    {settings?.eventEndTime && (
                                        <span className="font-medium"> Competition ends on {settings.eventEndTime.toDate().toLocaleDateString()} at {settings.eventEndTime.toDate().toLocaleTimeString()}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {eventStatus === 'ended' && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    The CTF competition has ended. Thank you for participating!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results after event ended */}
                {eventStatus === 'ended' && user && teamData && qualificationChecked && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Competition Results</h2>

                        {qualified ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-green-800 mb-2">
                                    Congratulations, {teamData.name}!
                                </h3>
                                <p className="text-green-700 mb-4">
                                    Your team has qualified for the next round with a score of {teamData.score || 0}.
                                </p>
                                <div className="border-t border-green-200 pt-4 mt-4">
                                    <h4 className="font-medium text-green-800 mb-2">Next Round Information:</h4>
                                    <p className="text-green-700">{settings?.nextRoundInfo}</p>
                                    {settings?.venue && (
                                        <p className="text-green-700 mt-2">
                                            <strong>Venue:</strong> {settings.venue}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Thank you for participating
                                </h3>
                                <p className="text-gray-700 mb-4">
                                    {settings?.eliminationMessage || "Unfortunately, your team did not qualify for the next round."}
                                </p>
                                <p className="text-gray-600">
                                    Your final score: {teamData.score || 0}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Show loading state while checking qualification */}
                {eventStatus === 'ended' && user && teamData && !qualificationChecked && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Competition Results</h2>
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                            <span className="text-gray-600">Checking qualification status...</span>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to the CID CTF Platform</h2>

                    {!user ? (
                        <div className="py-4">
                            <p className="text-gray-600 mb-6">
                                Sign in to your account to participate in our Capture The Flag competition.
                            </p>

                            <div className="flex space-x-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Register
                                </Link>
                            </div>
                        </div>
                    ) : eventStatus === 'active' ? (
                        <div>
                            <p className="text-gray-600 mb-6">
                                Welcome back! You're signed in and ready to solve challenges.
                            </p>

                            {/* Quick navigation cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <Link to="/challenges" className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                                    <div className="p-3 bg-blue-500 rounded-md mr-4">
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Challenges</h3>
                                        <p className="text-sm text-gray-600">Browse and solve challenges</p>
                                    </div>
                                </Link>

                                <Link to="/scoreboard" className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">
                                    <div className="p-3 bg-purple-500 rounded-md mr-4">
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Scoreboard</h3>
                                        <p className="text-sm text-gray-600">View current standings</p>
                                    </div>
                                </Link>

                                <Link to="/team" className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
                                    <div className="p-3 bg-green-500 rounded-md mr-4">
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Team Profile</h3>
                                        <p className="text-sm text-gray-600">View your team details</p>
                                    </div>
                                </Link>
                            </div>

                            {/* Challenge preview */}
                            {challenges.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Available Challenges</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {challenges.slice(0, 3).map(challenge => (
                                            <div key={challenge.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-medium text-gray-900">{challenge.title}</h4>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                        {challenge.points} pts
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{challenge.description}</p>
                                                <div className="mt-3 flex justify-between items-center">
                                                    <span className="text-xs text-gray-500">
                                                        {challenge.category}
                                                    </span>
                                                    <Link to={`/challenges/${challenge.id}`} className="text-xs text-indigo-600 hover:text-indigo-800">
                                                        View Challenge →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {challenges.length > 3 && (
                                        <div className="mt-4 text-center">
                                            <Link to="/challenges" className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-900">
                                                View all {challenges.length} challenges
                                                <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-4">
                            {eventStatus === 'not-started' ? (
                                <p className="text-gray-600">
                                    Welcome! The competition will begin soon. Get ready by exploring the platform and familiarizing yourself with the rules.
                                </p>
                            ) : (
                                <p className="text-gray-600">
                                    Thank you for participating in our CTF competition. Visit the scoreboard to see the final results.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Platform information */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">About CID CTF</h3>
                        <p className="text-sm text-gray-600">
                            The CID Capture The Flag competition is designed to test your cybersecurity skills in a fun and challenging environment.
                        </p>
                    </div>

                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Competition Rules</h3>
                        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                            <li>No attacking the infrastructure</li>
                            <li>No sharing of flags or solutions</li>
                            <li>Be respectful to other participants</li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 shadow rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Need Help?</h3>
                        <p className="text-sm text-gray-600">
                            If you have any questions or need assistance, please contact our support team at <a href="mailto:support@cidctf.example.com" className="text-indigo-600 hover:text-indigo-900">support@cidctf.example.com</a>.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} CID CTF Platform. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Home;