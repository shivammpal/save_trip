import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAO-_bNkTCJeLg1LhyA2Zh7RpPLrdF3_nY",
  authDomain: "pocket-yatra-8a572.firebaseapp.com",
  projectId: "pocket-yatra-8a572",
  storageBucket: "pocket-yatra-8a572.firebasestorage.app",
  messagingSenderId: "904771640148",
  appId: "1:904771640148:web:4b05b0685c0ecf0ba486c1",
  measurementId: "G-TH5FXS49XT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
