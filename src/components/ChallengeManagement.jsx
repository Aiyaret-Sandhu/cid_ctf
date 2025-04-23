import { memo, useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import bcrypt from 'bcryptjs';

const ChallengeManagement = memo(({ loading, setLoading }) => {
    const [challenges, setChallenges] = useState([]);
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentChallengeId, setCurrentChallengeId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [challengeFormData, setChallengeFormData] = useState({
        title: '',
        description: '',
        category: '',
        points: 100,
        flag: '',
        active: true,
        difficulty: 'medium', // easy, medium, hard
        hint: '',
        imagePath: ''
    });

    const categories = ['Web', 'Cryptography', 'Forensics', 'Reverse Engineering', 'Binary Exploitation', 'OSINT', 'Miscellaneous'];
    const difficulties = [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' }
    ];

    // Fetch challenges from Firestore
    const fetchChallenges = async () => {
        setLoading(true);
        try {
            const challengesRef = collection(db, "challenges");
            const challengesSnapshot = await getDocs(challengesRef);

            const challengesList = challengesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Don't include the flag hash in the list for security
                flagHash: undefined
            }));

            setChallenges(challengesList);
        } catch (error) {
            console.error("Error fetching challenges:", error);
            setFormError("Failed to load challenges");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChallenges();
    }, [setLoading]);

    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        setChallengeFormData(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked :
                id === 'points' ? parseInt(value) : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            // Create a preview
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file, challengeId) => {
        if (!file) return null;

        const storageRef = ref(storage, `challenges/${challengeId}/${file.name}`);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);

        return {
            url: imageUrl,
            path: `challenges/${challengeId}/${file.name}`
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setFormError('');

        try {
            // Basic validation
            if (!challengeFormData.title || !challengeFormData.description || !challengeFormData.category) {
                setFormError('Please fill in all required fields');
                setLoading(false);
                return;
            }

            // Create hashed flag from the provided flag text
            const flagHash = challengeFormData.flag ?
                await bcrypt.hash(challengeFormData.flag.trim(), 10) :
                null;

            let challengeId = currentChallengeId;
            let imageData = null;

            // If editing existing challenge
            if (isEditing && challengeId) {
                // Upload new image if provided
                if (imageFile) {
                    imageData = await uploadImage(imageFile, challengeId);

                    // If there was a previous image, delete it
                    if (challengeFormData.imagePath) {
                        try {
                            const oldImageRef = ref(storage, challengeFormData.imagePath);
                            await deleteObject(oldImageRef);
                        } catch (error) {
                            console.log("Previous image might not exist, continuing...");
                        }
                    }
                }

                // Update the challenge document
                await setDoc(doc(db, "challenges", challengeId), {
                    title: challengeFormData.title,
                    description: challengeFormData.description,
                    category: challengeFormData.category,
                    points: challengeFormData.points,
                    active: challengeFormData.active,
                    difficulty: challengeFormData.difficulty,
                    hint: challengeFormData.hint,
                    ...(flagHash && { flagHash }), // Only update flag if a new one is provided
                    ...(imageData && {
                        imageUrl: imageData.url,
                        imagePath: imageData.path
                    }),
                    updatedAt: new Date()
                }, { merge: true });

            } else {
                // Create new challenge
                // When creating a new challenge, make sure active is explicitly set to true
                const newChallengeRef = await addDoc(collection(db, "challenges"), {
                    title: challengeFormData.title,
                    description: challengeFormData.description,
                    category: challengeFormData.category,
                    points: challengeFormData.points,
                    active: true, // Make sure this is set to true
                    difficulty: challengeFormData.difficulty,
                    hint: challengeFormData.hint,
                    ...(flagHash && { flagHash }),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                challengeId = newChallengeRef.id;

                // Upload image if provided for new challenge
                if (imageFile) {
                    imageData = await uploadImage(imageFile, challengeId);

                    // Update the challenge with image info
                    await setDoc(doc(db, "challenges", challengeId), {
                        imageUrl: imageData.url,
                        imagePath: imageData.path
                    }, { merge: true });
                }
            }

            // Reset form and fetch updated challenges
            resetForm();
            fetchChallenges();
            setSuccess(true);

        } catch (error) {
            console.error("Error saving challenge:", error);
            setFormError(`Failed to save challenge: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (challengeId, imagePath) => {
        if (window.confirm('Are you sure you want to delete this challenge? This cannot be undone.')) {
            setLoading(true);
            try {
                // Delete the challenge document
                await deleteDoc(doc(db, "challenges", challengeId));

                // Delete associated image if exists
                if (imagePath) {
                    const imageRef = ref(storage, imagePath);
                    await deleteObject(imageRef);
                }

                fetchChallenges();
            } catch (error) {
                console.error("Error deleting challenge:", error);
                setFormError("Failed to delete challenge");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleEdit = (challenge) => {
        setCurrentChallengeId(challenge.id);
        setChallengeFormData({
            title: challenge.title || '',
            description: challenge.description || '',
            category: challenge.category || '',
            points: challenge.points || 100,
            flag: '', // Don't populate the flag for security
            active: challenge.active ?? true,
            difficulty: challenge.difficulty || 'medium',
            hint: challenge.hint || '',
            imagePath: challenge.imagePath || ''
        });

        // Set image preview if available
        if (challenge.imageUrl) {
            setImagePreview(challenge.imageUrl);
        } else {
            setImagePreview(null);
        }

        setImageFile(null);
        setIsEditing(true);
        window.scrollTo(0, 0);
    };

    const resetForm = () => {
        setChallengeFormData({
            title: '',
            description: '',
            category: '',
            points: 100,
            flag: '',
            active: true,
            difficulty: 'medium',
            hint: ''
        });
        setCurrentChallengeId(null);
        setIsEditing(false);
        setImageFile(null);
        setImagePreview(null);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 shadow rounded-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {isEditing ? 'Edit Challenge' : 'Create New Challenge'}
                </h2>

                {formError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {formError}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        Challenge {isEditing ? 'updated' : 'created'} successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                Challenge Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={challengeFormData.title}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                Category *
                            </label>
                            <select
                                id="category"
                                value={challengeFormData.category}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description *
                        </label>
                        <textarea
                            id="description"
                            rows="4"
                            value={challengeFormData.description}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Describe the challenge in detail"
                            required
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                                Points *
                            </label>
                            <input
                                type="number"
                                id="points"
                                value={challengeFormData.points}
                                onChange={handleInputChange}
                                min="10"
                                step="10"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                                Difficulty
                            </label>
                            <select
                                id="difficulty"
                                value={challengeFormData.difficulty}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {difficulties.map(diff => (
                                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center pt-7">
                            <input
                                type="checkbox"
                                id="active"
                                checked={challengeFormData.active}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                                Make challenge active
                            </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="hint" className="block text-sm font-medium text-gray-700">
                            Hint (Optional)
                        </label>
                        <textarea
                            id="hint"
                            rows="2"
                            value={challengeFormData.hint}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Provide a hint for participants (optional)"
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="flag" className="block text-sm font-medium text-gray-700">
                            Flag {isEditing ? '(Leave blank to keep existing flag)' : '*'}
                        </label>
                        <input
                            type="text"
                            id="flag"
                            value={challengeFormData.flag}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., CTF{this_is_the_flag}"
                            required={!isEditing}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            The flag will be securely hashed before storing. Make sure to keep a copy for verification.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Challenge Image
                        </label>
                        <div className="mt-1 flex items-center space-x-6">
                            <div className="flex-shrink-0">
                                {imagePreview ? (
                                    <div className="relative h-32 w-32 bg-gray-100 rounded-md overflow-hidden">
                                        <img
                                            src={imagePreview}
                                            alt="Challenge preview"
                                            className="h-full w-full object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setImageFile(null); }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                                            title="Remove image"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-32 w-32 border-2 border-gray-300 border-dashed rounded-md flex items-center justify-center">
                                        <svg className="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow">
                                <input
                                    type="file"
                                    id="image"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="sr-only"
                                />
                                <label
                                    htmlFor="image"
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                                >
                                    {imageFile ? 'Change Image' : 'Upload Image'}
                                </label>
                                <p className="mt-2 text-xs text-gray-500">
                                    PNG or JPG up to 2MB. Images help make challenges more engaging.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isEditing ? 'Update Challenge' : 'Create Challenge'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Challenge List */}
            <div className="bg-white p-6 shadow rounded-lg overflow-x-auto">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Challenge Library</h3>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : challenges.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No challenges have been created yet.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challenge</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {challenges.map(challenge => (
                                <tr key={challenge.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {challenge.imageUrl && (
                                                <div className="flex-shrink-0 h-10 w-10 mr-3">
                                                    <img className="h-10 w-10 object-contain bg-gray-100 rounded-md" src={challenge.imageUrl} alt="" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">{challenge.title}</div>
                                                <div className="text-sm text-gray-500 truncate max-w-xs">{challenge.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {challenge.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {challenge.points}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {challenge.difficulty === 'easy' && (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Easy
                                            </span>
                                        )}
                                        {challenge.difficulty === 'medium' && (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Medium
                                            </span>
                                        )}
                                        {challenge.difficulty === 'hard' && (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Hard
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {challenge.active ? (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(challenge)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(challenge.id, challenge.imagePath)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
});

export default ChallengeManagement;