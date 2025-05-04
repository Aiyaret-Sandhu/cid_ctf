import { memo, useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Scoreboard = memo(({ teams: initialTeams, loading: initialLoading }) => {
  const [teams, setTeams] = useState(initialTeams);
  const [loading, setLoading] = useState(initialLoading);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [settings, setSettings] = useState(null);
  const [challenges, setChallenges] = useState([]);

  // Fetch settings and challenges on component mount
  useEffect(() => {
    const fetchSettingsAndChallenges = async () => {
      try {
        // Get settings
        const settingsDoc = await getDoc(doc(db, "settings", "eventConfig"));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data());
        }

        // Get active challenges
        const challengesRef = collection(db, "challenges");
        const challengesSnapshot = await getDocs(challengesRef);
        const challengesList = challengesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChallenges(challengesList.filter(c => c.active));
      } catch (error) {
        console.error("Error fetching settings and challenges:", error);
      }
    };

    fetchSettingsAndChallenges();
  }, []);

  // Sort teams by score in descending order
  const sortedTeams = [...teams].sort((a, b) => {
    // First sort by score (highest first)
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // If scores are tied, sort by completion time (earliest first)
    if (a.completedAt && b.completedAt) {
      return a.completedAt.seconds - b.completedAt.seconds;
    } else if (a.completedAt) {
      return -1; // a comes first if only a has completedAt
    } else if (b.completedAt) {
      return 1;  // b comes first if only b has completedAt
    }

    return 0;
  });

  // Function to refresh the scoreboard data
  const refreshScoreboard = async () => {
    setLoading(true);
    try {
      // Fetch fresh team data from Firestore
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
          name: data.name || "Unknown Team",
          email: data.email || "",
          teamLead: data.teamLead || "",
          score: data.score || 0,
          solvedChallenges: data.solvedChallenges || []
        };
      });

      setTeams(teamsList);
      setLastRefreshed(new Date());

      // Check if enough teams have completed all challenges
      checkCompletionStatus(teamsList);
    } catch (error) {
      console.error("Error refreshing scoreboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if enough teams have completed all challenges to end the event
  const checkCompletionStatus = async (currentTeams) => {
    // Only proceed if we have settings, challenges and teams
    if (!settings || !challenges.length || !currentTeams.length) return;

    const finalistCount = settings.finalistCount || 1;
    const activeChallengeIds = challenges.map(c => c.id);

    // Count teams that have completed all challenges
    const teamsCompletedAll = currentTeams.filter(team => {
      const solvedChallenges = team.solvedChallenges || [];
      return activeChallengeIds.every(id => solvedChallenges.includes(id));
    });

    // If enough teams have completed, end the event
    if (teamsCompletedAll.length >= finalistCount && settings.eventStatus !== 'ended') {
      try {
        // Update event status to 'ended'
        await updateDoc(doc(db, "settings", "eventConfig"), {
          eventStatus: 'ended',
          // Store the actual end time
          actualEndTime: new Date()
        });

        console.log(`Event ended automatically: ${teamsCompletedAll.length} teams completed all challenges`);

        // Redirect to home page
        window.location.href = '/home';
      } catch (error) {
        console.error("Error ending event:", error);
      }
    }
  };

  // Check completion status when teams or challenges change
  useEffect(() => {
    if (teams.length && challenges.length && settings) {
      checkCompletionStatus(teams);
    }
  }, [teams, challenges, settings]);



  return (
    <div className="space-y-8">
      <div className="bg-white p-6 shadow rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Scoreboard</h2>
          <div className="flex items-center">
            <span className="text-xs text-gray-500 mr-4">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={refreshScoreboard}
              disabled={loading}
              className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Show event status if available */}
        {settings && settings.eventStatus === 'ended' && (
          <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Competition has ended. No further submissions are being accepted.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-600 mb-6">Current team standings in the competition</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : sortedTeams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No teams have registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Lead
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tab Switches
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTeams.map((team, index) => {
                  // Determine row styling based on rank
                  let rowClass = "";
                  if (index === 0) rowClass = "bg-yellow-50"; // 1st place
                  else if (index === 1) rowClass = "bg-gray-50"; // 2nd place
                  else if (index === 2) rowClass = "bg-orange-50"; // 3rd place

                  return (
                    <tr key={team.id} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {index + 1}
                        {index < 3 && (
                          <span className="ml-1">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {team.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {team.teamLead}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                        {team.score || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {team.totalTabSwitches || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-white p-6 shadow rounded-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Statistics</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">Total Teams</p>
            <p className="text-3xl font-bold text-blue-900">{teams.length}</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">Average Score</p>
            <p className="text-3xl font-bold text-green-900">
              {teams.length > 0 ?
                Math.round(teams.reduce((sum, team) => sum + (team.score || 0), 0) / teams.length)
                : 0}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-800 font-medium">Top Score</p>
            <p className="text-3xl font-bold text-purple-900">
              {teams.length > 0 ?
                Math.max(...teams.map(team => team.score || 0))
                : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Scoreboard;