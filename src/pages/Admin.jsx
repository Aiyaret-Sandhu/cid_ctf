import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import TeamManagement from '../components/TeamManagement';
import Scoreboard from '../components/Scoreboard';
import Settings from '../components/Settings';
import ChallengeManagement from '../components/ChallengeManagement';
import Round1Checker from '../components/Round1Checker';
import Finalists from '../components/Finalists';

function Admin() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminVerified, setAdminVerified] = useState(false);
    const [adminData, setAdminData] = useState(null);
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    const [activeSection, setActiveSection] = useState('dashboard');
    const [teams, setTeams] = useState([]);
    const [teamFormData, setTeamFormData] = useState({
        name: '',
        email: '',
        teamLead: '',
        score: 0
    });
    const [isEditing, setIsEditing] = useState(false);
    const [currentTeamId, setCurrentTeamId] = useState(null);
    const [formError, setFormError] = useState('');
    const [teamsLoading, setTeamsLoading] = useState(false);

    const [scoreboardLoading, setScoreboardLoading] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);

    const [challengesLoading, setChallengesLoading] = useState(false);

    const navigate = useNavigate();

    // Make sure this doesn't get recreated on renders
    const handleInputChange = useCallback((e) => {
        const { id, value } = e.target;
        setTeamFormData(prev => ({
            ...prev,
            [id]: id === 'score' ? (value === '' ? 0 : Number(value)) : value
        }));
    }, []);

    const fetchScoreboardData = async () => {
        setScoreboardLoading(true);
        try {
            const teamsRef = collection(db, "teams");
            const teamsSnapshot = await getDocs(teamsRef);

            const teamsList = teamsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setTeams(teamsList);
        } catch (error) {
            console.error("Error fetching scoreboard data:", error);
        } finally {
            setScoreboardLoading(false);
        }
    };

    // Update useEffect to fetch teams for both team management and scoreboard
    useEffect(() => {
        if (adminVerified && (activeSection === 'teams' || activeSection === 'scoreboard')) {
            fetchTeams();
        }
    }, [adminVerified, activeSection]);

    // Function to check if admin data exists and user email matches admin email
    const checkAdminEmail = async (userEmail) => {
        try {
            const adminDocRef = doc(db, 'admin', 'credentials');
            const adminSnapshot = await getDoc(adminDocRef);

            if (!adminSnapshot.exists()) {
                console.error("Admin credentials document does not exist");
                return false;
            }

            const adminData = adminSnapshot.data();

            // Check if the required fields exist
            if (!adminData.email || !adminData.password || !adminData.token) {
                console.error("Admin document missing required fields");
                return false;
            }

            setAdminData(adminData);

            // Add debug logging
            console.log("User email:", userEmail);
            console.log("Admin email from DB:", adminData.email);

            // Use case-insensitive comparison to avoid issues
            return userEmail.toLowerCase().trim() === adminData.email.toLowerCase().trim();
        } catch (error) {
            console.error("Error fetching admin data:", error);
            return false;
        }
    };

    // Handle authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (!currentUser) {
                setLoading(false);
                console.log("No user signed in, redirecting to login");
                navigate('/login');
                return;
            }

            console.log("Current user email:", currentUser.email);

            // Check if user email matches admin email
            const isAdmin = await checkAdminEmail(currentUser.email);
            console.log("Is admin check result:", isAdmin);

            if (!isAdmin) {
                setLoading(false);
                setError("You are not authorized to access this page");
                console.log("Admin check failed, redirecting to home");
                // You can choose to redirect or just show an error
                setTimeout(() => {
                    navigate('/home');
                }, 3000);
                return;
            }

            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [navigate]);

    // Set up session timeout (30 minutes)
    useEffect(() => {
        if (adminVerified) {
            const timeout = setTimeout(() => {
                handleSignOut();
            }, 30 * 60 * 1000); // 30 minutes in milliseconds

            return () => clearTimeout(timeout);
        }
    }, [adminVerified]);

    // Handle verification of password and token
    const handleVerify = async () => {
        setVerifying(true);
        setError('');

        try {
            if (!adminData) {
                setError("Admin data not available");
                setVerifying(false);
                return;
            }

            // Check for the field names that exist in your database
            if (!adminData.password || !adminData.token) {
                console.error("Missing credential fields in admin data:", adminData);
                setError("Admin credentials are not properly configured");
                setVerifying(false);
                return;
            }

            // Debug logging to help troubleshoot
            console.log("Password input:", password);
            console.log("Token input:", token);
            console.log("Password hash exists:", !!adminData.password);
            console.log("Token hash exists:", !!adminData.token);

            // Compare the provided password with the hashed password in Firestore
            // Use the field names that match your database
            const isPasswordValid = await bcrypt.compare(password, adminData.password);
            const isTokenValid = await bcrypt.compare(token, adminData.token);

            console.log("Password valid:", isPasswordValid);
            console.log("Token valid:", isTokenValid);

            if (isPasswordValid && isTokenValid) {
                setAdminVerified(true);
                // You could also set a cookie or local storage item with expiration
                sessionStorage.setItem('adminSessionStart', Date.now());
            } else {
                setError("Invalid password or token");
            }
        } catch (error) {
            console.error("Verification error:", error);
            setError(`Verification failed: ${error.message}`);
        } finally {
            setVerifying(false);
        }
    };

    const handleSignOut = async () => {
        try {
            setAdminVerified(false);
            sessionStorage.removeItem('adminSessionStart');
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const fetchTeams = async () => {
        setTeamsLoading(true);
        try {
            const teamsRef = collection(db, "teams");
            const teamsSnapshot = await getDocs(teamsRef);

            const teamsList = teamsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setTeams(teamsList);
        } catch (error) {
            console.error("Error fetching teams:", error);
        } finally {
            setTeamsLoading(false);
        }
    };

    useEffect(() => {
        if (adminVerified && activeSection === 'teams') {
            fetchTeams();
        }
    }, [adminVerified, activeSection]);

    // Handle team form submission
    const handleTeamSubmit = useCallback(async (e) => {
        e.preventDefault();
        setFormError('');

        try {
            if (!teamFormData.name || !teamFormData.email || !teamFormData.teamLead) {
                setFormError('Please fill all required fields');
                return;
            }

            if (isEditing && currentTeamId) {
                // Update existing team
                await updateDoc(doc(db, "teams", currentTeamId), teamFormData);
            } else {
                // Create new team
                await addDoc(collection(db, "teams"), teamFormData);
            }

            // Reset form and refresh team list
            setTeamFormData({
                name: '',
                email: '',
                teamLead: '',
                score: 0
            });
            setIsEditing(false);
            setCurrentTeamId(null);
            fetchTeams();
        } catch (error) {
            console.error("Error saving team:", error);
            setFormError('Failed to save team. Please try again.');
        }
    }, [teamFormData, isEditing, currentTeamId]);

    // Handle team edit button click
    const handleEditTeam = useCallback((team) => {
        setTeamFormData({
            name: team.name,
            email: team.email,
            teamLead: team.teamLead,
            score: team.score || 0
        });
        setCurrentTeamId(team.id);
        setIsEditing(true);
    }, []);

    // Handle team delete button click
    const handleDeleteTeam = useCallback(async (teamId) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            try {
                await deleteDoc(doc(db, "teams", teamId));
                fetchTeams();
            } catch (error) {
                console.error("Error deleting team:", error);
            }
        }
    }, []);

    // Reset form
    const handleCancelEdit = useCallback(() => {
        setTeamFormData({
            name: '',
            email: '',
            teamLead: '',
            score: 0
        });
        setIsEditing(false);
        setCurrentTeamId(null);
        setFormError('');
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // If there's an authorization error
    if (error && !adminVerified && !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <p className="text-gray-600 mb-4">Redirecting to home page...</p>
                </div>
            </div>
        );
    }

    // If user is signed in but not yet verified as admin
    if (user && !adminVerified) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Verification</h1>
                    <p className="text-gray-600 mb-4">
                        Please enter your admin password and security token to continue
                    </p>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Admin Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                                Security Token
                            </label>
                            <input
                                type="password"
                                id="token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter security token"
                                required
                            />
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {verifying ? 'Verifying...' : 'Verify & Access Admin Panel'}
                        </button>

                        <button
                            onClick={handleSignOut}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel & Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Admin panel content - only shown after full verification
    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Admin Control Panel</h1>
                    <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-4">Session expires in 30 minutes</span>
                        <button
                            onClick={handleSignOut}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <div className="bg-white shadow md:w-64 md:flex-shrink-0">
                    <div className="p-4">
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveSection('dashboard')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'dashboard'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Dashboard
                            </button>

                            <button
                                onClick={() => setActiveSection('finalists')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'finalists'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Phase 2 Finalists
                            </button>

                            <button
                                onClick={() => setActiveSection('teams')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'teams'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Team Management
                            </button>

                            <button
                                onClick={() => setActiveSection('checker')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'checker'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Round 1 Checker
                            </button>

                            <button
                                onClick={() => setActiveSection('challenges')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'challenges'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Challenge Management
                            </button>

                            {/* Inside the sidebar navigation */}
                            <button
                                onClick={() => setActiveSection('scoreboard')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'scoreboard'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Scoreboard
                            </button>

                            <button
                                onClick={() => setActiveSection('settings')}
                                className={`w-full px-4 py-2 text-left text-sm font-medium rounded-md ${activeSection === 'settings'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Settings
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow p-6">
                    {user && (
                        <div className="bg-white p-4 rounded-md shadow mb-6">
                            <p className="text-sm text-gray-700">Signed in as: {user.email}</p>
                            <p className="text-sm text-gray-700 mt-1">
                                <strong>Status:</strong> Verified Admin
                            </p>
                        </div>
                    )}

                    {/* Dashboard */}
                    {activeSection === 'dashboard' && (
                        <div className="bg-white p-6 shadow rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h2>
                            <p className="text-gray-600 mb-6">Welcome to the CID CTF Administration Dashboard</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div onClick={() => setActiveSection('teams')} className="cursor-pointer border border-gray-200 rounded-md p-6 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-lg font-medium text-gray-800">Team Management</h3>
                                    <p className="text-sm text-gray-600 mt-1">Manage participating teams</p>
                                </div>

                                <div onClick={() => setActiveSection('challenges')} className="cursor-pointer border border-gray-200 rounded-md p-6 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-lg font-medium text-gray-800">Challenge Management</h3>
                                    <p className="text-sm text-gray-600 mt-1">Create and manage CTF challenges</p>
                                </div>

                                <div onClick={() => setActiveSection('scoreboard')} className="cursor-pointer border border-gray-200 rounded-md p-6 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-lg font-medium text-gray-800">Scoreboard</h3>
                                    <p className="text-sm text-gray-600 mt-1">View the current competition standings</p>
                                </div>

                                <div onClick={() => setActiveSection('settings')} className="cursor-pointer border border-gray-200 rounded-md p-6 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-lg font-medium text-gray-800">System Settings</h3>
                                    <p className="text-sm text-gray-600 mt-1">Configure platform settings</p>
                                </div>

                                <div onClick={() => setActiveSection('finalists')} className="cursor-pointer border border-gray-200 rounded-md p-6 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-lg font-medium text-gray-800">Phase 2 Finalists</h3>
                                    <p className="text-sm text-gray-600 mt-1">View and manage teams verified for the final round</p>
                                </div>

                            </div>
                        </div>
                    )}

                    {activeSection === 'checker' && <Round1Checker user={user} />}

                    {/* Team Management */}
                    {activeSection === 'teams' &&
                        <TeamManagement
                            teams={teams}
                            teamsLoading={teamsLoading}
                            teamFormData={teamFormData}
                            handleInputChange={handleInputChange}
                            formError={formError}
                            isEditing={isEditing}
                            currentTeamId={currentTeamId}
                            handleTeamSubmit={handleTeamSubmit}
                            handleCancelEdit={handleCancelEdit}
                            handleEditTeam={handleEditTeam}
                            handleDeleteTeam={handleDeleteTeam}
                        />
                    }

                    {/* Challenge Management - Placeholder */}
                    {activeSection === 'challenges' && (
                        <ChallengeManagement
                            loading={challengesLoading}
                            setLoading={setChallengesLoading}
                        />
                    )}

                    {/* Settings - Placeholder */}
                    {activeSection === 'settings' && (
                        <Settings
                            loading={settingsLoading}
                            setLoading={setSettingsLoading}
                        />
                    )}

                    {activeSection === 'finalists' && <Finalists />}

                    {activeSection === 'scoreboard' &&
                        <Scoreboard
                            teams={teams}
                            loading={scoreboardLoading}
                        />
                    }
                </div>
            </div>
        </div>
    );
}

export default Admin;