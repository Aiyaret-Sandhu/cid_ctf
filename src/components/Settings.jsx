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
    eliminationMessage: ''
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
            eliminationMessage: data.eliminationMessage || 'Sorry, you did not qualify for the next round.'
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
    const { id, value } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [id]: id === 'finalistCount' ? parseInt(value) : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      const settingsRef = doc(db, "settings", "eventConfig");
      await setDoc(settingsRef, {
        eventStartTime: new Date(settingsData.eventStartTime),
        eventEndTime: new Date(settingsData.eventEndTime),
        finalistCount: settingsData.finalistCount,
        venue: settingsData.venue,
        nextRoundInfo: settingsData.nextRoundInfo,
        eliminationMessage: settingsData.eliminationMessage
      });
      
      setSuccess(true);
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
        </div>
      </div>
    </div>
  );
});

export default Settings;