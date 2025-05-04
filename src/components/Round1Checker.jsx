import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import bcrypt from 'bcryptjs';

function Round1Checker({ user }) {
    const [checkerNumber, setCheckerNumber] = useState('');
    const [checkerSaved, setCheckerSaved] = useState(false);
    const [checkerError, setCheckerError] = useState('');
    const [checkerLoading, setCheckerLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [fetchingEntries, setFetchingEntries] = useState(false);

    // Fetch existing entries when component mounts
    useEffect(() => {
        fetchEntries();
    }, []);

    // Function to fetch all entries from the round1_checks collection
    const fetchEntries = async () => {
        setFetchingEntries(true);
        try {
            const entriesQuery = query(collection(db, "round1_checks"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(entriesQuery);

            const entriesData = [];
            querySnapshot.forEach((doc) => {
                entriesData.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                });
            });

            setEntries(entriesData);
        } catch (error) {
            console.error("Error fetching entries:", error);
        } finally {
            setFetchingEntries(false);
        }
    };

    const handleCheckerSubmit = async (e) => {
        e.preventDefault();
        setCheckerLoading(true);
        setCheckerError('');
        setCheckerSaved(false);

        try {
            // Validate input
            const num = parseInt(checkerNumber);
            if (isNaN(num) || num <= 0) {
                setCheckerError('Please enter a valid positive number');
                setCheckerLoading(false);
                return;
            }

            // Hash the number using bcrypt (consistent with other hashing in the app)
            const hashedNumber = await bcrypt.hash(checkerNumber.trim(), 10);

            // Store in Firebase with the used flag set to false initially
            await addDoc(collection(db, "round1_checks"), {
                originalNumber: checkerNumber,
                hashedNumber: hashedNumber,
                used: false, // Initialize as unused
                createdAt: new Date(),
                createdBy: user.email
            });

            // Reset form and show success
            setCheckerNumber('');
            setCheckerSaved(true);

        } catch (error) {
            console.error("Error saving checker hash:", error);
            setCheckerError(`Failed to save: ${error.message}`);
        } finally {
            setCheckerLoading(false);
        }
    };

    // Format date for display
    const formatDate = (date) => {
        if (!date) return "Unknown date";
        return new Date(date).toLocaleString();
    };

    return (
        <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Round 1 Checker</h2>
            <p className="text-gray-600 mb-6">Hash and store verification numbers for Round 1</p>

            {checkerSaved && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Hash successfully saved to round1_checks collection!
                </div>
            )}

            {checkerError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {checkerError}
                </div>
            )}

            <form onSubmit={handleCheckerSubmit} className="space-y-4">
                <div>
                    <label htmlFor="checkerNumber" className="block text-sm font-medium text-gray-700">
                        Enter Number to Hash *
                    </label>
                    <input
                        type="number"
                        id="checkerNumber"
                        value={checkerNumber}
                        onChange={(e) => setCheckerNumber(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter a number"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={checkerLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {checkerLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : "Hash & Save Number"}
                </button>
            </form>

            <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-800 mb-2">How this works</h3>
                <p className="text-sm text-gray-600">
                    This tool securely hashes the entered number with bcrypt and stores it in the database.
                    These hashes can be used for verification purposes in Round 1 of the competition.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                    All entries are stored in the <code className="bg-gray-100 px-1 py-0.5 rounded">round1_checks</code> collection
                    with timestamps and admin attribution.
                </p>
            </div>

            {/* Entries Table */}
            <div className="mt-10">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Stored Entries</h3>

                {fetchingEntries ? (
                    <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : entries.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Original Number
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hashed Value
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created By
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created At
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {entry.originalNumber}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            <div className="overflow-hidden text-ellipsis">
                                                {entry.hashedNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {entry.createdBy || "Unknown"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(entry.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-6 text-center text-gray-500 rounded-md">
                        No entries found. Add your first hashed number above.
                    </div>
                )}
            </div>
        </div>
    );
}

export default Round1Checker;