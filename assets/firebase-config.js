// assets/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyAcBaKxlFC4Yqg4SNdg8l0lbo9dFCNTtJU",
    authDomain: "asset-register-website.firebaseapp.com",
    projectId: "asset-register-website",
    storageBucket: "asset-register-website.firebasestorage.app",
    messagingSenderId: "921107638281",
    appId: "1:921107638281:web:ec5b50383bd4f6feea70d8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log('🔥 Firebase initialized');
console.log('✅ Auth:', auth);
console.log('✅ Firestore:', db);
