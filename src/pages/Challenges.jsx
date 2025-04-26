import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { useState, useEffect, useRef } from 'react';

// import ReactDOM from 'react-dom';

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

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [attemptedChallenges, setAttemptedChallenges] = useState([]);
    const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);

    const fullscreenRef = useRef(null);

    const { challengeId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (selectedChallenge && !isFullscreen) {
            const isAttempted = teamData?.attemptedChallenges?.includes(selectedChallenge.id);

            // Only show dialog for challenges that haven't been attempted yet
            if (!isAttempted) {
                console.log("Showing fullscreen dialog");
                setShowFullscreenDialog(true);

                // Clear any existing "force fullscreen" intervals
                const existingIntervals = window._fullscreenCheckIntervals || [];
                existingIntervals.forEach(clearInterval);
                window._fullscreenCheckIntervals = [];
            } else {
                // For attempted challenges, just navigate back to challenges without fullscreen
                navigate('/challenges');
            }
        }
    }, [selectedChallenge, isFullscreen, teamData?.attemptedChallenges, navigate]);

    //

    const FullscreenDialog = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white p-8 rounded-lg max-w-md w-full">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Enter Fullscreen Mode</h3>
                <p className="mb-6 text-gray-600">
                    This challenge requires fullscreen mode. Tab switches will be counted and may affect your ability to submit the flag.
                    You cannot exit fullscreen without submitting your answer.
                </p>
                <div className="flex justify-between">
                    <button
                        onClick={() => {
                            setSelectedChallenge(null);
                            setShowFullscreenDialog(false);
                            navigate('/challenges');
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            enterFullscreen();
                            setShowFullscreenDialog(false);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Enter Fullscreen
                    </button>
                </div>
            </div>
        </div>
    );

    const ExitFullscreenDialog = ({ onStay, onExit }) => {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80">
                <div className="bg-white p-8 rounded-lg max-w-md w-full border-4 border-red-500">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Exit Challenge?</h3>
                    <p className="mb-6 text-gray-600">
                        Are you sure you want to exit this challenge? This will mark the challenge as attempted and you cannot try it again.
                    </p>
                    <div className="flex justify-between">
                        <button
                            onClick={onStay}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg"
                        >
                            Stay in Challenge
                        </button>
                        <button
                            onClick={onExit}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Exit Challenge
                        </button>
                    </div>
                </div>
            </div>
        );
    };



    // Update the enterFullscreen function to better handle tab visibility
    const enterFullscreen = () => {
        if (fullscreenRef.current) {
            try {
                if (document.fullscreenElement) {
                    // Already in fullscreen, no need to request again
                    setIsFullscreen(true);
                    return;
                }

                if (fullscreenRef.current.requestFullscreen) {
                    fullscreenRef.current.requestFullscreen();
                } else if (fullscreenRef.current.mozRequestFullScreen) {
                    fullscreenRef.current.mozRequestFullScreen();
                } else if (fullscreenRef.current.webkitRequestFullscreen) {
                    fullscreenRef.current.webkitRequestFullscreen();
                } else if (fullscreenRef.current.msRequestFullscreen) {
                    fullscreenRef.current.msRequestFullscreen();
                }

                setIsFullscreen(true);

                // Listen for visibilitychange immediately after entering fullscreen
                document.addEventListener('visibilitychange', handleVisibilityChange);
                window.addEventListener('blur', handleFocusChange);

                // Ensure content is scrollable in fullscreen mode
                if (fullscreenRef.current) {
                    fullscreenRef.current.style.overflow = "auto";
                    fullscreenRef.current.style.height = "100vh";
                }

                // Reset tab switch counter when entering fullscreen for a new challenge
                setTabSwitchCount(0);
            } catch (error) {
                console.error("Error entering fullscreen:", error);
                // Show fallback message if fullscreen fails
                alert("Your browser couldn't enter fullscreen mode. Please ensure you've allowed fullscreen permissions.");
            }
        }
    };

    // Add exit handler functions that need to be scoped outside of useEffect
    const handleVisibilityChange = () => {
        if (document.hidden && selectedChallenge) {
            setTabSwitchCount(prev => prev + 1);
            console.log("User switched tabs or minimized window");
        }
    };

    const handleFocusChange = () => {
        if (selectedChallenge) {
            setTabSwitchCount(prev => prev + 1);
            console.log("User switched window focus");
        }
    };


    // // Improved enterFullscreen function with better browser compatibility
    // const enterFullscreen = () => {
    //     if (fullscreenRef.current) {
    //         try {
    //             if (document.fullscreenElement) {
    //                 // Already in fullscreen, no need to request again
    //                 setIsFullscreen(true);
    //                 return;
    //             }

    //             if (fullscreenRef.current.requestFullscreen) {
    //                 fullscreenRef.current.requestFullscreen();
    //             } else if (fullscreenRef.current.mozRequestFullScreen) {
    //                 fullscreenRef.current.mozRequestFullScreen();
    //             } else if (fullscreenRef.current.webkitRequestFullscreen) {
    //                 fullscreenRef.current.webkitRequestFullscreen();
    //             } else if (fullscreenRef.current.msRequestFullscreen) {
    //                 fullscreenRef.current.msRequestFullscreen();
    //             }

    //             setIsFullscreen(true);
    //             console.log("Entered fullscreen mode");

    //             // Ensure content is scrollable in fullscreen mode
    //             if (fullscreenRef.current) {
    //                 fullscreenRef.current.style.overflow = "auto";
    //                 fullscreenRef.current.style.height = "100vh";
    //             }

    //             // Reset tab switch counter when entering fullscreen for a new challenge
    //             setTabSwitchCount(0);
    //         } catch (error) {
    //             console.error("Error entering fullscreen:", error);
    //             // Show fallback message if fullscreen fails
    //             alert("Your browser couldn't enter fullscreen mode. Please ensure you've allowed fullscreen permissions.");
    //         }
    //     }
    // };

    // Clean up event listeners when component unmounts
    useEffect(() => {
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleFocusChange);  // <-- This was wrong (addEventListener instead of removeEventListener)
        };
    }, []);

    // Function to exit fullscreen
    const exitFullscreen = () => {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
            setIsFullscreen(false);
            console.log("Exited fullscreen mode");
        } catch (error) {
            console.error("Error exiting fullscreen:", error);
        }
    };

    useEffect(() => {
        let escKeyProcessing = false;

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement;

            console.log("Fullscreen state changed:", isCurrentlyFullscreen ? "in fullscreen" : "exiting fullscreen");

            // If we're exiting fullscreen unexpectedly (via ESC key)
            if (!isCurrentlyFullscreen && isFullscreen && selectedChallenge && !escKeyProcessing) {
                // If we're not already showing the exit dialog
                if (!isSubmitting && !showExitDialog) {
                    console.log("Intercepting ESC key fullscreen exit");

                    // Prevent multiple handlers from running at once
                    escKeyProcessing = true;

                    // Increment tab switch count
                    const newTabSwitchCount = tabSwitchCount + 1;
                    setTabSwitchCount(newTabSwitchCount);

                    // Update the tab switch count in the database
                    if (teamData && selectedChallenge) {
                        const teamRef = doc(db, "teams", teamData.id);
                        updateDoc(teamRef, {
                            [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: newTabSwitchCount
                        }).catch(error => {
                            console.error("Error updating tab switch count:", error);
                        });
                    }

                    // Show the dialog
                    setShowExitDialog(true);

                    // Re-enter fullscreen mode immediately
                    if (fullscreenRef.current) {
                        try {
                            if (fullscreenRef.current.requestFullscreen) {
                                fullscreenRef.current.requestFullscreen();
                            } else if (fullscreenRef.current.mozRequestFullScreen) {
                                fullscreenRef.current.mozRequestFullScreen();
                            } else if (fullscreenRef.current.webkitRequestFullscreen) {
                                fullscreenRef.current.webkitRequestFullscreen();
                            } else if (fullscreenRef.current.msRequestFullscreen) {
                                fullscreenRef.current.msRequestFullscreen();
                            }
                        } catch (error) {
                            console.error("Error re-entering fullscreen:", error);
                        }
                    }

                    // Reset the processing flag after a short delay
                    setTimeout(() => {
                        escKeyProcessing = false;
                    }, 100);
                }

                // Return without updating isFullscreen state
                return;
            }

            // For all other cases, update the fullscreen state normally
            if (!escKeyProcessing) {
                setIsFullscreen(!!isCurrentlyFullscreen);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [isFullscreen, selectedChallenge, isSubmitting, showExitDialog, tabSwitchCount, teamData]);


    const showExitConfirmation = () => {
        // Increment tab switch count when exit dialog is shown
        setTabSwitchCount(prev => prev + 1);
        console.log("Exit dialog opened - counted as tab switch");

        // Show exit dialog while still in fullscreen
        setShowExitDialog(true);

        // Also update the tab switch count in the database
        if (teamData && selectedChallenge) {
            const teamRef = doc(db, "teams", teamData.id);
            updateDoc(teamRef, {
                [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: tabSwitchCount + 1
            }).catch(error => {
                console.error("Error updating tab switch count:", error);
            });
        }
    };
    // useEffect(() => {
    //     // Auto enter fullscreen as soon as a challenge is selected
    //     if (selectedChallenge) {
    //         enterFullscreen();
    //     }
    // }, [selectedChallenge]); 

    // Track tab visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && selectedChallenge) {
                setTabSwitchCount(prev => prev + 1);
                console.log("User switched tabs or minimized window");
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [selectedChallenge]);

    const handleSubmitAndExit = () => {
        setIsSubmitting(true);

        // First mark as attempted
        if (teamData && !teamData.attemptedChallenges?.includes(selectedChallenge.id)) {
            const updateAttempted = async () => {
                try {
                    const teamRef = doc(db, "teams", teamData.id);
                    await updateDoc(teamRef, {
                        attemptedChallenges: arrayUnion(selectedChallenge.id)
                    });
                } catch (error) {
                    console.error("Error marking challenge as attempted:", error);
                }
            };
            updateAttempted();
        }

        // Now we can safely exit and navigate away
        exitFullscreen();
        navigate('/challenges');
    };

    // useEffect(() => {
    //     let intervalId;

    //     if (selectedChallenge) {
    //         // Use a less frequent interval and only attempt to enter fullscreen
    //         // if we're not already in fullscreen mode
    //         intervalId = setInterval(() => {
    //             const isCurrentlyFullscreen = document.fullscreenElement ||
    //                 document.webkitFullscreenElement ||
    //                 document.mozFullScreenElement ||
    //                 document.msFullscreenElement;

    //             if (!isCurrentlyFullscreen && !isSubmitting) {
    //                 // Don't log repeatedly to reduce console spam
    //                 enterFullscreen();
    //             }
    //         }, 5000); // Check less frequently - every 5 seconds
    //     }

    //     return () => {
    //         if (intervalId) {
    //             clearInterval(intervalId);
    //         }
    //     };
    // }, [selectedChallenge, isSubmitting]);

    // Track window focus/blur
    useEffect(() => {
        const handleFocusChange = () => {
            if (selectedChallenge) {
                setTabSwitchCount(prev => prev + 1);
                console.log("User switched window focus");
            }
        };

        window.addEventListener('blur', handleFocusChange);

        return () => {
            window.removeEventListener('blur', handleFocusChange);
        };
    }, [selectedChallenge]);

    // New helper function to mark challenges as attempted
    const markChallengeAsAttempted = async (challengeId) => {
        if (teamData && !teamData.attemptedChallenges?.includes(challengeId)) {
            try {
                // Update local state
                setAttemptedChallenges(prev => [...prev, challengeId]);

                // Update in database
                const teamRef = doc(db, "teams", teamData.id);
                await updateDoc(teamRef, {
                    attemptedChallenges: arrayUnion(challengeId),
                    [`challengeAttempts.${challengeId}`]: {
                        tabSwitches: tabSwitchCount,
                        attemptedAt: new Date()
                    }
                });

                console.log("Challenge marked as attempted:", challengeId);
            } catch (error) {
                console.error("Error marking challenge as attempted:", error);
            }
        }
    };

    // // Force fullscreen when a challenge is selected
    // useEffect(() => {
    //     if (selectedChallenge && !isFullscreen) {
    //         // Short timeout to ensure DOM is ready
    //         const timeoutId = setTimeout(() => {
    //             enterFullscreen();
    //         }, 300);
    //         return () => clearTimeout(timeoutId);
    //     }
    // }, [selectedChallenge, isFullscreen]);

    // Periodically check if we're in fullscreen mode and attempt to re-enter if not
    // useEffect(() => {
    //     if (selectedChallenge) {
    //         const intervalId = setInterval(() => {
    //             const isCurrentlyFullscreen = document.fullscreenElement ||
    //                 document.webkitFullscreenElement ||
    //                 document.mozFullScreenElement ||
    //                 document.msFullscreenElement;

    //             if (!isCurrentlyFullscreen) {
    //                 enterFullscreen();
    //             }
    //         }, 2000); // Check every 2 seconds

    //         return () => clearInterval(intervalId);
    //     }
    // }, [selectedChallenge]);

    // Save attempted challenges to team data in Firebase
    useEffect(() => {
        const saveAttemptedChallenges = async () => {
            if (user && teamData && teamData.id && attemptedChallenges.length > 0) {
                try {
                    const teamRef = doc(db, "teams", teamData.id);
                    await updateDoc(teamRef, {
                        attemptedChallenges: arrayUnion(...attemptedChallenges)
                    });
                } catch (error) {
                    console.error("Error saving attempted challenges:", error);
                }
            }
        };

        saveAttemptedChallenges();
    }, [attemptedChallenges, user, teamData]);

    // Load attempted challenges when team data is loaded
    useEffect(() => {
        if (teamData && teamData.attemptedChallenges) {
            setAttemptedChallenges(teamData.attemptedChallenges);
        }
    }, [teamData]);

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
                    exitFullscreen(); // Exit fullscreen before redirecting
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

                    // Initialize attemptedChallenges if it doesn't exist
                    if (!team.attemptedChallenges) {
                        await updateDoc(doc(db, "teams", team.id), {
                            attemptedChallenges: []
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
                console.log("Settings document exists:", settingsDoc.exists());
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    console.log("Settings data:", data);
                    setEventStatus(data.eventStatus);

                    // If event has ended, redirect to home
                    if (data.eventStatus === 'ended') {
                        navigate('/home');
                    }
                } else {
                    console.log("Settings document does not exist");
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

                    // Check if challenge has already been attempted but not solved
                    const isAttempted = teamData?.attemptedChallenges?.includes(challengeId) &&
                        !teamData?.solvedChallenges?.includes(challengeId);

                    if (isAttempted) {
                        // Redirect to challenges page without ID if already attempted
                        navigate('/challenges');
                        return;
                    }

                    // If challenge exists and is accessible (based on solved challenges)
                    if (challengeIndex !== -1 && isChallengeAccessible(challengeIndex, teamData?.solvedChallenges, challengesList)) {
                        setSelectedChallenge(challengesList[challengeIndex]);
                        setCurrentChallengeIndex(challengeIndex);
                        // Auto-enter fullscreen
                        setTimeout(() => enterFullscreen(), 500);
                    } else {
                        // Redirect to challenges page without ID to show current challenge
                        navigate('/challenges');
                    }
                } else if (challengesList.length > 0) {
                    // If no specific challenge is requested, set the current accessible challenge
                    // This will be either the first unsolved challenge or the first challenge
                    const accessibleIndex = findFirstAccessibleChallengeIndex(teamData?.solvedChallenges, challengesList);

                    // Check if this challenge has been attempted
                    const nextChallenge = challengesList[accessibleIndex];
                    const isAttempted = nextChallenge && teamData?.attemptedChallenges?.includes(nextChallenge.id) &&
                        !teamData?.solvedChallenges?.includes(nextChallenge.id);

                    if (!isAttempted) {
                        setCurrentChallengeIndex(accessibleIndex);
                        setSelectedChallenge(challengesList[accessibleIndex]);
                    } else {
                        // Find next unattempted challenge
                        let foundUnattempted = false;
                        for (let i = 0; i < challengesList.length; i++) {
                            if (isChallengeAccessible(i, teamData?.solvedChallenges, challengesList) &&
                                !teamData?.attemptedChallenges?.includes(challengesList[i].id) &&
                                !teamData?.solvedChallenges?.includes(challengesList[i].id)) {
                                setCurrentChallengeIndex(i);
                                setSelectedChallenge(challengesList[i]);
                                foundUnattempted = true;
                                break;
                            }
                        }

                        if (!foundUnattempted) {
                            // No unattempted challenges available
                            setSelectedChallenge(null);
                        }
                    }
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
                const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
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

                    console.log("Completed teams:", completedTeams.length, "Finalist count:", finalistCount);
                    console.log("Current team is finalist:", completedTeams.some(team => team.id === teamData.id));

                    // If enough teams have finished and this team isn't among them, redirect
                    if (completedTeams.length >= finalistCount &&
                        !completedTeams.some(team => team.id === teamData.id)) {
                        setSubmitResult({
                            success: false,
                            message: "The competition has been completed by other teams."
                        });

                        setTimeout(() => {
                            navigate('/home');
                        }, 6000);
                    }
                }
            } catch (error) {
                console.error("Error checking finalist status:", error);
            }
        };

        checkFinalistStatus();
    }, [teamData, challenges, navigate]);

    // Modified submit function to include tab switch information

    // Modified challenge navigation function to handle attempted challenges
    const navigateToChallenge = (index) => {
        if (index >= 0 && index < challenges.length) {
            const challenge = challenges[index];

            // Check if this challenge has already been attempted but not solved
            const isAttempted = teamData?.attemptedChallenges?.includes(challenge.id) &&
                !teamData?.solvedChallenges?.includes(challenge.id);

            if (isAttempted) {
                alert("You've already attempted this challenge and cannot access it again.");
                return;
            }

            // Check accessibility based on previous challenges
            if (isChallengeAccessible(index, teamData?.solvedChallenges, challenges)) {
                // Mark this challenge as attempted when navigating to it
                if (!teamData?.solvedChallenges?.includes(challenge.id)) {
                    setAttemptedChallenges(prev => [...prev, challenge.id]);
                }

                setSelectedChallenge(challenge);
                setCurrentChallengeIndex(index);
                navigate(`/challenges/${challenge.id}`);
                setTabSwitchCount(0); // Reset tab switch count for new challenge

                // Enter fullscreen mode
                enterFullscreen();
            }
        }
    };

    // Improved submit function with proper event handling
    const handleSubmitFlag = async (e) => {
        if (e) e.preventDefault();
        if (!selectedChallenge || !flagSubmission.trim()) return;

        // Check if event has ended
        if (eventStatus === 'ended') {
            setSubmitResult({
                success: false,
                message: "The competition has ended. No further submissions are being accepted."
            });
            return;
        }

        // Mark this challenge as attempted
        markChallengeAsAttempted(selectedChallenge.id);

        setSubmitLoading(true);
        setSubmitResult(null);

        try {
            // Add tab switch count to the database when submitting a flag
            if (teamData) {
                const teamRef = doc(db, "teams", teamData.id);
                await updateDoc(teamRef, {
                    [`challengeAttempts.${selectedChallenge.id}`]: {
                        tabSwitches: tabSwitchCount,
                        submittedAt: new Date()
                    }
                });
            }

            // Flag verification code
            const flagMatches = await bcrypt.compare(flagSubmission.trim(), selectedChallenge.flagHash);

            if (flagMatches) {
                // Flag is correct! Update team's solved challenges and score
                if (teamData) {
                    const teamRef = doc(db, "teams", teamData.id);

                    // Check if this challenge was already solved to prevent duplicate points
                    const solvedChallenges = teamData.solvedChallenges || [];
                    if (!solvedChallenges.includes(selectedChallenge.id)) {
                        try {
                            // Update team document with the solved challenge and points
                            await updateDoc(teamRef, {
                                solvedChallenges: arrayUnion(selectedChallenge.id),
                                score: (teamData.score || 0) + selectedChallenge.points,
                                completedAt: solvedChallenges.length + 1 === challenges.length ? new Date() : null,
                                [`challengeAttempts.${selectedChallenge.id}.success`]: true
                            });

                            // Update local team data
                            setTeamData({
                                ...teamData,
                                solvedChallenges: [...solvedChallenges, selectedChallenge.id],
                                score: (teamData.score || 0) + selectedChallenge.points
                            });
                        } catch (updateError) {
                            console.error("Error updating team document:", updateError);
                            setSubmitResult({
                                success: false,
                                message: "Error updating team score. Please try again."
                            });
                            setSubmitLoading(false);
                            return;
                        }
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
                            exitFullscreen(); // Only exit fullscreen before redirecting on completion
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
                if (teamData) {
                    await updateDoc(doc(db, "teams", teamData.id), {
                        [`challengeAttempts.${selectedChallenge.id}.incorrectAttempts`]: arrayUnion({
                            flag: flagSubmission.trim(),
                            timestamp: new Date()
                        })
                    });
                }

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

                        <div className="flex items-center space-x-4">
                            {/* Score Counter */}
                            {teamData && (
                                <div className="flex items-center text-white bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/30">
                                    <span className="mr-2 font-medium">Score:</span>
                                    <span className="px-3 py-0.5 bg-white text-indigo-800 text-sm font-bold rounded-full">
                                        {teamData.score || 0}
                                    </span>
                                </div>
                            )}
                        </div>
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

    const reenterFullscreenWithoutReset = () => {
        if (fullscreenRef.current) {
            try {
                if (document.fullscreenElement) {
                    // Already in fullscreen, no need to request again
                    setIsFullscreen(true);
                    return;
                }

                if (fullscreenRef.current.requestFullscreen) {
                    fullscreenRef.current.requestFullscreen();
                } else if (fullscreenRef.current.mozRequestFullScreen) {
                    fullscreenRef.current.mozRequestFullScreen();
                } else if (fullscreenRef.current.webkitRequestFullscreen) {
                    fullscreenRef.current.webkitRequestFullscreen();
                } else if (fullscreenRef.current.msRequestFullscreen) {
                    fullscreenRef.current.msRequestFullscreen();
                }

                setIsFullscreen(true);

                // Ensure content is scrollable in fullscreen mode
                if (fullscreenRef.current) {
                    fullscreenRef.current.style.overflow = "auto";
                    fullscreenRef.current.style.height = "100vh";
                }

                // Don't reset tab switch counter here!
            } catch (error) {
                console.error("Error re-entering fullscreen:", error);
            }
        }
    };

    // Add this function to detect AI assistant overlays
const setupAIAssistantDetection = () => {
    // Create a MutationObserver to detect DOM changes that might be AI assistants
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for common AI assistant indicators
              const element = node;
              
              // Check if the element has a high z-index (usually overlay UIs do)
              const style = window.getComputedStyle(element);
              const zIndex = parseInt(style.zIndex, 10);
              
              if (zIndex > 1000) {
                // Check for patterns common in AI assistants (Siri, ChatGPT, etc.)
                const innerHTML = element.innerHTML.toLowerCase();
                const className = (element.className || '').toLowerCase();
                const id = (element.id || '').toLowerCase();
                
                // Check for common AI assistant keywords
                const aiPatterns = [
                  'siri', 'alexa', 'cortana', 'assistant', 'chatgpt', 'openai',
                  'ai-', 'gpt-', 'clipboard', 'voice', 'dictation'
                ];
                
                // If any AI pattern is found in the element
                if (aiPatterns.some(pattern => 
                  innerHTML.includes(pattern) || 
                  className.includes(pattern) || 
                  id.includes(pattern)
                )) {
                  console.log("AI assistant overlay detected");
                  setTabSwitchCount(prev => prev + 1);
                  
                  // Update the tab switch count in the database
                  if (teamData && selectedChallenge) {
                    const teamRef = doc(db, "teams", teamData.id);
                    updateDoc(teamRef, {
                      [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: tabSwitchCount + 1
                    }).catch(error => {
                      console.error("Error updating tab switch count:", error);
                    });
                  }
                  
                  // Display a warning
                  const warningDiv = document.createElement('div');
                  warningDiv.style.position = 'fixed';
                  warningDiv.style.top = '50%';
                  warningDiv.style.left = '50%';
                  warningDiv.style.transform = 'translate(-50%, -50%)';
                  warningDiv.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                  warningDiv.style.color = 'white';
                  warningDiv.style.padding = '1rem';
                  warningDiv.style.borderRadius = '0.5rem';
                  warningDiv.style.zIndex = '9999';
                  warningDiv.style.textAlign = 'center';
                  warningDiv.style.fontWeight = 'bold';
                  warningDiv.innerHTML = 'AI Assistant detected! This counts as a tab switch.';
                  document.body.appendChild(warningDiv);
                  
                  setTimeout(() => {
                    if (document.body.contains(warningDiv)) {
                      document.body.removeChild(warningDiv);
                    }
                  }, 3000);
                }
              }
            }
          }
        }
      }
    });
    
    // Start observing the document for AI assistant overlays
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  };
  
  // Add these to the existing useEffect for fullscreen mode
  useEffect(() => {
    if (selectedChallenge && isFullscreen) {
      // Set up detection for keyboard shortcuts that might invoke AI assistants
      const handleKeyDown = (e) => {
        // Detect common AI assistant keyboard shortcuts
        // Command+Space (Spotlight/Siri on Mac)
        if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
          console.log("AI assistant shortcut detected");
          e.preventDefault();
          setTabSwitchCount(prev => prev + 1);
          
          // Update database
          if (teamData && selectedChallenge) {
            const teamRef = doc(db, "teams", teamData.id);
            updateDoc(teamRef, {
              [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: tabSwitchCount + 1
            }).catch(error => {
              console.error("Error updating tab switch count:", error);
            });
          }
          
          return false;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown, true);
      
      // Set up detection for AI assistant overlays
      const cleanupOverlayDetection = setupAIAssistantDetection();
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        cleanupOverlayDetection();
      };
    }
  }, [selectedChallenge, isFullscreen, teamData, tabSwitchCount]);
  
  // Add CSS rules to disable built-in browser features that might invoke AI
  useEffect(() => {
    if (selectedChallenge && isFullscreen) {
      // Create a style element to disable browser AI features
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        /* Disable text selection to prevent right-click menu AI features */
        body {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        /* Disable browser searchbox which might have AI */
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration {
          display: none;
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        if (document.head.contains(styleEl)) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }, [selectedChallenge, isFullscreen]);
  
  // ...existing code...
  
  // Add an element to detect right-clicks which might trigger contextual AI
  const handleContextMenu = (e) => {
    if (selectedChallenge && isFullscreen) {
      e.preventDefault();
      setTabSwitchCount(prev => prev + 1);
      
      // Update the tab switch count in the database
      if (teamData && selectedChallenge) {
        const teamRef = doc(db, "teams", teamData.id);
        updateDoc(teamRef, {
          [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: tabSwitchCount + 1
        }).catch(error => {
          console.error("Error updating tab switch count:", error);
        });
      }
      
      // Show warning
      alert("Right-click detected! This counts as a tab switch.");
      return false;
    }
  };
  
  // Add this to your component mount
  useEffect(() => {
    if (selectedChallenge && isFullscreen) {
      document.addEventListener('contextmenu', handleContextMenu);
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [selectedChallenge, isFullscreen, teamData, tabSwitchCount]);

    // Display the current challenge
    return (
        <div ref={fullscreenRef}
            className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100"
            style={{
                overflow: 'auto',  // Ensure content is scrollable
                height: '100vh',   // Take full viewport height
                position: 'relative' // Enable proper positioning
            }}
        >

            {/* Fullscreen exit button - only show when in fullscreen */}
            {selectedChallenge && isFullscreen && (
                <div className="fixed top-5 right-5 z-50">
                    <button
                        onClick={showExitConfirmation}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Exit Challenge
                    </button>
                </div>
            )}

            {/* Show fullscreen dialog if needed */}
            {showFullscreenDialog && <FullscreenDialog />}

            {/* Show exit dialog - ensure this renders on top of everything */}
            {showExitDialog && (
                <ExitFullscreenDialog
                    onStay={() => {
                        console.log("User chose to stay in challenge");
                        setShowExitDialog(false);
                        reenterFullscreenWithoutReset(); // Use the new function instead of enterFullscreen()
                    }}
                    onExit={() => {
                        console.log("User chose to exit challenge");
                        // Mark challenge as attempted
                        markChallengeAsAttempted(selectedChallenge.id);

                        // Close dialog first
                        setShowExitDialog(false);

                        // Exit fullscreen and navigate to HOME page
                        setTimeout(() => {
                            setIsSubmitting(true);
                            exitFullscreen();
                            navigate('/home'); // Redirect to home page
                        }, 100);
                    }}
                />
            )}

            {selectedChallenge && !isFullscreen && (
                <div className="fixed bottom-5 right-5 z-50">
                    <button
                        onClick={enterFullscreen}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Enter Fullscreen Mode
                    </button>
                </div>
            )}
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <Link to="/home" className="text-2xl font-bold text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        CID CTF Platform
                    </Link>

                    <div className="flex items-center space-x-4">
                        {/* Tab Switch Counter - Always show when a challenge is selected */}
                        {selectedChallenge && (
                            <div className="flex items-center text-white bg-red-500/80 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-red-400/30">
                                <span className="mr-2 font-medium">Tab Switches:</span>
                                <span className="px-3 py-0.5 bg-white text-red-800 text-sm font-bold rounded-full">
                                    {tabSwitchCount}
                                </span>
                            </div>
                        )}

                        {/* Score Counter */}
                        {teamData && (
                            <div className="flex items-center text-white bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/30">
                                <span className="mr-2 font-medium">Score:</span>
                                <span className="px-3 py-0.5 bg-white text-indigo-800 text-sm font-bold rounded-full">
                                    {teamData.score || 0}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Challenge {currentChallengeIndex + 1}
                        {selectedChallenge && (
                            <span className="ml-2 text-sm text-red-500">
                                (Fullscreen Mode - Tab switches are being counted)
                            </span>
                        )}
                    </h1>
                    <div className="flex space-x-2">
                        {!selectedChallenge && (
                            <Link
                                to="/home"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Back to Home
                            </Link>
                        )}
                    </div>
                </div>

                {/* Security Warning */}
                {selectedChallenge && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>Warning:</strong> You can only attempt this challenge once. If you exit fullscreen mode, switch tabs, or navigate away, it will count against you.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                                                className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${submitLoading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
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
                            const isAttempted = teamData?.attemptedChallenges?.includes(challenge.id) && !isSolved;

                            return (
                                <button
                                    key={challenge.id}
                                    onClick={() => isAccessible && !isAttempted ? navigateToChallenge(index) : null}
                                    disabled={!isAccessible || isAttempted}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full font-medium text-sm
                                        ${isCurrent ? 'ring-2 ring-offset-2 ring-indigo-500 ' : ''}
                                        ${isSolved
                                            ? 'bg-green-100 text-green-800 border border-green-300'
                                            : isAttempted
                                                ? 'bg-red-100 text-red-800 border border-red-300 cursor-not-allowed'
                                                : isAccessible
                                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                        }`}
                                    title={isAccessible
                                        ? isAttempted
                                            ? "Already attempted"
                                            : challenge.title
                                        : "Locked Challenge"}
                                >
                                    {isSolved ? (
                                        <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : isAttempted ? (
                                        <svg className="h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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