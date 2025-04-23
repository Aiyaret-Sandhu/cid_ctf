import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, arrayUnion } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [solvedChallenges, setSolvedChallenges] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [user, setUser] = useState(null);
  
  // For challenge detail view
  const { challengeId } = useParams();
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [flagInput, setFlagInput] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');
  
  // Fetch user's team and solved challenges
  useEffect(() => {
    const fetchUserTeam = async () => {
      // This assumes you set the user in state from auth context
      const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
      if (!currentUser) return;
      
      setUser(currentUser);
      
      try {
        const teamsRef = collection(db, "teams");
        const teamQuery = query(teamsRef, where("email", "==", currentUser.email));
        const teamSnapshot = await getDocs(teamQuery);
        
        if (!teamSnapshot.empty) {
          const teamDoc = teamSnapshot.docs[0];
          const team = { id: teamDoc.id, ...teamDoc.data() };
          setTeamData(team);
          
          // Get solved challenges for this team
          if (team.solvedChallenges) {
            setSolvedChallenges(team.solvedChallenges);
          }
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    };
    
    fetchUserTeam();
  }, []);
  
  // Fetch challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const challengesRef = collection(db, "challenges");
        const challengesSnapshot = await getDocs(challengesRef);
        
        const challengesList = challengesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(challenge => challenge.active); // Only get active challenges
        
        setChallenges(challengesList);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(challengesList.map(c => c.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Error fetching challenges:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChallenges();
  }, []);
  
  // Fetch specific challenge if ID is provided
  useEffect(() => {
    if (challengeId) {
      const fetchChallenge = async () => {
        setLoading(true);
        try {
          const challengeRef = doc(db, "challenges", challengeId);
          const challengeSnapshot = await getDoc(challengeRef);
          
          if (challengeSnapshot.exists()) {
            const challenge = { id: challengeSnapshot.id, ...challengeSnapshot.data() };
            setCurrentChallenge(challenge);
          } else {
            setErrorMessage("Challenge not found");
          }
        } catch (error) {
          console.error("Error fetching challenge:", error);
          setErrorMessage("Error loading challenge");
        } finally {
          setLoading(false);
        }
      };
      
      fetchChallenge();
    }
  }, [challengeId]);
  
  // Handle flag submission
  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamData) {
      setSubmitStatus('error');
      setErrorMessage("You must be part of a team to submit flags");
      return;
    }
    
    if (solvedChallenges.includes(currentChallenge.id)) {
      setSubmitStatus('error');
      setErrorMessage("You have already solved this challenge");
      return;
    }
    
    setLoading(true);
    try {
      // Compare submitted flag with stored hash
      const isCorrect = await bcrypt.compare(flagInput.trim(), currentChallenge.flagHash);
      
      if (isCorrect) {
        // Update team's score and solved challenges
        const teamRef = doc(db, "teams", teamData.id);
        
        await updateDoc(teamRef, {
          score: (teamData.score || 0) + currentChallenge.points,
          solvedChallenges: arrayUnion(currentChallenge.id),
          solvedAt: arrayUnion({
            challengeId: currentChallenge.id,
            timestamp: new Date(),
            points: currentChallenge.points
          })
        });
        
        // Update local state
        setSolvedChallenges([...solvedChallenges, currentChallenge.id]);
        setTeamData({
          ...teamData,
          score: (teamData.score || 0) + currentChallenge.points
        });
        
        setSubmitStatus('success');
        setFlagInput('');
      } else {
        setSubmitStatus('error');
        setErrorMessage("Incorrect flag, please try again");
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      setSubmitStatus('error');
      setErrorMessage("Error submitting flag");
    } finally {
      setLoading(false);
    }
  };
  
  // Filter challenges by category
  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter(c => c.category === selectedCategory);
  
  // Handle challenge detail view
  if (challengeId && currentChallenge) {
    const isSolved = solvedChallenges.includes(currentChallenge.id);
    
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">CID CTF Platform</h1>
            {teamData && (
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{teamData.name}</span>
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  {teamData.score || 0} pts
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link to="/challenges" className="text-indigo-600 hover:text-indigo-900 flex items-center">
              <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to Challenges
            </Link>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Challenge Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{currentChallenge.title}</h2>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      {currentChallenge.category}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                      {currentChallenge.points} points
                    </span>
                    
                    {/* Difficulty indicator */}
                    {currentChallenge.difficulty === 'easy' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Easy
                      </span>
                    )}
                    {currentChallenge.difficulty === 'medium' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                        Medium
                      </span>
                    )}
                    {currentChallenge.difficulty === 'hard' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                        Hard
                      </span>
                    )}
                    
                    {/* Solved indicator */}
                    {isSolved && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center">
                        <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Solved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Challenge Content */}
            <div className="p-6">
              {/* Challenge Image */}
              {currentChallenge.imageUrl && (
                <div className="mb-6 flex justify-center">
                  <img 
                    src={currentChallenge.imageUrl} 
                    alt={currentChallenge.title}
                    className="max-h-96 rounded-lg"
                  />
                </div>
              )}
              
              {/* Challenge Description */}
              <div className="prose max-w-none">
                <p>{currentChallenge.description}</p>
              </div>
              
              {/* Hint (if available) */}
              {currentChallenge.hint && (
                <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Hint</h3>
                      <p className="mt-2 text-sm text-yellow-700">{currentChallenge.hint}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Flag Submission Form */}
              {!isSolved ? (
                <div className="mt-8">
                  <form onSubmit={handleFlagSubmit}>
                    <label htmlFor="flag" className="block text-sm font-medium text-gray-700">
                      Submit Flag
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="flag"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                        placeholder="Enter flag (e.g., CTF{...})"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {loading ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                    
                    {/* Status messages */}
                    {submitStatus === 'success' && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                              Correct! You've earned {currentChallenge.points} points.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {submitStatus === 'error' && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        You've already solved this challenge! ({currentChallenge.points} points)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Challenges List View
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">CID CTF Platform</h1>
          {teamData && (
            <div className="flex items-center bg-gray-100 px-3 py-1 rounded-lg">
              <span className="text-sm font-medium text-gray-700">{teamData.name}</span>
              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                {teamData.score || 0} pts
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/home" className="text-indigo-600 hover:text-indigo-900 flex items-center">
            <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        {/* Category filters */}
        <div className="flex overflow-x-auto pb-4 mb-4 space-x-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Challenges grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No challenges available in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map(challenge => {
              const isSolved = solvedChallenges.includes(challenge.id);
              
              return (
                <Link
                  key={challenge.id}
                  to={`/challenges/${challenge.id}`}
                  className={`block bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                    isSolved ? 'border-2 border-green-400' : ''
                  }`}
                >
                  {challenge.imageUrl && (
                    <div className="h-40 bg-gray-100">
                      <img 
                        src={challenge.imageUrl} 
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900">{challenge.title}</h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {challenge.points} pts
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {challenge.category}
                      </span>
                      
                      {challenge.difficulty === 'easy' && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Easy
                        </span>
                      )}
                      {challenge.difficulty === 'medium' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Medium
                        </span>
                      )}
                      {challenge.difficulty === 'hard' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          Hard
                        </span>
                      )}
                      
                      {isSolved && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                          <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Solved
                        </span>
                      )}
                    </div>
                    
                    <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                      {challenge.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Challenges;