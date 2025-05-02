import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyCz_uy2uoot9oQcl_2L8CoNVCrOWceWk8o",
  authDomain: "groco-ad815.firebaseapp.com",
  projectId: "groco-ad815",
  storageBucket: "groco-ad815.appspot.com",
  messagingSenderId: "192212069035",
  appId: "1:192212069035:web:8d84c98f7b1de4bef125ee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;