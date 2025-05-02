import React, { useState } from "react";
import { Card, CardContent } from "../components/card";
import L2 from "../assets/l2.png";
import L3 from "../assets/l3.png";
import L4 from "../assets/l4.png";

const Leaderboard = () => {
    const [selectedTeam, setSelectedTeam] = useState(null);
    const openTeamDetails = (team) => {
        setSelectedTeam(team);
    };
    const closeTeamDetails = () => {
        setSelectedTeam(null);
    };
    const leaderboardData = [
        {
            id: 1,
            username: "agent_mystic",
            volume: 98,
            avatar: L3,
            position: "center",
            rank: 1,
            leader: { name: "Agent Mystic", email: "agentmystic@email.com" },
            members: [
                { name: "Shadow Hawk", email: "shadowhawk@email.com" },
                { name: "Code Cracker", email: "codecracker@email.com" },
            ]
        },
        {
            id: 2,
            username: "shadow_hawk",
            volume: 92,
            avatar: L2,
            position: "left",
            rank: 2,
            leader: { name: "Shadow Hawk", email: "shadowhawk@email.com" },
            members: [
                { name: "Agent Mystic", email: "agentmystic@email.com" },
                { name: "Code Cracker", email: "codecracker@email.com" },
            ]
        },
        {
            id: 3,
            username: "code_cracker",
            volume: 88,
            avatar: L4,
            position: "right",
            rank: 3,
            leader: { name: "Code Cracker", email: "codecracker@email.com" },
            members: [
                { name: "Agent Mystic", email: "agentmystic@email.com" },
                { name: "Shadow Hawk", email: "shadowhawk@email.com" },
            ]
        },
        {
            id: 4,
            username: "cyber_sentinel",
            volume: 85,
            avatar: L2,
            rank: 4,
            leader: { name: "Cyber Sentinel", email: "cybersentinel@email.com" },
            members: [
                { name: "Data Guardian", email: "dataguardian@email.com" },
                { name: "Firewall Phantom", email: "firewallphantom@email.com" },
            ]
        },
        {
            id: 5,
            username: "binary_hunter",
            volume: 82,
            avatar: L3,
            rank: 5,
            leader: { name: "Binary Hunter", email: "binaryhunter@email.com" },
            members: [
                { name: "Hex Master", email: "hexmaster@email.com" },
                { name: "Debug Ninja", email: "debugninja@email.com" },
            ]
        },
        {
            id: 6,
            username: "encryptor",
            volume: 78,
            avatar: L4,
            rank: 6,
            leader: { name: "The Encryptor", email: "encryptor@email.com" },
            members: [
                { name: "Cipher Queen", email: "cipherqueen@email.com" },
                { name: "Key Master", email: "keymaster@email.com" },
            ]
        },
        {
            id: 7,
            username: "firewall_phoenix",
            volume: 75,
            avatar: L2,
            rank: 7,
            leader: { name: "Firewall Phoenix", email: "firewallphoenix@email.com" },
            members: [
                { name: "Ash Reborn", email: "ashreborn@email.com" },
                { name: "Flame Guardian", email: "flameguardian@email.com" },
            ]
        }
    ];
    const topTeams = leaderboardData.slice(0, 3);
    const getPositionStyles = (position) => {
        switch (position) {
            case "center":
                return "order-2 -translate-y-4 z-30";
            case "left":
                return "order-1 z-20";
            case "right":
                return "order-3 z-10";
            default:
                return "";
        }
    };
    const getRankGlowStyle = (rank) => {
        switch (rank) {
            case 1:
                return "hover:shadow-[0_0_40px_5px_rgba(255,215,0,0.6)]";
            case 2:
                return "hover:shadow-[0_0_40px_5px_rgba(192,192,192,0.6)]";
            case 3:
                return "hover:shadow-[0_0_40px_5px_rgba(205,127,50,0.6)]";
            default:
                return "";
        }
    };
    return (
        <div className="bg-gradient-to-br from-black via-zinc-900 to-black text-white font-mono">
            <div className="relative min-h-[80vh] px-4 pt-10 overflow-hidden">
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
                    <p className="text-gray-400 mb-12 max-w-2xl text-center mx-auto text-base">
                        ⚠️ <span className="italic">Top Cyber Crime Detectives</span> - cracked bugs, solved mysteries, decoded anomalies & hunted threats. Review classified scores below.
                    </p>
                    <div className="w-full h-2 bg-yellow-400 mb-10 rotate-1 shadow-md" />
                    <div className="flex justify-center items-end gap-10 relative z-20 mb-20">
                        {topTeams.map((user) => (
                            <div
                                key={user.id}
                                className={`w-64 h-80 relative p-1 transition-transform duration-300 ${getPositionStyles(
                                    user.position
                                )} ${getRankGlowStyle(user.rank)}`}
                            >
                                <Card className="bg-zinc-800 border border-yellow-300 rounded-2xl h-full flex flex-col items-center justify-center shadow-2xl relative">
                                    <div className="absolute -top-5 -right-5 bg-yellow-400 text-black rounded-full px-4 py-1 text-sm font-extrabold border-2 border-black z-50 shadow-md">
                                        #{user.rank}
                                    </div>
                                    <div className="absolute top-2 left-2 text-red-600 text-xs font-extrabold rotate-[-15deg]">
                                        🕵️ CONFIDENTIAL
                                    </div>
                                    <CardContent className="flex flex-col items-center justify-center h-full">
                                        <div className="flex flex-col items-start space-y-3">
                                            <img
                                                src={user.avatar}
                                                alt={user.username}
                                                className="w-24 h-24 rounded-full object-cover shadow-lg"
                                            />
                                            <div className="mt-1">
                                                <h3 className="text-xs text-gray-300">TEAM NAME</h3>
                                                <p className="text-white text-lg font-bold tracking-wider">
                                                    {user.username}
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-xs text-gray-300">TEAM ID</h3>
                                                <p className="text-yellow-300 text-lg font-semibold">#{user.id}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-xs text-gray-300">TOTAL POINTS</h3>
                                                <p className="text-green-400 text-2xl font-black">
                                                    {user.volume}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                    <div className="w-full h-2 bg-yellow-400 mt-12 -rotate-1 shadow-md" />
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
                        top: 30%;
                        left: -100%;
                        transform: rotate(-25deg);
                        animation: scroll-left 30s linear infinite;
                    }

                    .ribbon-2 {
                        bottom: 25%;
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
            <div className="relative px-4 lg:px-24 pb-20">
                <div className="relative z-20 bg-gradient-to-b from-transparent to-zinc-900 pt-32 pb-10 -mb-32">
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
                                    {leaderboardData.map((user, index) => (
                                        <tr
                                            key={user.id}
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
                                                onClick={() => openTeamDetails(user)}
                                            >
                                                <div className="flex items-center">
                                                    <div className="relative mr-3">
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.username}
                                                            className="w-8 h-8 rounded-full object-cover border border-yellow-400/50"
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border border-black"></div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{user.username}</div>
                                                        <div className="text-xs text-gray-400">Leader: {user.leader.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-yellow-400/10 group-hover:text-yellow-300 text-yellow-400/80">
                                                <span className="bg-black/50 px-2 py-1 rounded">#{user.id}</span>
                                            </td>
                                            <td className="px-6 py-4 group-hover:text-green-300">
                                                <div className="flex items-center">
                                                    <span className="text-green-400 font-bold mr-2">🧠 {user.volume}</span>
                                                    <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                                                        <div
                                                            className="bg-green-500 h-1.5 rounded-full"
                                                            style={{ width: `${(user.volume / 100) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-yellow-400/30 py-3 px-6 text-xs text-yellow-400/80 font-mono flex justify-between items-center bg-black/30">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                <span>CONFIDENTIAL</span>
                            </div>
                            <div className="text-center">
                                <div className="text-yellow-400">🕵️‍♂️ CASE OFFICER: DIRECTOR SMITH</div>
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
                            Team: {selectedTeam.username} - #{selectedTeam.id}
                        </h2>
                        <p className="text-lg mb-2"><span className="font-semibold">Leader:</span> {selectedTeam.leader.name} ({selectedTeam.leader.email})</p>
                        <h3 className="text-xl font-semibold text-yellow-400 mb-2">Team Members:</h3>
                        <ul className="list-disc pl-6">
                            {selectedTeam.members.map((member, index) => (
                                <li key={index} className="mb-1">
                                    <span className="font-semibold">{member.name}</span> ({member.email})
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4">
                            <p><span className="font-semibold">Total Points:</span> 🧠 {selectedTeam.volume}</p>
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