import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Finalists = () => {
    const [finalists, setFinalists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [sortBy, setSortBy] = useState('rank'); // Default sort by completion rank

    // Fetch finalists data on component mount
    useEffect(() => {
        const fetchFinalists = async () => {
            try {
                setLoading(true);
                
                // Get finalists
                const finalistsRef = collection(db, "finalists");
                const finalistsQuery = query(finalistsRef, orderBy("verifiedAt", "asc"));
                const finalistsSnapshot = await getDocs(finalistsQuery);

                // Get round1_checks tokens that have been used
                const tokensRef = collection(db, "round1_checks");
                const usedTokensQuery = query(tokensRef, where("used", "==", true));
                const tokensSnapshot = await getDocs(usedTokensQuery);
                
                const tokensData = tokensSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setTokens(tokensData);
                
                // Map finalists with team data
                const finalistsData = finalistsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    verifiedAt: doc.data().verifiedAt?.toDate()
                }));
                
                // Sort finalists based on the selected sort option
                sortFinalists(finalistsData, sortBy);
                
            } catch (err) {
                console.error("Error fetching finalists:", err);
                setError("Failed to load finalists data");
            } finally {
                setLoading(false);
            }
        };

        fetchFinalists();
    }, [sortBy]);

    const sortFinalists = (data, sortMethod) => {
        let sortedData;
        
        switch(sortMethod) {
            case 'rank':
                sortedData = [...data].sort((a, b) => a.completionRank - b.completionRank);
                break;
            case 'score':
                sortedData = [...data].sort((a, b) => b.score - a.score);
                break;
            case 'time':
                sortedData = [...data].sort((a, b) => 
                    a.verifiedAt && b.verifiedAt ? a.verifiedAt - b.verifiedAt : 0
                );
                break;
            case 'name':
                sortedData = [...data].sort((a, b) => 
                    a.teamName?.localeCompare(b.teamName)
                );
                break;
            default:
                sortedData = data;
        }
        
        setFinalists(sortedData);
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    const handleRemoveFinalist = async (finalistId) => {
        if (!window.confirm("Are you sure you want to remove this finalist? This cannot be undone.")) {
            return;
        }

        try {
            // Get the finalist data first
            const finalistToRemove = finalists.find(f => f.id === finalistId);
            
            // Delete from finalists collection
            await deleteDoc(doc(db, "finalists", finalistId));
            
            // Update team record if we have the team ID
            if (finalistToRemove?.teamId) {
                const teamRef = doc(db, "teams", finalistToRemove.teamId);
                await updateDoc(teamRef, {
                    isFinalist: false,
                    finalistVerifiedAt: null,
                    tokenUsed: null
                });
            }
            
            // Find and update the token if we can match it
            if (finalistToRemove?.tokenNumber) {
                const matchingToken = tokens.find(t => t.originalNumber === finalistToRemove.tokenNumber);
                if (matchingToken) {
                    const tokenRef = doc(db, "round1_checks", matchingToken.id);
                    await updateDoc(tokenRef, {
                        used: false,
                        usedBy: null,
                        usedByName: null,
                        usedAt: null
                    });
                }
            }
            
            // Update UI
            setFinalists(finalists.filter(f => f.id !== finalistId));
            alert("Finalist removed successfully");
            
        } catch (err) {
            console.error("Error removing finalist:", err);
            alert("Failed to remove finalist: " + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white p-6 shadow rounded-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Phase 2 Finalists</h2>
                
                <div className="flex items-center">
                    <label htmlFor="sortBy" className="mr-2 text-sm text-gray-600">Sort by:</label>
                    <select 
                        id="sortBy" 
                        value={sortBy}
                        onChange={handleSortChange}
                        className="border border-gray-300 rounded-md shadow-sm py-1 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="rank">Completion Rank</option>
                        <option value="score">Score</option>
                        <option value="time">Verification Time</option>
                        <option value="name">Team Name</option>
                    </select>
                </div>
            </div>

            {finalists.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No teams have verified for Phase 2 yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rank
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Team Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Team Lead
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Score
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Token #
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Verified At
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {finalists.map((finalist, index) => {
                                // Determine row styling based on rank
                                let rowClass = "";
                                if (index === 0) rowClass = "bg-yellow-50"; // 1st place
                                else if (index === 1) rowClass = "bg-gray-50"; // 2nd place
                                else if (index === 2) rowClass = "bg-orange-50"; // 3rd place
                                
                                return (
                                    <tr key={finalist.id} className={rowClass}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{finalist.completionRank || index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {finalist.teamName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {finalist.teamEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {finalist.teamLead}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {finalist.score || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {finalist.tokenNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {finalist.verifiedAt ? new Date(finalist.verifiedAt).toLocaleString() : "Unknown"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleRemoveFinalist(finalist.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Token Usage Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-800 font-medium">Total Finalists</p>
                        <p className="text-3xl font-bold text-blue-900">{finalists.length}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-medium">Used Tokens</p>
                        <p className="text-3xl font-bold text-green-900">{tokens.filter(t => t.used).length}</p>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 font-medium">Average Score</p>
                        <p className="text-3xl font-bold text-yellow-900">
                            {finalists.length > 0 
                                ? Math.round(finalists.reduce((sum, finalist) => sum + (finalist.score || 0), 0) / finalists.length) 
                                : 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Finalists;