import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../components/card";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import L2 from "../assets/l2.png";
import L3 from "../assets/l3.png";
import L4 from "../assets/l4.png";

const Leaderboard = () => {
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [avatars, setAvatars] = useState({});

    // Fetch team data from Firestore, same as Home page
    useEffect(() => {
        const fetchLeaderboardData = async () => {
            try {
                setLoading(true);
                const teamsRef = collection(db, "teams");
                const teamsSnapshot = await getDocs(teamsRef);

                if (teamsSnapshot.empty) {
                    setTeams([]);
                    return;
                }

                const teamsList = teamsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        username: data.name || "Unknown Team",
                        name: data.name || "Unknown Team",
                        volume: data.score || 0,
                        leader: {
                            name: data.teamLead || "Unknown Lead",
                            email: data.email || "unknown@example.com"
                        },
                        members: data.members || [],
                        solvedChallenges: data.solvedChallenges || []
                    };
                });

                // Sort by score (highest first)
                const sortedTeams = teamsList.sort((a, b) => b.volume - a.volume);
                setTeams(sortedTeams);

                // Fetch avatars for each team
                const teamIds = sortedTeams.map(team => team.id);
                fetchAvatars(teamIds);

            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
                setTeams([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, []);

    // Function to fetch random avatars from an API
    const fetchAvatars = async (teamIds) => {
        try {
            // Map each team to a random avatar
            const avatarMap = {};

            // Use Promise.all to fetch all avatars in parallel
            await Promise.all(teamIds.map(async (id) => {
                // Generate a random seed for each team to ensure different images
                const seed = Math.floor(Math.random() * 1000);

                // Using Unsplash Source API to get random tech-related images
                // Alternative APIs: RoboHash, DiceBear, or UI Avatars
                avatarMap[id] = `https://source.unsplash.com/random/200x200/?tech,hacker&sig=${id}${seed}`;
            }));

            setAvatars(avatarMap);
        } catch (error) {
            console.error("Error fetching avatars:", error);
            // Fallback to default avatars if API fails
            const defaultAvatarMap = {};
            teamIds.forEach(id => {
                defaultAvatarMap[id] = L4; // Default fallback avatar
            });
            setAvatars(defaultAvatarMap);
        }
    };

    const openTeamDetails = (team) => {
        setSelectedTeam(team);
    };

    const closeTeamDetails = () => {
        setSelectedTeam(null);
    };

    // Helper function to get team avatar
    const getTeamAvatar = (team) => {
        if (avatars[team.id]) {
            return avatars[team.id];
        }
        // Fallback to local avatars based on score
        return team.volume > 85 ? L3 : team.volume > 70 ? L2 : L4;
    };

    return (
        <div className="bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono">
            {/* Container with reduced height to eliminate blank space */}
            <div className="relative min-h-[50vh] px-4 pt-10 overflow-hidden">
                {/* Animated ribbons positioned to overlap with the content */}
                <div className="cid-ribbon ribbon-1">
                    <span className="cid-text">
                        🚧 CRIME SCENE — DO NOT CROSS — POLICE AREA — CID TEAM ON INVESTIGATION 🚨
                    </span>
                </div>
                <div className="cid-ribbon ribbon-2">
                    <span className="cid-text">
                        🚔 INVESTIGATION UNDERWAY — STAY BACK — EVIDENCE SEALED — CRIME ZONE ⚠️
                    </span>
                </div>

                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-yellow-400 text-center tracking-widest mb-3">
                        CID OPERATIONS: LEADERBOARD
                    </h1>
                    <p className="text-gray-400 mb-8 max-w-2xl text-center mx-auto text-base">
                        ⚠️ <span className="italic">Top Cyber Crime Detectives</span> - cracked bugs, solved mysteries, decoded anomalies & hunted threats. Review classified scores below.
                    </p>
                    <div className="w-full h-2 bg-yellow-400 mb-8 rotate-1 shadow-md" />

                    {/* We're removing the top 3 team cards as requested */}

                    <div className="w-full h-2 bg-yellow-400 mt-8 -rotate-1 shadow-md" />
                </div>

                <style jsx>{`
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
            </div>

            {/* Connect directly without gap between header and table */}
            <div className="relative px-4 lg:px-24 pb-20 -mt-20">
                <div className="relative z-10 bg-gradient-to-b from-transparent to-zinc-900 pb-10">
                    <div className="flex items-center justify-center mb-6 relative">
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-yellow-400/30"></div>
                        <div className="h-10 bg-yellow-400 text-black px-6 py-2 text-sm font-extrabold border-2 border-black flex items-center justify-center rotate-[-2deg] relative z-10 shadow-lg">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-yellow-800">
                                🚨 CLASSIFIED INVESTIGATION RECORDS - EYES ONLY 🚨
                            </span>
                        </div>
                    </div>
                    <div className="border-2 border-yellow-400 rounded-lg overflow-hidden bg-zinc-900/90 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2IiBoZWlnaHQ9IjYiPgo8cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjMTgxODE4Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMNiA2TTYgMEwwIDYiIHN0cm9rZT0iIzFmMWYxZiIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')]">
                        <div className="absolute top-2 left-2 flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                            <span className="text-xs font-bold bg-black/80 px-1 py-0.5 rounded text-yellow-400">ACTIVE CASE</span>
                        </div>
                        <div className="border-b border-yellow-400/30 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600"></div>
                            <h2 className="text-2xl text-yellow-400 font-extrabold text-center py-4 tracking-wider relative">
                                <span className="bg-black px-4 py-1 rounded-lg border border-yellow-400/50 shadow-lg">
                                    INVESTIGATION DOSSIER: TEAMS PERFORMANCE METRICS
                                </span>
                            </h2>
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="flex items-center bg-black/80 px-2 py-1 rounded border border-yellow-400/30">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                    <span className="text-xs text-yellow-400 font-mono">LIVE DATA</span>
                                </div>
                            </div>
                        </div>

                        {/* Loading state */}
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
                                <p className="text-yellow-400">Decrypting intelligence data...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto text-left text-sm text-gray-200 font-mono">
                                    <thead>
                                        <tr className="bg-zinc-800/80 text-yellow-400 text-sm border-b border-yellow-400/20">
                                            <th className="px-6 py-3 border-r border-yellow-400/20">CASE #</th>
                                            <th className="px-6 py-3 border-r border-yellow-400/20">OPERATIVE TEAM</th>
                                            <th className="px-6 py-3 border-r border-yellow-400/20">ID CODE</th>
                                            <th className="px-6 py-3">THREAT NEUTRALIZED</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teams.map((team, index) => (
                                            <tr
                                                key={team.id}
                                                className="border-b border-yellow-400/10 hover:bg-zinc-800/60 transition-all duration-200 group relative"
                                            >
                                                <td className="px-6 py-4 border-r border-yellow-400/10 group-hover:text-yellow-300 relative">
                                                    <div className="flex items-center">
                                                        <span className="font-bold">{index + 1}</span>
                                                        {index < 3 && (
                                                            <span className="ml-2 text-xs bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded">
                                                                {index === 0 ? 'PRIORITY ALPHA' : index === 1 ? 'PRIORITY BETA' : 'PRIORITY GAMMA'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 border-r border-yellow-400/10 cursor-pointer hover:text-yellow-400 font-medium group-hover:underline"
                                                    onClick={() => openTeamDetails(team)}
                                                >
                                                    <div className="flex items-center">
                                                        {/* <div className="relative mr-3">
                                                            <img
                                                                src={getTeamAvatar(team)}
                                                                alt={team.name}
                                                                className="w-8 h-8 rounded-full object-cover border border-yellow-400/50"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = team.volume > 85 ? L3 : team.volume > 70 ? L2 : L4;
                                                                }}
                                                            />
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border border-black"></div>
                                                        </div> */}
                                                        <div>
                                                            <div className="font-bold">{team.name}</div>
                                                            <div className="text-xs text-gray-400">Leader: {team.leader.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-r border-yellow-400/10 group-hover:text-yellow-300 text-yellow-400/80">
                                                    <span className="bg-black/50 px-2 py-1 rounded">#{team.id}</span>
                                                </td>
                                                <td className="px-6 py-4 group-hover:text-green-300">
                                                    <div className="flex items-center">
                                                        <span className="text-green-400 font-bold mr-2 whitespace-nowrap">🧠 {team.volume}</span>
                                                        <div className="flex-1 bg-zinc-700 rounded-full h-1.5 max-w-[100px]">
                                                            <div
                                                                className="bg-green-500 h-1.5 rounded-full"
                                                                style={{ width: `${Math.min((team.volume / 100) * 100, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="border-t border-yellow-400/30 py-3 px-6 text-xs text-yellow-400/80 font-mono flex justify-between items-center bg-black/30">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                <span>CONFIDENTIAL</span>
                            </div>
                            <div className="text-center">
                                <div className="text-yellow-400">🕵️‍♂️ CASE OFFICER: OSC HQ</div>
                                <div className="text-gray-400">LAST UPDATED: {new Date().toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center">
                                <span>ACCESS LEVEL: </span>
                                <span className="ml-1 bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">TOP SECRET</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedTeam && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
                    onClick={closeTeamDetails}
                >
                    <div
                        className="bg-zinc-800 p-6 rounded-lg text-white w-3/4 max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                            Team: {selectedTeam.name} - #{selectedTeam.id}
                        </h2>
                        <div className="flex items-center mb-4">
                            <div className="mr-4">
                                <img
                                    src={getTeamAvatar(selectedTeam)}
                                    alt={selectedTeam.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = selectedTeam.volume > 85 ? L3 : selectedTeam.volume > 70 ? L2 : L4;
                                    }}
                                />
                            </div>
                            <p className="text-lg"><span className="font-semibold">Leader:</span> {selectedTeam.leader.name} ({selectedTeam.leader.email})</p>
                        </div>

                        {selectedTeam.members && selectedTeam.members.length > 0 ? (
                            <>
                                <h3 className="text-xl font-semibold text-yellow-400 mb-2">Team Members:</h3>
                                <ul className="list-disc pl-6">
                                    {selectedTeam.members.map((member, index) => (
                                        <li key={index} className="mb-1">
                                            <span className="font-semibold">{member.name}</span> ({member.email})
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p className="text-gray-400 italic">No additional team members registered</p>
                        )}

                        <div className="mt-4">
                            <p><span className="font-semibold">Total Points:</span> 🧠 {selectedTeam.volume}</p>
                            <p><span className="font-semibold">Challenges Completed:</span> {selectedTeam.solvedChallenges?.length || 0}</p>
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                className="bg-yellow-400 text-black py-2 px-6 rounded-full"
                                onClick={closeTeamDetails}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-center text-xs text-gray-600 mt-2 pb-10">
                All data is protected under CID Operations & Cyber Crime Division © 2025
            </p>
        </div>
    );
};

export default Leaderboard;