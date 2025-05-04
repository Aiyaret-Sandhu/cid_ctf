import { memo, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Settings = memo(({ loading, setLoading }) => {
  const [settingsData, setSettingsData] = useState({
    eventStartTime: '',
    eventEndTime: '',
    finalistCount: 10,
    venue: '',
    nextRoundInfo: '',
    eliminationMessage: '',
    enableTeamGrouping: false,
    groupCount: 2
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Convert datetime-local string to ISO
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return '';
    // Format ISO string to be compatible with datetime-local input
    return new Date(timestamp).toISOString().slice(0, 16);
  };

  // Load existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const settingsRef = doc(db, "settings", "eventConfig");
        const settingsSnapshot = await getDoc(settingsRef);

        if (settingsSnapshot.exists()) {
          const data = settingsSnapshot.data();
          setSettingsData({
            eventStartTime: formatDateForInput(data.eventStartTime?.toDate()),
            eventEndTime: formatDateForInput(data.eventEndTime?.toDate()),
            finalistCount: data.finalistCount || 10,
            venue: data.venue || '',
            nextRoundInfo: data.nextRoundInfo || '',
            eliminationMessage: data.eliminationMessage || 'Sorry, you did not qualify for the next round.',
            enableTeamGrouping: data.enableTeamGrouping || false,
            maxTabSwitches: data.maxTabSwitches || 3,
            groupCount: data.groupCount || 2,
            // Dynamically load all group messages
            ...Array.from({ length: 5 }).reduce((acc, _, i) => {
              const key = `groupMessage${i + 1}`;
              acc[key] = data[key] || '';
              return acc;
            }, {})
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [setLoading]);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked :
        id === 'finalistCount' || id === 'groupCount' ? parseInt(value) || 2 :
          value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const settingsRef = doc(db, "settings", "eventConfig");

      // Create base settings object with main settings
      const settingsToSave = {
        eventStartTime: new Date(settingsData.eventStartTime),
        eventEndTime: new Date(settingsData.eventEndTime),
        finalistCount: settingsData.finalistCount,
        venue: settingsData.venue,
        nextRoundInfo: settingsData.nextRoundInfo,
        eliminationMessage: settingsData.eliminationMessage,
        enableTeamGrouping: settingsData.enableTeamGrouping || false,
        groupCount: parseInt(settingsData.groupCount || 2),
        maxTabSwitches: parseInt(settingsData.maxTabSwitches || 6), // Add this line
      };

      // Only add group messages for the actual number of groups defined
      const groupCount = parseInt(settingsData.groupCount || 2);
      for (let i = 1; i <= groupCount; i++) {
        settingsToSave[`groupMessage${i}`] = settingsData[`groupMessage${i}`] || '';
      }

      await setDoc(settingsRef, settingsToSave, { merge: true });
      setSuccess(true);
      console.log("Settings saved with", groupCount, "groups");
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Settings</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="eventStartTime" className="block text-sm font-medium text-gray-700">
                Event Start Time *
              </label>
              <input
                type="datetime-local"
                id="eventStartTime"
                value={settingsData.eventStartTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Before this time, users will see "Event not started yet"
              </p>
            </div>

            <div>
              <label htmlFor="eventEndTime" className="block text-sm font-medium text-gray-700">
                Event End Time *
              </label>
              <input
                type="datetime-local"
                id="eventEndTime"
                value={settingsData.eventEndTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                After this time, users will see "Event has ended"
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="maxTabSwitches" className="block text-sm font-medium text-gray-700">
              Maximum Tab Switches Allowed
            </label>
            <input
              type="number"
              id="maxTabSwitches"
              value={settingsData.maxTabSwitches || 3}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of tab switches allowed before disqualifying a team from a challenge
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Next Round Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="finalistCount" className="block text-sm font-medium text-gray-700">
                  Number of Finalists
                </label>
                <input
                  type="number"
                  id="finalistCount"
                  value={settingsData.finalistCount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                  max="100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Top teams that will advance to the next round
                </p>
              </div>

              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                  Next Round Venue
                </label>
                <input
                  type="text"
                  id="venue"
                  value={settingsData.venue}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Room 101, Main Building"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Team Grouping for Final Message</h3>
              <p className="text-sm text-gray-500 mb-4">
                Define groups of qualifying teams and custom messages to show each group upon completion.
              </p>

              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="enableTeamGrouping"
                    checked={settingsData.enableTeamGrouping || false}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable custom messages for different team groups</span>
                </label>

                {settingsData.enableTeamGrouping && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="groupCount" className="block text-sm font-medium text-gray-700">
                        Number of Groups
                      </label>
                      <input
                        type="number"
                        id="groupCount"
                        value={settingsData.groupCount || 2}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        min="1"
                        max="5"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Teams will be divided equally among these groups based on final ranking
                      </p>
                    </div>

                    {Array.from({ length: settingsData.groupCount || 2 }).map((_, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-md">
                        <h4 className="font-medium text-gray-800 mb-2">Group {index + 1} Message</h4>
                        <textarea
                          id={`groupMessage${index + 1}`}
                          value={settingsData[`groupMessage${index + 1}`] || ''}
                          onChange={handleInputChange}
                          rows="3"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder={`Enter message to show to Group ${index + 1} teams`}
                        ></textarea>
                        <p className="mt-1 text-xs text-gray-500">
                          This message will be shown to teams ranked {index === 0 ? 'highest' : index === settingsData.groupCount - 1 ? 'lowest' : 'in the middle'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="nextRoundInfo" className="block text-sm font-medium text-gray-700">
                Next Round Information
              </label>
              <textarea
                id="nextRoundInfo"
                value={settingsData.nextRoundInfo}
                onChange={handleInputChange}
                rows="3"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter details about the next round (time, requirements, etc.)"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500">
                This message will be shown to qualified teams
              </p>
            </div>

            <div className="mt-6">
              <label htmlFor="eliminationMessage" className="block text-sm font-medium text-gray-700">
                Elimination Message
              </label>
              <textarea
                id="eliminationMessage"
                value={settingsData.eliminationMessage}
                onChange={handleInputChange}
                rows="2"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Message for teams that didn't qualify"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500">
                This message will be shown to teams that don't qualify
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 shadow rounded-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Preview</h3>
        <div className="border border-gray-300 rounded-md p-4">
          <div className="mb-4">
            <strong>Event Status:</strong>
            <div className="mt-2 flex space-x-4">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                Event not started yet
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Event in progress
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                Event has ended
              </span>
            </div>
          </div>

          <div className="mb-4">
            <strong>Qualified Team Message:</strong>
            <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded">
              <p className="text-green-800">
                <span className="font-bold">Congratulations!</span> You've qualified for the next round.
              </p>
              <p className="text-green-700 mt-2">
                {settingsData.nextRoundInfo || "Please check your email for details about the next round."}
              </p>
              <p className="text-green-700 mt-2">
                Venue: {settingsData.venue || "TBA"}
              </p>
            </div>
          </div>

          <div>
            <strong>Non-qualified Team Message:</strong>
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-gray-800">
                {settingsData.eliminationMessage || "Sorry, you did not qualify for the next round."}
              </p>
              <p className="text-gray-600 mt-2">
                Thank you for participating in our CTF event!
              </p>
            </div>
          </div>

          {settingsData.enableTeamGrouping && (
            <div className="mt-6">
              <strong>Team Group Messages:</strong>
              <div className="mt-2 space-y-3">
                {Array.from({ length: settingsData.groupCount || 2 }).map((_, index) => (
                  <div key={index} className={`p-3 ${index === 0 ? 'bg-blue-50 border border-blue-200' : index === 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'} rounded`}>
                    <p className="text-sm font-medium mb-1">Group {index + 1} Message:</p>
                    <p className={`${index === 0 ? 'text-blue-800' : index === 1 ? 'text-green-800' : 'text-gray-800'}`}>
                      {settingsData[`groupMessage${index + 1}`] || "No custom message set for this group."}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {index === 0 ? 'Top ranked teams' :
                        index === settingsData.groupCount - 1 ? 'Lowest ranked teams' :
                          `Teams ranked in group ${index + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Settings;