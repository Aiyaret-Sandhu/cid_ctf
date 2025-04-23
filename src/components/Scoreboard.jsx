import { memo } from 'react';

const Scoreboard = memo(({ teams, loading }) => {
  // Sort teams by score in descending order
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Scoreboard</h2>
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
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Lead
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
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