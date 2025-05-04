import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDoc, getDocs, collection, doc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

function FinalistWaiting() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState(null);
    const [settings, setSettings] = useState(null);

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

    // Fetch team data
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

                // Verify the team is actually a finalist
                if (!team.isFinalist) {
                    console.log("Team is not a finalist, redirecting to home");
                    navigate('/home');
                    return;
                }

                // Get settings for event details
                const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
                if (settingsDoc.exists()) {
                    const settingsData = settingsDoc.data();
                    setSettings(settingsData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                navigate('/home');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">VERIFYING STATUS</h2>
                    <p className="text-yellow-200/80">Loading your team information...</p>
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

                {/* Success ribbons */}
                <div className="cid-ribbon ribbon-1">
                    <span className="cid-text">
                        🏆 PHASE 2 FINALIST — AWAITING NEXT PHASE — STAND BY FOR INSTRUCTIONS 🏆
                    </span>
                </div>
                <div className="cid-ribbon ribbon-2">
                    <span className="cid-text">
                        🏆 PHASE 2 FINALIST — AWAITING NEXT PHASE — STAND BY FOR INSTRUCTIONS 🏆
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
                    <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">PHASE 2 QUALIFIER</h1>
                    <Link
                        to="/home"
                        className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        Return to HQ
                    </Link>
                </div>

                <div className="border-2 border-green-400 rounded-lg overflow-hidden bg-zinc-900/90 relative p-8">
                    <div className="absolute top-2 left-2 flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        <span className="text-xs font-bold bg-black/80 px-1 py-0.5 rounded text-green-400">QUALIFIED TEAM</span>
                    </div>

                    <div className="w-20 h-20 mx-auto mb-6 bg-green-400/20 rounded-full flex items-center justify-center">
                        <svg className="h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-green-400 mb-4 tracking-wider">CONGRATULATIONS, FINALIST!</h2>
                        <div className="text-lg text-gray-200 mb-4">
                            {teamData?.name || "Team"}, you've successfully qualified for Phase 2.
                        </div>
                        
                        <div className="inline-block px-4 py-2 bg-green-400/20 rounded-lg text-green-300 mb-6">
                            <div className="font-bold text-white mb-1">TOKEN #{teamData?.tokenUsed}</div>
                            <div className="text-sm">Verified on {teamData?.finalistVerifiedAt?.toDate().toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="bg-black/30 p-6 rounded-lg border border-yellow-400/30 mb-6">
                        <h3 className="text-xl font-semibold text-yellow-400 mb-4 text-center">NEXT STEPS</h3>
                        
                        <div className="text-lg text-white leading-relaxed py-4 px-2 font-serif">
                            <p className="mb-4">
                                Your team has successfully qualified for Phase 2 of the CID CTF Challenge. 
                                You've demonstrated exceptional skills in the preliminary round and earned 
                                your place among the elite finalists.
                            </p>
                            
                            <p className="mb-4">
                                <strong className="text-yellow-300">Stand by for further instructions.</strong> The 
                                next phase details will be communicated shortly through your registered email.
                            </p>
                            
                            <p>
                                {settings?.nextRoundInfo || "Please check your email for important information about the upcoming phase. The venue, time, and additional requirements will be shared with all qualified teams."}
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/50 p-6 rounded-lg border border-green-400/30">
                        <h3 className="text-xl font-semibold text-green-400 mb-4 text-center">FINALIST DETAILS</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-black/50 rounded-lg">
                                <p className="text-sm text-yellow-300 font-semibold mb-1">TEAM NAME</p>
                                <p className="text-lg text-white">{teamData?.name || "Unknown Team"}</p>
                            </div>
                            
                            <div className="p-4 bg-black/50 rounded-lg">
                                <p className="text-sm text-yellow-300 font-semibold mb-1">TEAM LEAD</p>
                                <p className="text-lg text-white">{teamData?.teamLead || "Unknown"}</p>
                            </div>
                            
                            <div className="p-4 bg-black/50 rounded-lg">
                                <p className="text-sm text-yellow-300 font-semibold mb-1">CONTACT EMAIL</p>
                                <p className="text-lg text-white">{teamData?.email || "No email provided"}</p>
                            </div>
                            
                            <div className="p-4 bg-black/50 rounded-lg">
                                <p className="text-sm text-yellow-300 font-semibold mb-1">PHASE 1 SCORE</p>
                                <p className="text-lg text-white">{teamData?.score || 0} points</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center">
                            <p className="text-sm text-yellow-200">
                                Please have your team ready for Phase 2. Additional information may be required.
                            </p>
                            
                            {settings?.venue && (
                                <p className="mt-2 text-green-300">
                                    <strong>Venue:</strong> {settings.venue}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="border-t border-yellow-400/30 mt-6 pt-3 px-6 text-xs text-yellow-400/80 font-mono flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            <span>QUALIFIED</span>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-400">Your team is ready for Phase 2</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default FinalistWaiting;