import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import bcrypt from 'bcryptjs';

function Challenges() {
    const [user, setUser] = useState(null);
    const [challenges, setChallenges] = useState([]);
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [flagSubmission, setFlagSubmission] = useState('');
    const [submitResult, setSubmitResult] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [allCompleted, setAllCompleted] = useState(false);
    const [eventStatus, setEventStatus] = useState(null);
    const { challengeId } = useParams();
    const navigate = useNavigate();

    // Check user auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Check if all challenges are completed and redirect to home if they are
    useEffect(() => {
        if (teamData?.solvedChallenges && challenges.length > 0) {
            const allSolved = challenges.every(challenge => 
                teamData.solvedChallenges.includes(challenge.id)
            );
            
            setAllCompleted(allSolved);
            
            // If all challenges are completed and we're viewing the last challenge,
            // redirect to home after a delay
            if (allSolved && !submitResult) {
                setSubmitResult({
                    success: true,
                    message: "Congratulations! You've completed all challenges. Redirecting to home page..."
                });
                
                setTimeout(() => {
                    navigate('/home');
                }, 5000); // 5 second delay before redirecting
            }
        }
    }, [teamData?.solvedChallenges, challenges, navigate, submitResult]);

    // Fetch team data to get solved challenges
    useEffect(() => {
        const fetchTeamData = async () => {
            if (!user) return;
            
            try {
                const teamsRef = collection(db, "teams");
                const teamQuery = query(teamsRef, where("email", "==", user.email));
                const teamSnapshot = await getDocs(teamQuery);

                if (!teamSnapshot.empty) {
                    const teamDoc = teamSnapshot.docs[0];
                    const team = { id: teamDoc.id, ...teamDoc.data() };
                    setTeamData(team);
                    
                    // Initialize solvedChallenges if it doesn't exist
                    if (!team.solvedChallenges) {
                        await updateDoc(doc(db, "teams", team.id), {
                            solvedChallenges: []
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching team data:", error);
            }
        };

        if (user) {
            fetchTeamData();
        }
    }, [user]);

    useEffect(() => {
        const checkEventStatus = async () => {
          try {
            const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
            if (settingsDoc.exists()) {
              const data = settingsDoc.data();
              setEventStatus(data.eventStatus);
              
              // If event has ended, redirect to home
              if (data.eventStatus === 'ended') {
                navigate('/home');
              }
            }
          } catch (error) {
            console.error("Error checking event status:", error);
          }
        };
        
        checkEventStatus();
      }, [navigate]);

    // Fetch available challenges
    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                setLoading(true);
                const challengesRef = collection(db, "challenges");
                const activeChallengesQuery = query(challengesRef, where("active", "==", true));
                const challengesSnapshot = await getDocs(activeChallengesQuery);
                
                // Sort challenges by createdAt timestamp
                let challengesList = challengesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Sort by createdAt timestamp if available
                challengesList.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return a.createdAt.seconds - b.createdAt.seconds;
                    }
                    // Fallback to points as a sorting mechanism if no timestamp
                    return a.points - b.points;
                });
                
                setChallenges(challengesList);
                
                // If team data is available, determine current challenge index
                if (teamData && teamData.solvedChallenges) {
                    const lastSolvedIndex = findLastSolvedChallengeIndex(teamData.solvedChallenges, challengesList);
                    setCurrentChallengeIndex(Math.min(lastSolvedIndex + 1, challengesList.length - 1));
                    
                    // Check if all challenges are solved
                    const allSolved = challengesList.length > 0 && 
                        challengesList.every(c => teamData.solvedChallenges.includes(c.id));
                    
                    if (allSolved) {
                        setAllCompleted(true);
                        setTimeout(() => {
                            navigate('/home');
                        }, 5000); // Redirect after 5 seconds if all challenges are solved
                        return;
                    }
                }
                
                // If there's a challengeId in the URL, verify it's the current accessible challenge
                if (challengeId) {
                    // Find the challenge in the sorted list
                    const challengeIndex = challengesList.findIndex(c => c.id === challengeId);
                    
                    // If challenge exists and is accessible (based on solved challenges)
                    if (challengeIndex !== -1 && isChallengeAccessible(challengeIndex, teamData?.solvedChallenges, challengesList)) {
                        setSelectedChallenge(challengesList[challengeIndex]);
                        setCurrentChallengeIndex(challengeIndex);
                    } else {
                        // Redirect to challenges page without ID to show current challenge
                        navigate('/challenges');
                    }
                } else if (challengesList.length > 0) {
                    // If no specific challenge is requested, set the current accessible challenge
                    // This will be either the first unsolved challenge or the first challenge
                    const accessibleIndex = findFirstAccessibleChallengeIndex(teamData?.solvedChallenges, challengesList);
                    setCurrentChallengeIndex(accessibleIndex);
                    setSelectedChallenge(challengesList[accessibleIndex]);
                }
            } catch (error) {
                console.error("Error fetching challenges:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && teamData) {
            fetchChallenges();
        }
    }, [challengeId, user, teamData, navigate]);

    // Helper function to find the index of the last solved challenge
    const findLastSolvedChallengeIndex = (solvedChallenges, challengesList) => {
        if (!solvedChallenges || solvedChallenges.length === 0) return -1;
        
        // Go through the challenges list in reverse order to find the last solved challenge
        for (let i = challengesList.length - 1; i >= 0; i--) {
            if (solvedChallenges.includes(challengesList[i].id)) {
                return i;
            }
        }
        
        return -1;
    };

    // Helper function to find the first accessible challenge
    const findFirstAccessibleChallengeIndex = (solvedChallenges, challengesList) => {
        // If there are no solved challenges, return the first challenge
        if (!solvedChallenges || solvedChallenges.length === 0) return 0;
        
        // Find the first challenge that hasn't been solved yet
        for (let i = 0; i < challengesList.length; i++) {
            if (!solvedChallenges.includes(challengesList[i].id)) {
                return i;
            }
        }
        
        // If all challenges are solved, return the last one
        return challengesList.length - 1;
    };

    // Check if a challenge at given index is accessible
    const isChallengeAccessible = (index, solvedChallenges, challengesList) => {
        // First challenge is always accessible
        if (index === 0) return true;
        
        // If no solved challenges, only the first challenge is accessible
        if (!solvedChallenges || solvedChallenges.length === 0) return index === 0;
        
        // A challenge is accessible if the previous challenge is solved
        const previousChallengeId = challengesList[index - 1]?.id;
        return previousChallengeId && solvedChallenges.includes(previousChallengeId);
    };

    // Check if all previous challenges are solved (for showing completion message)
    const areAllPreviousChallengesSolved = (currentIndex, solvedChallenges, challengesList) => {
        if (currentIndex <= 0) return true;
        
        for (let i = 0; i < currentIndex; i++) {
            if (!solvedChallenges.includes(challengesList[i].id)) {
                return false;
            }
        }
        return true;
    };

    // Add this effect near your other useEffects
