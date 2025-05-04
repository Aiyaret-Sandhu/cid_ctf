import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDoc, getDocs, collection, doc, query, where, updateDoc, addDoc} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

function Matchers() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [message, setMessage] = useState("");
    const [groupIndex, setGroupIndex] = useState(null);
    const [totalTeams, setTotalTeams] = useState(0);
    const [completionRank, setCompletionRank] = useState(null);

    // Add states for round 1 checking
    const [flagInput, setFlagInput] = useState('');
    const [flagVerified, setFlagVerified] = useState(false);
    const [flagError, setFlagError] = useState('');
    const [flagChecking, setFlagChecking] = useState(false);

    const navigate = useNavigate();

    // Check authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Fetch team data and completion status
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // Get team data first
                const teamsRef = collection(db, "teams");
                const teamQuery = query(teamsRef, where("email", "==", user.email));
                const teamSnapshot = await getDocs(teamQuery);

                if (teamSnapshot.empty) {
                    console.log("No team found for this user");
                    navigate('/home');
                    return;
                }

                const teamDoc = teamSnapshot.docs[0];
                const team = { id: teamDoc.id, ...teamDoc.data() };
                setTeamData(team);

                // If team hasn't completed all challenges, redirect to home
                const challengesRef = collection(db, "challenges");
                const activeChallengesQuery = query(challengesRef, where("active", "==", true));
                const challengesSnapshot = await getDocs(activeChallengesQuery);

                const allChallengeIds = challengesSnapshot.docs.map(doc => doc.id);
                const teamSolvedChallenges = team.solvedChallenges || [];

                // Check if team has solved all challenges
                const hasCompletedAll = allChallengeIds.every(id => teamSolvedChallenges.includes(id));

                if (!hasCompletedAll) {
                    console.log("Team has not completed all challenges");
                    navigate('/home');
                    return;
                }

                // Get settings for grouping configuration
                const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
                if (settingsDoc.exists()) {
                    const settingsData = settingsDoc.data();
                    setSettings(settingsData);

                    // Get all teams sorted by completion time
                    const allTeamsSnapshot = await getDocs(teamsRef);
                    const teamsList = allTeamsSnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(t => t.completedAt && t.solvedChallenges && t.solvedChallenges.length >= allChallengeIds.length)
                        .sort((a, b) => {
                            // Sort by completion time (earliest first)
                            if (a.completedAt && b.completedAt) {
                                return a.completedAt.toMillis() - b.completedAt.toMillis();
                            }
                            return 0;
                        });

                    setTotalTeams(teamsList.length);

                    // Find this team's position in the completion order
                    const teamIndex = teamsList.findIndex(t => t.id === team.id);
                    setCompletionRank(teamIndex + 1); // 1-based index

                    // Calculate which group this team belongs to
                    const groupCount = parseInt(settingsData.groupCount || 4);

                    // Calculate group index (0-based) with cycling in sequential order
                    // Teams 1,2,3,4 go to groups 1,2,3,4, then teams 5,6,7,8 go to groups 1,2,3,4 again, etc.
                    const calculatedGroupIndex = teamIndex % groupCount;
                    setGroupIndex(calculatedGroupIndex);

                    // Get the appropriate message for this group
                    const messageKey = `groupMessage${calculatedGroupIndex + 1}`;
                    const groupMessage = settingsData[messageKey] ||
                        `Congratulations! You are Team #${teamIndex + 1} to complete all challenges. Default message for Group ${calculatedGroupIndex + 1}.`;

                    setMessage(groupMessage);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    // Function to verify input flag
    // Update the handleFlagSubmit function to track token usage and register the team as a finalist

    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        setFlagChecking(true);
        setFlagError('');

        try {
            if (!flagInput.trim()) {
                setFlagError("Please enter a numeric flag");
                setFlagChecking(false);
                return;
            }

            // Check if the flag is a valid number
            if (isNaN(flagInput.trim())) {
                setFlagError("Flag must be a valid number");
                setFlagChecking(false);
                return;
            }

            // Query round1_checks collection to find a match
            const checksRef = collection(db, "round1_checks");
            const checksSnapshot = await getDocs(checksRef);

            let flagFound = false;
            let matchingDocRef = null;
            let matchingDocData = null;

            for (const docSnapshot of checksSnapshot.docs) {
                const checkData = docSnapshot.data();
                if (checkData.originalNumber === flagInput.trim()) {
                    // We found a matching flag
                    flagFound = true;
                    matchingDocRef = docSnapshot.ref;
                    matchingDocData = checkData;
                    break;
                }
            }

            if (flagFound) {
                // Check if the token has already been used
                if (matchingDocData.used) {
                    setFlagError("This token has already been used by another team.");
                    setFlagChecking(false);
                    return;
                }

                // Mark the token as used
                await updateDoc(matchingDocRef, {
                    used: true,
                    usedBy: teamData.id,
                    usedByName: teamData.name,
                    usedAt: new Date()
                });

                // Register the team as a finalist
                const finalistsRef = collection(db, "finalists");
                await addDoc(finalistsRef, {
                    teamId: teamData.id,
                    teamName: teamData.name,
                    teamEmail: teamData.email,
                    teamLead: teamData.teamLead,
                    score: teamData.score || 0,
                    completionRank: completionRank,
                    tokenNumber: flagInput.trim(),
                    verifiedAt: new Date()
                });

                // Also update the team's record to mark them as a finalist
                const teamRef = doc(db, "teams", teamData.id);
                await updateDoc(teamRef, {
                    isFinalist: true,
                    finalistVerifiedAt: new Date(),
                    tokenUsed: flagInput.trim()
                });

                // Update UI status
                setFlagVerified(true);
                setFlagError('');
            } else {
                setFlagError("Invalid flag. Please try again.");
            }
        } catch (error) {
            console.error("Error verifying flag:", error);
            setFlagError("An error occurred while verifying the flag. Please try again.");
        } finally {
            setFlagChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">ANALYZING RESULTS</h2>
                    <p className="text-yellow-200/80">Processing your challenge completion data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono">
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
                    <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
                    <div className="absolute top-1/4 right-1/4 w-[400px] h-[300px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <Link to="/home" className="text-2xl font-bold text-yellow-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        CID CTF Platform
                    </Link>

                    {teamData && (
                        <div className="flex items-center text-white bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-yellow-400/30">
                            <span className="mr-2 font-medium text-yellow-400">Final Score:</span>
                            <span className="px-3 py-0.5 bg-yellow-400 text-black text-sm font-bold rounded-full">
                                {teamData.score || 0}
                            </span>
                        </div>
                    )}
                </div>

                {/* Animated police tape ribbons */}
                <div className="cid-ribbon ribbon-1">
                    <span className="cid-text">
                        🚧 CRIME SOLVED — INVESTIGATION COMPLETE — CID TEAM SUCCESSFUL 🚨
                    </span>
                </div>
                <div className="cid-ribbon ribbon-2">
                    <span className="cid-text">
                        🚧 CRIME SOLVED — INVESTIGATION COMPLETE — CID TEAM SUCCESSFUL 🚨
                    </span>
                </div>

                <style jsx="true">{`
                .cid-ribbon {
                    position: absolute;
                    width: 300%;
                    font-weight: bold;
                    font-size: 20px;
                    color: #fff;
                    background: repeating-linear-gradient(
                        45deg,
                        yellow,
                        yellow 10px,
                        black 10px,
                        black 20px
                    );
                    white-space: nowrap;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    opacity: 0.9;
                    z-index: 0;
                    padding: 10px 0;
                }
    
                .cid-text {
                    display: inline-block;
                    animation: marquee 30s linear infinite;
                    padding-left: 100%;
                }
    
                .ribbon-1 {
                    top: 40%;
                    left: -100%;
                    transform: rotate(-25deg);
                    animation: scroll-left 30s linear infinite;
                }
    
                .ribbon-2 {
                    bottom: 35%;
                    right: -100%;
                    transform: rotate(25deg);
                    animation: scroll-right 30s linear infinite;
                }
    
                @keyframes marquee {
                    0% {
                        transform: translateX(0%);
                    }
                    100% {
                        transform: translateX(-100%);
                    }
                }
    
                @keyframes scroll-left {
                    0% {
                        left: -100%;
                    }
                    100% {
                        left: 100%;
                    }
                }
    
                @keyframes scroll-right {
                    0% {
                        right: -100%;
                    }
                    100% {
                        right: 100%;
                    }
                }
                `}</style>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">MISSION ACCOMPLISHED</h1>
                    <Link
                        to="/home"
                        className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        Return to HQ
                    </Link>
                </div>

                <div className="border-2 border-yellow-400 rounded-lg overflow-hidden bg-zinc-900/90 relative p-8">
                    <div className="absolute top-2 left-2 flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                        <span className="text-xs font-bold bg-black/80 px-1 py-0.5 rounded text-yellow-400">CLASSIFIED MESSAGE</span>
                    </div>

                    <div className="w-20 h-20 mx-auto mb-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <svg className="h-12 w-12 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 tracking-wider">MISSION ACCOMPLISHED</h2>
                        <div className="text-lg text-gray-200 mb-2">
                            {teamData?.name || "Team"}, you've completed all challenges of Phase 1 successfully!
                        </div>
                        <div className="text-md text-yellow-200 mb-4">
                            Final score: <span className="font-bold">{teamData?.score || 0}</span> points
                        </div>

                        {completionRank && (
                            <div className="inline-block px-4 py-2 bg-yellow-400/20 rounded-lg text-yellow-300 mb-6">
                                Completion rank: <span className="font-bold text-white">#{completionRank}</span> of {totalTeams} teams
                            </div>
                        )}
                    </div>

                    <div className="bg-black/30 p-6 rounded-lg border border-yellow-400/30 mb-6">
                        <h3 className="text-xl font-semibold text-yellow-400 mb-4 text-center">YOUR SECRET MESSAGE</h3>

                        {groupIndex !== null && (
                            <div className="text-sm uppercase tracking-wider text-yellow-200 mb-2 text-center">
                                Group {groupIndex + 1} Message
                            </div>
                        )}

                        <div className="text-lg text-white leading-relaxed whitespace-pre-line py-4 px-2 font-serif">
                            {message}
                        </div>
                    </div>

                    {/* Round 1 Verification System */}
                    <div className="mt-8 bg-black/50 p-6 rounded-lg border border-red-400/30 mb-6">
                        <h3 className="text-xl font-semibold text-red-400 mb-4 text-center">PHASE 2 VERIFICATION</h3>

                        {flagVerified ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-4">
                                    <svg className="h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-green-300 font-medium mb-2">Flag Verified Successfully!</p>
                                <p className="text-white mb-4">Your team has been registered as a finalist for Phase 2.</p>
                                <div className="p-3 bg-green-900/30 border border-green-500/30 rounded text-sm">
                                    <p className="text-green-300">
                                        <span className="font-bold">IMPORTANT:</span> Please make sure to save your team details, as they will be needed for the final round.
                                    </p>
                                    <p className="text-green-200 mt-2">
                                        Token #{flagInput} has been assigned to your team.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleFlagSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Enter Numerical Flag for Phase 2 Verification
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={flagInput}
                                            onChange={(e) => setFlagInput(e.target.value)}
                                            className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full bg-black/70 border border-red-400/30 text-white rounded-md py-3 px-3"
                                            placeholder="Enter Phase 2 numerical flag"
                                            disabled={flagChecking || flagVerified}
                                        />
                                        <button
                                            type="submit"
                                            className={`ml-3 inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm ${flagChecking ? "bg-gray-600 text-gray-300" : "bg-red-600 hover:bg-red-700 text-white"
                                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                                            disabled={flagChecking || flagVerified}
                                        >
                                            {flagChecking ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    VERIFYING...
                                                </>
                                            ) : "VERIFY FLAG"}
                                        </button>
                                    </div>
                                    {flagError && (
                                        <p className="mt-2 text-sm text-red-400">{flagError}</p>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="border-t border-yellow-400/30 mt-6 pt-3 px-6 text-xs text-yellow-400/80 font-mono flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                            <span>TOP SECRET</span>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-400">DECLASSIFIED: {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Matchers;