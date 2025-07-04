import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import bcrypt from 'bcryptjs';
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
            <div className="bg-zinc-900 p-8 rounded-lg max-w-md w-full border border-yellow-400/40 shadow-lg">
                <h3 className="text-xl font-semibold text-yellow-400 mb-4">Enter Fullscreen Mode</h3>
                <p className="mb-6 text-gray-300">
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
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-6 rounded-lg border border-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            enterFullscreen();
                            setShowFullscreenDialog(false);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg flex items-center"
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
                <div className="bg-zinc-900 p-8 rounded-lg max-w-md w-full border border-red-500/40 shadow-lg">
                    <h3 className="text-xl font-semibold text-red-400 mb-4">Exit Challenge?</h3>
                    <p className="mb-6 text-gray-300">
                        Are you sure you want to exit this challenge? This will mark the challenge as attempted and you cannot try it again.
                    </p>
                    <div className="flex justify-between">
                        <button
                            onClick={onStay}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-6 rounded-lg border border-gray-700"
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
        const checkTabSwitchLimit = async () => {
            if (!teamData || !selectedChallenge) return;

            try {
                // Get settings to check the max tab switches allowed
                const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
                if (settingsDoc.exists()) {
                    const settingsData = settingsDoc.data();
                    const maxTabSwitches = settingsData.maxTabSwitches || 3; // Default to 3 if not set

                    // If user exceeds tab switch limit
                    if (tabSwitchCount >= maxTabSwitches) {
                        console.log(`Tab switch limit (${maxTabSwitches}) exceeded. Locking challenge.`);

                        // Update the team document to mark this challenge as attempted
                        const teamRef = doc(db, "teams", teamData.id);
                        await updateDoc(teamRef, {
                            attemptedChallenges: arrayUnion(selectedChallenge.id),
                            [`challengeAttempts.${selectedChallenge.id}`]: {
                                tabSwitches: tabSwitchCount,
                                attemptedAt: new Date(),
                                lockedDueToTabSwitches: true
                            },
                            // Add to totalTabSwitches for stats
                            totalTabSwitches: (teamData.totalTabSwitches || 0) + tabSwitchCount
                        });

                        // Show alert and redirect
                        setSubmitResult({
                            success: false,
                            message: `Maximum tab switches (${maxTabSwitches}) exceeded. This challenge is now locked.`
                        });

                        // Exit fullscreen and redirect to home after a delay
                        setTimeout(() => {
                            setIsSubmitting(true);
                            exitFullscreen();
                            navigate('/home');
                        }, 3000);
                    }
                }
            } catch (error) {
                console.error("Error checking tab switch limit:", error);
            }
        };

        // Check whenever tabSwitchCount changes
        if (tabSwitchCount > 0) {
            checkTabSwitchLimit();
        }
    }, [tabSwitchCount, selectedChallenge, teamData, navigate]);

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
                            [`challengeAttempts.${selectedChallenge.id}.tabSwitches`]: newTabSwitchCount,
                            // Also update the total tab switches count
                            totalTabSwitches: (teamData.totalTabSwitches || 0) + 1
                        }).then(async () => {
                            // After updating the count, check if we've hit the limit
                            const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
                            if (settingsDoc.exists()) {
                                const settingsData = settingsDoc.data();
                                const maxTabSwitches = settingsData.maxTabSwitches || 3;

                                if (newTabSwitchCount >= maxTabSwitches) {
                                    // Show exit dialog
                                    setShowExitDialog(true);

                                    // Update as locked due to tab switches
                                    updateDoc(teamRef, {
                                        [`challengeAttempts.${selectedChallenge.id}.lockedDueToTabSwitches`]: true
                                    });
                                }
                            }
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

    // Update the useEffect that checks for all completed challenges (around line 520-540)

    // Check if all challenges are completed and show appropriate message
    useEffect(() => {
        const checkCompletionStatus = async () => {
            if (teamData?.solvedChallenges && challenges.length > 0) {
                const allSolved = challenges.every(challenge =>
                    teamData.solvedChallenges.includes(challenge.id)
                );

                setAllCompleted(allSolved);

                // If all challenges are completed and we're viewing the last challenge,
                // show appropriate message
                if (allSolved && !submitResult) {
                    try {
                        // Get settings to check if team grouping is enabled
                        const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
                        const settingsData = settingsDoc.exists() ? settingsDoc.data() : {};

                        if (settingsData.enableTeamGrouping) {
                            // Fetch all teams
                            const teamsRef = collection(db, "teams");
                            const teamsSnapshot = await getDocs(teamsRef);

                            // Get teams list - sort alphabetically for consistent grouping
                            const teamsList = teamsSnapshot.docs
                                .map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                }))
                                .sort((a, b) => a.name.localeCompare(b.name));

                            // Get total number of teams
                            const totalTeams = teamsList.length;

                            // Calculate group size - divide teams equally
                            const groupCount = settingsData.groupCount || 2;
                            const teamsPerGroup = Math.ceil(totalTeams / groupCount);

                            // Find this team's index in the alphabetically sorted teams array
                            const teamIndex = teamsList.findIndex(t => t.id === teamData.id);

                            if (teamIndex >= 0) {
                                // Calculate which group this team belongs to
                                const groupIndex = Math.min(Math.floor(teamIndex / teamsPerGroup), groupCount - 1);

                                // Get the appropriate message
                                const groupMessage = settingsData[`groupMessage${groupIndex + 1}`] ||
                                    "Congratulations! You've completed all challenges.";

                                setSubmitResult({
                                    success: true,
                                    message: groupMessage,
                                    isCustomGroupMessage: true
                                });
                                setAllCompleted(true);
                                return;
                            }
                        }

                        // Default message if team grouping is disabled or error
                        setSubmitResult({
                            success: true,
                            message: "Congratulations! You've completed all challenges. "
                        });
                        setAllCompleted(true);
                        // setTimeout(() => {
                        //     exitFullscreen();
                        //     navigate('/home');
                        // }, 5000);

                    } catch (error) {
                        console.error("Error checking team group:", error);
                        // Fall back to default message
                        setSubmitResult({
                            success: true,
                            message: "Congratulations! You've completed all challenges. Redirecting to home page..."
                        });
                        setAllCompleted(true);
                        setTimeout(() => {
                            exitFullscreen();
                            navigate('/home');
                        }, 5000);
                    }
                }
            }
        };

        checkCompletionStatus();
    }, [teamData?.solvedChallenges, challenges, submitResult, navigate]);

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
                // console.log("Settings document exists:", settingsDoc.exists());
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    // console.log("Settings data:", data);
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
                        // setTimeout(() => {
                        //     navigate('/home');
                        // }, 5000); // Redirect after 5 seconds if all challenges are solved
                        return;
                    }
                }

                // If there's a challengeId in the URL, verify it's the current accessible challenge
                if (challengeId) {
                    // Find the challenge in the sorted list
                    const challengeIndex = challengesList.findIndex(c => c.id === challengeId);

                    // Check if challenge has already been attempted but not solved
                    const isAttempted = teamData?.attemptedChallenges?.includes(challenge.id) &&
                        !teamData?.solvedChallenges?.includes(challenge.id);

                    // Check if challenge was locked due to tab switches
                    const wasLockedDueToTabSwitches = teamData?.challengeAttempts?.[challenge.id]?.lockedDueToTabSwitches;

                    if (isAttempted) {
                        if (wasLockedDueToTabSwitches) {
                            alert("You've exceeded the maximum tab switches for this challenge. It is now locked.");
                        } else {
                            alert("You've already attempted this challenge and cannot access it again.");
                        }
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
    // useEffect(() => {
    //     const checkFinalistStatus = async () => {
    //         if (!teamData || !challenges.length) return;

    //         try {
    //             // Get finalist count
    //             const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
    //             if (settingsDoc.exists()) {
    //                 const settingsData = settingsDoc.data();
    //                 const finalistCount = settingsData.finalistCount || 1;

    //                 // Check completed teams
    //                 const teamsRef = collection(db, "teams");
    //                 const teamsSnapshot = await getDocs(teamsRef);

    //                 // Get teams that have finished all challenges
    //                 const completedTeams = teamsSnapshot.docs
    //                     .filter(doc => {
    //                         const team = doc.data();
    //                         return team.solvedChallenges?.length >= challenges.length;
    //                     })
    //                     .map(doc => ({ id: doc.id, ...doc.data() }));

    //                 // console.log("Completed teams:", completedTeams.length, "Finalist count:", finalistCount);
    //                 // console.log("Current team is finalist:", completedTeams.some(team => team.id === teamData.id));

    //                 // If enough teams have finished and this team isn't among them, redirect
    //                 // if (completedTeams.length >= finalistCount &&
    //                 //     !completedTeams.some(team => team.id === teamData.id)) {
    //                 //     setSubmitResult({
    //                 //         success: false,
    //                 //         message: "The competition has been completed by other teams."
    //                 //     });

    //                 //     setTimeout(() => {
    //                 //         navigate('/home');
    //                 //     }, 6000);
    //                 // }
    //             }
    //         } catch (error) {
    //             console.error("Error checking finalist status:", error);
    //         }
    //     };

    //     checkFinalistStatus();
    // }, [teamData, challenges, navigate]);

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
        if (!selectedChallenge) return;

        const cleanedFlag = flagSubmission.trim().toLowerCase().replace(/\s+/g, '');

        if (!cleanedFlag) {
            setSubmitResult({
                success: false,
                message: "Please enter a valid flag."
            });
            return;
        }

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
            const flagMatches = await bcrypt.compare(cleanedFlag, selectedChallenge.flagHash);

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

                    // Modify the flag submission handler around line ~1090 (in the flag match success section)
                    if (allSolved) {
                        try {


                            // First check if the team is already a finalist
                            if (teamData.isFinalist) {
                                console.log("User is already a finalist, redirecting to finalist waiting page");
                                setSubmitResult({
                                    success: true,
                                    message: "You've already qualified as a finalist. Redirecting..."
                                });
                                
                                setTimeout(() => {
                                    exitFullscreen();
                                    navigate('/finalist-waiting');
                                }, 3000);
                                return;
                            }
                            // Update team's
                            // 
                            //  completedAt time if it doesn't exist yet
                            if (!teamData.completedAt) {
                                await updateDoc(teamRef, {
                                    completedAt: new Date(),
                                });
                            }

                            // Success message
                            setSubmitResult({
                                success: true,
                                message: "Congratulations! You've completed all challenges. Redirecting to message page..."
                            });

                            // Redirect to the matchers page after a delay
                            setTimeout(() => {
                                exitFullscreen();
                                navigate('/matchers');
                            }, 5000);

                            return;
                        } catch (error) {
                            console.error("Error processing completion:", error);
                            // Fall back to home on error
                            setSubmitResult({
                                success: true,
                                message: "Error processing completion. Redirecting to home page..."
                            });
                            setTimeout(() => {
                                exitFullscreen();
                                navigate('/home');
                            }, 5000);
                        }
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
            <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">DECRYPTING FILES</h2>
                    <p className="text-yellow-200/80">Accessing secure CID database...</p>
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
    // Update the allCompleted view to match Home page style

    if (allCompleted) {
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
                            🚧 CRIME SCENE — DO NOT CROSS — POLICE AREA — CID TEAM ON INVESTIGATION 🚨
                        </span>
                    </div>
                    <div className="cid-ribbon ribbon-2">
                        <span className="cid-text">
                            🚧 CRIME SCENE — DO NOT CROSS — POLICE AREA — CID TEAM ON INVESTIGATION 🚨
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
                        <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">CASE CLOSED!</h1>
                        <Link
                            to="/home"
                            className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                        >
                            Return to HQ
                        </Link>
                    </div>

                    <div className="border-2 border-yellow-400 rounded-lg overflow-hidden bg-zinc-900/90 relative p-8 text-center">
                        <div className="absolute top-2 left-2 flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                            <span className="text-xs font-bold bg-black/80 px-1 py-0.5 rounded text-yellow-400">CASE COMPLETED</span>
                        </div>

                        <div className="w-20 h-20 mx-auto mb-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                            <svg className="h-12 w-12 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 tracking-wider">MISSION ACCOMPLISHED</h2>
                        <p className="text-lg text-yellow-100 mb-4">
                            All evidence collected and case file complete.
                        </p>
                        <p className="text-md text-yellow-200 mb-6">
                            Intelligence points accumulated: <span className="font-bold">{teamData?.score || 0}</span>
                        </p>

                        {/* Display the custom group message instead of the default message
                        {submitResult && submitResult.isCustomGroupMessage ? (
                            <div className="mt-4 text-lg font-medium text-white border-t pt-4 border-yellow-400/30">
                                {submitResult.message}
                            </div>
                        ) : (
                            <div className="animate-pulse text-sm text-yellow-400">
                                Redirecting to headquarters...
                            </div>
                        )} */}

                        <Link
                            to="/matchers"
                            className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                        >
                            Go to Flag verification page
                        </Link>

                        <div className="border-t border-yellow-400/30 mt-6 pt-3 px-6 text-xs text-yellow-400/80 font-mono flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                <span>CONFIDENTIAL</span>
                            </div>
                            <div className="text-center">
                                {/* <div className="text-yellow-400">🕵️‍♂️ CASE OFFICER: DIRECTOR SMITH</div> */}
                                <div className="text-gray-400">LAST UPDATED: {new Date().toLocaleDateString()}</div>
                            </div>
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



    // Display the current challenge
    return (
        <div ref={fullscreenRef}
            className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono"
            style={{
                overflow: 'auto',
                height: '100vh',
                position: 'relative'
            }}
        >
            {/* Fullscreen exit button - only show when in fullscreen */}
            {selectedChallenge && isFullscreen && (
                <div className="fixed top-24 right-5 z-50">
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
                        setShowExitDialog(false);
                        reenterFullscreenWithoutReset();
                    }}
                    onExit={() => {
                        markChallengeAsAttempted(selectedChallenge.id);
                        setShowExitDialog(false);
                        setTimeout(() => {
                            setIsSubmitting(true);
                            exitFullscreen();
                            navigate('/home');
                        }, 100);
                    }}
                />
            )}

            {selectedChallenge && !isFullscreen && (
                <div className="fixed bottom-5 right-5 z-50">
                    <button
                        onClick={enterFullscreen}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-full shadow-lg flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Enter Fullscreen Mode
                    </button>
                </div>
            )}

            {/* Header with glowing effect like in Home page - updated to yellow theme */}
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

                    <div className="flex items-center space-x-4">
                        {/* Tab Switch Counter - Always show when a challenge is selected */}
                        {selectedChallenge && (
                            <div className="flex items-center text-white bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-red-400/30">
                                <span className="mr-2 font-medium text-red-400">Tab Switches:</span>
                                <span className="px-3 py-0.5 bg-red-500 text-white text-sm font-bold rounded-full">
                                    {tabSwitchCount}
                                </span>
                            </div>
                        )}

                        {/* Score Counter */}
                        {teamData && (
                            <div className="flex items-center text-white bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-yellow-400/30">
                                <span className="mr-2 font-medium text-yellow-400">Score:</span>
                                <span className="px-3 py-0.5 bg-yellow-400 text-black text-sm font-bold rounded-full">
                                    {teamData.score || 0}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">
                        {selectedChallenge ? `CASE FILE #${currentChallengeIndex + 1}` : "INVESTIGATION FILES"}
                        {selectedChallenge && (
                            <span className="ml-2 text-sm text-red-400">
                                (FULLSCREEN MODE - TAB SWITCHES MONITORED)
                            </span>
                        )}
                    </h1>
                    <div className="flex space-x-2">
                        {!selectedChallenge && (
                            <Link
                                to="/home"
                                className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                            >
                                Return to HQ
                            </Link>
                        )}
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg shadow-sm mb-6 border border-yellow-400/20">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-200">INVESTIGATION PROGRESS</span>
                        <span className="text-sm font-medium text-yellow-300">
                            {teamData?.solvedChallenges?.length || 0} / {challenges.length} SOLVED
                        </span>
                    </div>
                    <div className="relative pt-1">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-black/50">
                            <div
                                style={{
                                    width: `${((teamData?.solvedChallenges?.length || 0) * 100) / challenges.length}%`
                                }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Current Challenge */}
                {selectedChallenge && (
                    <div className="bg-black/30 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden border border-yellow-400/20">
                        {/* Challenge header */}
                        <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">{selectedChallenge.title}</h2>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg text-yellow-300 font-medium">
                                        {selectedChallenge.points} pts
                                    </span>
                                    <span className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg text-yellow-300 font-medium">
                                        {selectedChallenge.category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Challenge content */}
                        <div className="p-6">
                            {/* Description at the top */}
                            <div className="prose max-w-none mb-8 text-gray-300">
                                <p>{selectedChallenge.description}</p>
                            </div>

                            {/* Two-column layout for image and interaction elements */}
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left column: Image (if exists) */}
                                {selectedChallenge.imageUrl && (
                                    <div className="md:w-1/2 flex items-start justify-center">
                                        <img
                                            src={selectedChallenge.imageUrl}
                                            alt={selectedChallenge.title}
                                            className="rounded-lg border border-yellow-400/20 shadow-sm"
                                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}

                                {/* Right column: Hint and Submit form */}
                                <div className={`${selectedChallenge.imageUrl ? 'md:w-1/2' : 'w-full'}`}>
                                    {/* Hint with collapsible display */}
                                    {selectedChallenge.hint && (
                                        <div className="mb-6">
                                            <details className="bg-black/40 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                                <summary className="font-medium text-yellow-300 cursor-pointer">
                                                    CID INTEL BRIEFING
                                                </summary>
                                                <div className="mt-2">
                                                    <p className="text-sm text-yellow-200">
                                                        {selectedChallenge.hint}
                                                    </p>
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    {/* Check if challenge is already solved */}
                                    {teamData?.solvedChallenges?.includes(selectedChallenge.id) ? (
                                        <div className="bg-black/40 border-l-4 border-green-400 p-4 rounded-r-lg">
                                            <div className="flex items-center">
                                                <svg className="h-5 w-5 text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <p className="text-green-300 font-medium">
                                                    EVIDENCE COLLECTED - CASE FILE CLOSED
                                                </p>
                                            </div>

                                            {/* Show button to next unsolved challenge if available */}
                                            {currentChallengeIndex < challenges.length - 1 && isChallengeAccessible(currentChallengeIndex + 1, teamData.solvedChallenges, challenges) && (
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        onClick={() => navigateToChallenge(currentChallengeIndex + 1)}
                                                        className="inline-flex items-center px-4 py-2 border border-yellow-400 text-sm font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                                                    >
                                                        NEXT CASE FILE
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="font-medium text-yellow-400 mb-3">SUBMIT EVIDENCE</h3>
                                            <form onSubmit={handleSubmitFlag}>
                                                <div className="flex items-center">
                                                    <input
                                                        type="text"
                                                        value={flagSubmission}
                                                        onChange={e => setFlagSubmission(e.target.value)}
                                                        className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block w-full bg-black/70 border border-yellow-400/30 text-white rounded-md py-4 px-3"
                                                        placeholder="Enter flag"
                                                        required
                                                        disabled={submitLoading}
                                                    />
                                                    <button
                                                        type="submit"
                                                        className={`ml-3 inline-flex items-center px-4 py-4 border border-transparent text-sm font-medium rounded-md shadow-sm ${submitLoading ? "bg-gray-600 text-gray-300" : "bg-yellow-400 hover:bg-yellow-500 text-black"
                                                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400`}
                                                        disabled={submitLoading}
                                                    >
                                                        {submitLoading ? (
                                                            <>
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                PROCESSING...
                                                            </>
                                                        ) : (
                                                            "SUBMIT EVIDENCE"
                                                        )}
                                                    </button>
                                                </div>
                                            </form>

                                            {submitResult && (
                                                <div className={`mt-3 p-3 rounded-md ${submitResult.success ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                                                    <p className={`text-sm flex items-center ${submitResult.success ? 'text-green-300' : 'text-red-300'}`}>
                                                        {submitResult.success ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        {submitResult.message}
                                                    </p>

                                                    {/* Only show redirecting message if it contains "Redirecting" AND is not a custom group message */}
                                                    {submitResult.success && submitResult.message.includes("Redirecting") && !submitResult.isCustomGroupMessage && (
                                                        <div className="mt-2 text-center">
                                                            <div className="animate-pulse text-sm text-green-400">
                                                                REDIRECTING TO HEADQUARTERS...
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Challenge Navigation - only show solved challenges */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium text-yellow-400 mb-4">CASE FILES</h3>
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
                        ${isCurrent ? 'ring-2 ring-offset-2 ring-yellow-400 ' : ''}
                        ${isSolved
                                            ? 'bg-green-900/50 text-green-300 border border-green-500/50'
                                            : isAttempted
                                                ? 'bg-red-900/50 text-red-300 border border-red-500/50 cursor-not-allowed'
                                                : isAccessible
                                                    ? 'bg-black/50 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-800/30'
                                                    : 'bg-black/50 text-gray-500 border border-gray-700/50 cursor-not-allowed'
                                        }`}
                                    title={isAccessible
                                        ? isAttempted
                                            ? "FILE COMPROMISED"
                                            : challenge.title
                                        : "CLASSIFIED - ACCESS DENIED"}
                                >
                                    {isSolved ? (
                                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : isAttempted ? (
                                        <svg className="h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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

                    {/* Police tape decoration at bottom */}
                    <div className="mt-10 relative overflow-hidden py-4">
                        <div className="cid-ribbon-small" style={{
                            background: 'repeating-linear-gradient(45deg, yellow, yellow 10px, black 10px, black 20px)',
                            height: '15px',
                            width: '100%',
                            opacity: 0.8
                        }}></div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Challenges;