useEffect(() => {
    const checkFinalistStatus = async () => {
        if (!teamData || !challenges.length) return;
        
        try {
            // Get finalist count
            const settingsDoc = await getDoc(doc(db, "settings", "eventSettings"));
            if (settingsDoc.exists()) {
                const settingsData = settingsDoc.data();
                const finalistCount = settingsData.finalistCount || 1;

                // Check completed teams
                const teamsRef = collection(db, "teams");
                const teamsSnapshot = await getDocs(teamsRef);
                
                // Get teams that have finished all challenges
                const completedTeams = teamsSnapshot.docs
                    .filter(doc => {
                        const team = doc.data();
                        return team.solvedChallenges?.length >= challenges.length;
                    })
                    .map(doc => ({ id: doc.id, ...doc.data() }));

                // If enough teams have finished and this team isn't among them, redirect
                if (completedTeams.length >= finalistCount && 
                    !completedTeams.some(team => team.id === teamData.id)) {
                    setSubmitResult({
                        success: false,
                        message: "The competition has been completed by other teams."
                    });
                    
                    setTimeout(() => {
                        navigate('/home');
                    }, 3000);
                }
            }
        } catch (error) {
            console.error("Error checking finalist status:", error);
        }
    };

    checkFinalistStatus();
}, [teamData, challenges, navigate]);

    const handleSubmitFlag = async (e) => {
        e.preventDefault();
        if (!selectedChallenge || !flagSubmission.trim()) return;
    
        // Check if event has ended
        if (eventStatus === 'ended') {
            setSubmitResult({
                success: false,
                message: "The competition has ended. No further submissions are being accepted."
            });
            return;
        }
    
        setSubmitLoading(true);
        setSubmitResult(null);
    
        try {
            // Fetch the current settings to get the finalist count
            const settingsDoc = await getDoc(doc(db, "settings", "eventSettings"));
            if (settingsDoc.exists()) {
                const settingsData = settingsDoc.data();
                const finalistCount = settingsData.finalistCount || 1;
    
                // Check how many teams have completed all challenges
                const teamsRef = collection(db, "teams");
                const teamsSnapshot = await getDocs(teamsRef);
                const completedTeams = teamsSnapshot.docs.filter(doc => {
                    const team = doc.data();
                    return team.solvedChallenges?.length >= challenges.length; // All challenges solved
                });
    
                if (!completedTeams.some(team => team.id === teamData.id)) {
                    setSubmitResult({
                        success: false,
                        message: "This challenge has been completed by another team. The competition is now closed."
                    });
                    setSubmitLoading(false);
                    
                    // Redirect to home page after a delay
                    setTimeout(() => {
                        navigate('/home');
                    }, 3000);
                    return;
                }
            }
    
            // Verify the flag against the stored hash
            if (!selectedChallenge.flagHash) {
                setSubmitResult({
                    success: false,
                    message: "This challenge doesn't have a valid flag configured. Please contact an administrator."
                });
                setSubmitLoading(false);
                return;
            }
    
            const flagMatches = await bcrypt.compare(flagSubmission.trim(), selectedChallenge.flagHash);
    
            if (flagMatches) {
                // Flag is correct! Update team's solved challenges and score
                if (teamData) {
                    const teamRef = doc(db, "teams", teamData.id);
    
                    // Check if this challenge was already solved to prevent duplicate points
                    const solvedChallenges = teamData.solvedChallenges || [];
                    if (!solvedChallenges.includes(selectedChallenge.id)) {
                        // Update team document with the solved challenge and points
                        await updateDoc(teamRef, {
                            solvedChallenges: arrayUnion(selectedChallenge.id),
                            score: (teamData.score || 0) + selectedChallenge.points,
                            completedAt: solvedChallenges.length + 1 === challenges.length ? new Date() : null // Set completion time if all challenges are solved
                        });
    
                        // Update local team data
                        setTeamData({
                            ...teamData,
                            solvedChallenges: [...solvedChallenges, selectedChallenge.id],
                            score: (teamData.score || 0) + selectedChallenge.points
                        });
                    }
    
                    // Check if all challenges are solved
                    const allSolved = challenges.every(challenge =>
                        [...solvedChallenges, selectedChallenge.id].includes(challenge.id)
                    );
    
                    if (allSolved) {
                        setSubmitResult({
                            success: true,
                            message: "Congratulations! You've completed all challenges. Redirecting to home page..."
                        });
                        setAllCompleted(true);
    
                        // Redirect to home after delay
                        setTimeout(() => {
                            navigate('/home');
                        }, 5000);
                    } else {
                        setSubmitResult({
                            success: true,
                            message: `Correct! You've earned ${selectedChallenge.points} points.`
                        });
    
                        // Clear the flag input
                        setFlagSubmission('');
                    }
                }
            } else {
                // Flag is incorrect
                setSubmitResult({
                    success: false,
                    message: "Incorrect flag. Try again."
                });
            }
        } catch (error) {
            console.error("Error verifying flag:", error);
            setSubmitResult({
                success: false,
                message: "An error occurred while submitting your flag."
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    // Handle navigation to different challenges
    const navigateToChallenge = (index) => {
        if (index >= 0 && index < challenges.length && isChallengeAccessible(index, teamData?.solvedChallenges, challenges)) {
            setSelectedChallenge(challenges[index]);
            setCurrentChallengeIndex(index);
            navigate(`/challenges/${challenges[index].id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Loading challenges...</p>
                </div>
            </div>
        );
    }

    // If no challenges are available
    if (challenges.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
                {/* Header */}
                <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <Link to="/home" className="text-2xl font-bold text-white flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            CID CTF Platform
                        </Link>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
                        <Link
                            to="/home"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Home
                        </Link>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                        <p className="text-gray-500 text-center">
                            No challenges available at the moment. Please check back later.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // If all challenges are completed, show completion message
    if (allCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
                {/* Header */}
                <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <Link to="/home" className="text-2xl font-bold text-white flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            CID CTF Platform
                        </Link>
                        
                        {teamData && (
                            <div className="flex items-center text-white bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/30">
                                <span className="mr-2 font-medium">Final Score:</span>
                                <span className="px-3 py-0.5 bg-white text-indigo-800 text-sm font-bold rounded-full">
                                    {teamData.score || 0}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">Challenges Completed!</h1>
                        <Link
                            to="/home"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Home
                        </Link>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl shadow-lg border border-green-200 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="h-12 w-12 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-4">Congratulations!</h2>
                        <p className="text-lg text-green-700 mb-4">
                            You've successfully completed all challenges! 
                        </p>
                        <p className="text-md text-green-600 mb-8">
                            Your final score: <span className="font-bold">{teamData?.score || 0}</span> points.
                        </p>
                        
                        <div className="animate-pulse text-sm text-green-500">
                            Redirecting to home page...
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Display the current challenge
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <Link to="/home" className="text-2xl font-bold text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        CID CTF Platform
                    </Link>
                    
                    {teamData && (
                        <div className="flex items-center text-white bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/30">
                            <span className="mr-2 font-medium">Score:</span>
                            <span className="px-3 py-0.5 bg-white text-indigo-800 text-sm font-bold rounded-full">
                                {teamData.score || 0}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Challenge {currentChallengeIndex + 1}</h1>
                    <div className="flex space-x-2">
                        <Link
                            to="/home"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Progress</span>
                        <span className="text-sm font-medium text-indigo-600">
                            {teamData?.solvedChallenges?.length || 0} / {challenges.length} solved
                        </span>
                    </div>
                    <div className="relative pt-1">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-100">
                            <div 
                                style={{ 
                                    width: `${((teamData?.solvedChallenges?.length || 0) * 100) / challenges.length}%` 
                                }} 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Current Challenge */}
                {selectedChallenge && (
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                        {/* Challenge header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">{selectedChallenge.title}</h2>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-white font-medium">
                                        {selectedChallenge.points} pts
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-white font-medium">
                                        {selectedChallenge.category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Challenge content */}
                        <div className="p-6">
                            <div className="prose max-w-none mb-8">
                                <p className="text-gray-700">{selectedChallenge.description}</p>
                            </div>

                            {selectedChallenge.imageUrl && (
                                <div className="mt-6 mb-8 flex justify-center">
                                    <img 
                                        src={selectedChallenge.imageUrl} 
                                        alt={selectedChallenge.title}
                                        className="max-w-full rounded-lg border border-gray-200 shadow-sm"
                                        style={{ maxHeight: '400px' }}
                                    />
                                </div>
                            )}

                            {/* Hint with collapsible display */}
                            {selectedChallenge.hint && (
                                <div className="mt-6">
                                    <details className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                                        <summary className="font-medium text-blue-700 cursor-pointer">
                                            Show Hint
                                        </summary>
                                        <div className="mt-2">
                                            <p className="text-sm text-blue-700">
                                                {selectedChallenge.hint}
                                            </p>
                                        </div>
                                    </details>
                                </div>
                            )}

                            {/* Check if challenge is already solved */}
                            {teamData?.solvedChallenges?.includes(selectedChallenge.id) ? (
                                <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-green-700 font-medium">
                                            You've already solved this challenge!
                                        </p>
                                    </div>
                                    
                                    {/* Show button to next unsolved challenge if available */}
                                    {currentChallengeIndex < challenges.length - 1 && isChallengeAccessible(currentChallengeIndex + 1, teamData.solvedChallenges, challenges) && (
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => navigateToChallenge(currentChallengeIndex + 1)}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                Go to Next Challenge
                                                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Flag submission form */
                                <div className="mt-8">
                                    <h3 className="font-medium text-gray-900">Submit Flag</h3>
                                    <form onSubmit={handleSubmitFlag} className="mt-3">
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={flagSubmission}
                                                onChange={e => setFlagSubmission(e.target.value)}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                placeholder="Enter flag (e.g. CTF{...})"
                                                required
                                                disabled={submitLoading}
                                            />
                                            <button
                                                type="submit"
                                                className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                                    submitLoading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                                disabled={submitLoading}
                                            >
                                                {submitLoading ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    "Submit Flag"
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                    
                                    {submitResult && (
                                        <div className={`mt-3 p-3 rounded-md ${submitResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                            <p className={`text-sm flex items-center ${submitResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                {submitResult.success ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                {submitResult.message}
                                            </p>
                                            
                                            {/* If this message indicates all challenges are completed, add a countdown */}
                                            {submitResult.message.includes("Redirecting") && (
                                                <div className="mt-2 text-center">
                                                    <div className="animate-pulse text-sm text-green-500">
                                                        Redirecting to home page...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Challenge Navigation - only show solved challenges */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Challenge Progress</h3>
                    <div className="flex flex-wrap gap-2">
                        {challenges.map((challenge, index) => {
                            const isSolved = teamData?.solvedChallenges?.includes(challenge.id);
                            const isAccessible = isChallengeAccessible(index, teamData?.solvedChallenges, challenges);
                            const isCurrent = currentChallengeIndex === index;
                            
                            return (
                                <button
                                    key={challenge.id}
                                    onClick={() => isAccessible ? navigateToChallenge(index) : null}
                                    disabled={!isAccessible}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full font-medium text-sm
                                        ${isCurrent ? 'ring-2 ring-offset-2 ring-indigo-500 ' : ''}
                                        ${isSolved 
                                            ? 'bg-green-100 text-green-800 border border-green-300' 
                                            : isAccessible 
                                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200' 
                                                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                        }`}
                                    title={isAccessible ? challenge.title : "Locked Challenge"}
                                >
                                    {isSolved ? (
                                        <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : isAccessible ? (
                                        index + 1
                                    ) : (
                                        <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Challenges;