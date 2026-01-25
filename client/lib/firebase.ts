import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, remove, onValue, off } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAfxmjn2bt2KcOdiuGQcvhNFxknDey3SwE",
  authDomain: "pharmacy-e9599.firebaseapp.com",
  databaseURL: "https://pharmacy-e9599-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pharmacy-e9599",
  storageBucket: "pharmacy-e9599.firebasestorage.app",
  messagingSenderId: "67459379712",
  appId: "1:67459379712:web:ba1c59f53f9ff6db995ee5",
  measurementId: "G-QQZ9NL28V4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Realtime Database reference
const database = getDatabase(app);

export { database, ref, push, set, remove, onValue, off };
