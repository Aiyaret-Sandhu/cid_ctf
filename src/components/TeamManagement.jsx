import { memo } from 'react';

// Create a memoized version of TeamManagement component
const TeamManagement = memo(({ 
    teams, 
    teamsLoading, 
    teamFormData, 
    handleInputChange, 
    formError, 
    isEditing, 
    handleTeamSubmit, 
    handleCancelEdit, 
    handleEditTeam,
    handleDeleteTeam,
    currentTeamId
}) => {
    return (
        <div className="space-y-8">
            <div className="bg-white p-6 shadow rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {isEditing ? 'Edit Team' : 'Add New Team'}
                </h3>

                {formError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleTeamSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={teamFormData.name}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter team name"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Team Email *
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={teamFormData.email}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter team email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="teamLead" className="block text-sm font-medium text-gray-700">
                            Team Lead *
                        </label>
                        <input
                            type="text"
                            id="teamLead"
                            value={teamFormData.teamLead}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter team lead name"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="score" className="block text-sm font-medium text-gray-700">
                            Score
                        </label>
                        <input
                            type="number"
                            id="score"
                            value={teamFormData.score}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter team score"
                            min="0"
                        />
                    </div>

                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            {isEditing ? 'Update Team' : 'Add Team'}
                        </button>

                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 shadow rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Team List</h3>

                {teamsLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : teams.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No teams added yet.</p>
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
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {teams.map((team) => (
                                    <tr key={team.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {team.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {team.teamLead}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {team.score || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEditTeam(team)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTeam(team.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
});

export default TeamManagement;