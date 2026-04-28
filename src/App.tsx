/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  GraduationCap, 
  Heart, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight, 
  Calendar,
  Newspaper,
  Trophy,
  UserPlus,
  CheckCircle,
  ArrowUp,
  ShieldCheck,
  Bell,
  LogIn,
  LogOut,
  X,
  Eye,
  EyeOff,
  Send,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  Download,
  Loader2,
  BookMarked,
  Scroll,
  Laptop,
  Mic2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { db, auth, onAuthStateChanged, FirebaseUser } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  setDoc,
  doc,
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  signInWithPopup,
  googleProvider
} from './lib/firebase';

// --- Types ---
interface NewsItem {
  _id: string;
  icon: string;
  date: string;
  title: string;
  description: string;
  fullMessage?: string;
}

interface CourseItem {
  _id: string;
  name: string;
  description: string;
}

interface ProgressReportItem {
  _id: string;
  studentId: string;
  studentName: string;
  month: string;
  year: string;
  attendance: string;
  quranProgress: string;
  academicProgress?: string;
  behavior: string;
  classParticipation: string;
  readingSkills: string;
  writingSkills: string;
  teacherRemarks?: string;
  createdAt: any;
}

interface ResultData {
  found: boolean;
  name?: string;
  exam?: string;
  marks?: string;
  percentage?: string;
  grade?: string;
  status?: string;
  message?: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ title: string; text: string } | null>(null);
  
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  // A teacher is a user with role 'teacher' or 'admin'
  const canManageReports = isAdmin || userProfile?.role === 'teacher' || userProfile?.role === 'admin';
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [userAdmission, setUserAdmission] = useState<any>(null);
  const [isSubmittingAdmission, setIsSubmittingAdmission] = useState(false);
  const [isAdmissionSuccess, setIsAdmissionSuccess] = useState(false);
  
  // Data State
  const [news, setNews] = useState<NewsItem[]>([
    { 
      _id: 'default-1', 
      title: "نئے تعلیمی سال کا آغاز", 
      description: "Madani School System میں داخلے کھل گئے ہیں۔", 
      date: "15 March 2025", 
      icon: "graduation-cap" 
    },
    { 
      _id: 'default-2', 
      title: "امتحانات کے نتائج", 
      description: "دورہ حدیث کے امتحانات کے نتائج کا اعلان", 
      date: "10 March 2025", 
      icon: "trophy" 
    }
  ]);
  const [courses, setCourses] = useState<CourseItem[]>([
    { _id: 'default-c1', name: "Hifz-e-Quran", description: "Full Quran Memorization" },
    { _id: 'default-c2', name: "Nazra Quran", description: "Quran reading with Tajweed" },
    { _id: 'default-c3', name: "Dars-e-Nizami", description: "8-year Alimah course" },
    { _id: 'default-c4', name: "Modern Education", description: "Schooling from Playgroup to Class 10" }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admission Form State
  const [showAdmission, setShowAdmission] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    student_name: '', father_name: '', dob: '', gender: 'male', course: 'Hifz Program',
    phone: '', email: '', address: '', additional_info: '', selectedClass: ''
  });
  const [admissionFile, setAdmissionFile] = useState<File | null>(null);
  
  // Result State
  const [showResult, setShowResult] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [examType, setExamType] = useState('');
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // Admin Panel State
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'admissions' | 'news' | 'users' | 'reports'>('admissions');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', description: '', icon: 'newspaper' });
  const [newCourse, setNewCourse] = useState({ name: '', description: '' });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [selectionSuccess, setSelectionSuccess] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);
  const [isSelectingCourse, setIsSelectingCourse] = useState(false);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);

  // Effect to set default admin tab
  useEffect(() => {
    if (showAdminPanel) {
      if (!isAdmin && userProfile?.role === 'teacher') {
        setAdminTab('reports');
      } else if (isAdmin) {
        setAdminTab('admissions');
      }
    }
  }, [showAdminPanel, isAdmin, userProfile]);

  // Progress Report State
  const [progressReports, setProgressReports] = useState<ProgressReportItem[]>([]);
  const [showProgressReports, setShowProgressReports] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  const [newReport, setNewReport] = useState({
    studentId: '',
    studentName: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    attendance: '',
    quranProgress: '',
    academicProgress: '',
    behavior: 'Excellent',
    classParticipation: 'Attentive',
    readingSkills: 'Good',
    writingSkills: 'Good',
    teacherRemarks: ''
  });
  const [studentsList, setStudentsList] = useState<{uid: string, name: string}[]>([]);

  const openCourseSelection = () => {
    console.log("Opening course selection modal");
    setSelectionSuccess(false);
    setShowCourseSelection(true);
  };

  const checkUserProfile = async (currentUser: any) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      let profileData = null;
      if (userDoc.exists()) {
        profileData = userDoc.data();
        setUserProfile(profileData);
      }

      // Check for existing admission
      const admissionsRef = collection(db, 'admissions');
      const q = query(admissionsRef, where('uid', '==', currentUser.uid));
      const admissionSnap = await getDocs(q);
      if (!admissionSnap.empty) {
        setHasApplied(true);
        setUserAdmission(admissionSnap.docs[0].data());
      } else {
        setHasApplied(false);
        setUserAdmission(null);
      }
      
      // If there's a pending course from before login, save it now
      if (pendingCourse) {
        const courseToSelect = pendingCourse;
        setPendingCourse(null); // Clear it first to avoid loops
        // Small delay to ensure auth modal is closed and state settled
        setTimeout(async () => {
          await handleSelectCourse(courseToSelect, currentUser);
        }, 500);
      } else if (profileData && !profileData.selectedCourse && currentUser.email !== "arushafatima748@gmail.com" && profileData.role !== 'teacher') {
        openCourseSelection();
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // --- Firebase Listeners ---
  useEffect(() => {
    console.log("Setting up Firebase listeners");
    document.title = "Madani School System";
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email);
      setUser(user);
      setIsAdmin(user?.email === "arushafatima748@gmail.com");
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        await checkUserProfile(user);
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        });
      } else {
        setUserProfile(null);
        setShowCourseSelection(false);
      }
    });

    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
      console.log("News snapshot received, size:", snapshot.size);
      if (!snapshot.empty) {
        const newsData = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() } as NewsItem));
        setNews(newsData);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("News fetch error:", error);
      setIsLoading(false);
    });

    const qCourses = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubscribeCourses = onSnapshot(qCourses, (snapshot) => {
      console.log("Courses snapshot received, size:", snapshot.size);
      if (!snapshot.empty) {
        const coursesData = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() } as CourseItem));
        setCourses(coursesData);
      }
      setIsCoursesLoading(false);
    }, (error) => {
      console.error("Courses fetch error:", error);
      setIsCoursesLoading(false);
    });

    // Fallback for loading state
    const loadingTimeout = setTimeout(() => {
      if (isCoursesLoading) {
        console.warn("Courses loading timed out, setting to false");
        setIsCoursesLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeNews();
      unsubscribeCourses();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // --- Progress Reports Listener ---
  useEffect(() => {
    if (!user) {
      setProgressReports([]);
      return;
    }

    const reportsRef = collection(db, 'progress_reports');
    // We use a simpler query first to avoid index requirement issues in dev
    const qProgress = canManageReports 
      ? query(reportsRef, orderBy('createdAt', 'desc'))
      : query(reportsRef, where('studentId', '==', user.uid));
    
    setIsReportsLoading(true);
    const unsubscribeProgress = onSnapshot(qProgress, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() } as ProgressReportItem));
      // Manual sort for student query if index isn't ready
      if (!canManageReports) {
        reportsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      }
      setProgressReports(reportsData);
      setIsReportsLoading(false);
    }, (error) => {
      console.error("Progress reports fetch error:", error);
      setIsReportsLoading(false);
    });

    return () => unsubscribeProgress();
  }, [user, canManageReports]);

  // --- Admin Data Listener ---
  useEffect(() => {
    if (!isAdmin) return;

    const qAdmissions = query(collection(db, 'admissions'), orderBy('submittedAt', 'desc'));
    const unsubscribeAdmissions = onSnapshot(qAdmissions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmissions(data);
    });

    // Fetch all users for user management (Admin only)
    const qAllUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeAllUsers = onSnapshot(qAllUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setAllUsers(usersData);
    });

    return () => {
      unsubscribeAdmissions();
      unsubscribeAllUsers();
    };
  }, [isAdmin]);

  // --- Reports Manager Listener (Teachers & Admins) ---
  useEffect(() => {
    if (!canManageReports) return;

    // Fetch students list for reports (Needed by Teachers and Admins)
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, name: doc.data().name }));
      setStudentsList(list);
    });

    return () => {
      unsubscribeStudents();
    };
  }, [canManageReports]);

  // --- Seed Data (First Run) ---
  useEffect(() => {
    const seedData = async () => {
      if (!user || user.email !== "arushafatima748@gmail.com") return;

      const newsSnap = await getDocs(collection(db, 'news'));
      if (newsSnap.empty) {
        const initialNews = [
          { 
            title: "نئے تعلیمی سال کا آغاز", 
            description: "Madani School System میں داخلے کھل گئے ہیں۔", 
            date: "15 March 2025", 
            icon: "graduation-cap",
            createdAt: serverTimestamp() 
          },
          { 
            title: "امتحانات کے نتائج", 
            description: "دورہ حدیث کے امتحانات کے نتائج کا اعلان", 
            date: "10 March 2025", 
            icon: "trophy",
            createdAt: serverTimestamp() 
          }
        ];
        for (const item of initialNews) {
          try {
            await addDoc(collection(db, 'news'), item);
          } catch (e) {
            console.error("Error seeding news:", e);
          }
        }
      }

      const coursesSnap = await getDocs(collection(db, 'courses'));
      if (coursesSnap.empty) {
        const initialCourses = [
          { name: "Hifz-e-Quran", description: "Full Quran Memorization", createdAt: serverTimestamp() },
          { name: "Nazra Quran", description: "Quran reading with Tajweed", createdAt: serverTimestamp() },
          { name: "Dars-e-Nizami", description: "8-year Alimah course", createdAt: serverTimestamp() },
          { name: "Modern Education", description: "Schooling from Playgroup to Class 10", createdAt: serverTimestamp() }
        ];
        for (const item of initialCourses) {
          try {
            await addDoc(collection(db, 'courses'), item);
          } catch (e) {
            console.error("Error seeding courses:", e);
          }
        }
      }
    };

    seedData();
  }, [user]);

  // --- Scroll Listener for Back to Top ---
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Search Logic ---
  const filteredNews = useMemo(() => {
    if (!searchQuery) return news;
    return news.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, news]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    return courses.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, courses]);

  // --- Auth Handlers ---
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user document exists, if not create it
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (userDoc.empty) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'Anonymous',
          email: user.email,
          role: user.email === "arushafatima748@gmail.com" ? 'admin' : 'student',
          createdAt: serverTimestamp()
        });
      }
      
      setIsAuthSuccess(true);
      setTimeout(() => {
        setShowAuthModal(false);
        setIsAuthSuccess(false);
        setIsAuthLoading(false);
      }, 1500);
      await checkUserProfile(user);
    } catch (err: any) {
      setIsAuthLoading(false);
      console.error("Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized in Firebase Console. Please add your Vercel URL to Authorized Domains in Firebase.");
      } else if (err.code === 'auth/operation-not-allowed') {
        alert("Google Sign-in is not enabled in Firebase Console. Please enable it.");
      } else {
        alert(err.message || 'Google Authentication failed');
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        const displayName = authForm.email === "arushafatima748@gmail.com" ? "Madani School System" : authForm.name;
        await updateProfile(userCred.user, { displayName });
        // Create user document with UID as ID
        await setDoc(doc(db, 'users', userCred.user.uid), {
          name: displayName,
          email: authForm.email,
          role: authForm.email === "arushafatima748@gmail.com" ? 'admin' : 'student',
          createdAt: serverTimestamp()
        });
      }
      setIsAuthSuccess(true);
      setTimeout(() => {
        setShowAuthModal(false);
        setIsAuthSuccess(false);
        setIsAuthLoading(false);
      }, 1500);
      if (auth.currentUser) {
        await checkUserProfile(auth.currentUser);
      }
    } catch (err: any) {
      setIsAuthLoading(false);
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        alert("Email/Password login is not enabled in Firebase Console. Please enable it.");
      } else if (err.code === 'auth/email-already-in-use') {
        alert("This email is already in use. Please login instead.");
        setAuthMode('login');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        alert("Incorrect email or password.");
      } else {
        alert(err.message || 'Authentication failed');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out');
    } catch (err) {
      alert('Logout failed');
    }
  };

  // --- Course Selection Handler ---
  const handleAddProgressReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageReports) {
      alert("Only teachers or admins can add reports.");
      return;
    }
    setIsSubmittingAdmin(true);
    try {
      await addDoc(collection(db, 'progress_reports'), {
        ...newReport,
        createdAt: serverTimestamp()
      });
      alert('Progress report added successfully!');
      setShowAddReport(false);
      setNewReport({
        studentId: '',
        studentName: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        attendance: '',
        quranProgress: '',
        academicProgress: '',
        behavior: 'Excellent',
        classParticipation: 'Attentive',
        readingSkills: 'Good',
        writingSkills: 'Good',
        teacherRemarks: ''
      });
    } catch (err: any) {
      alert(err.message || 'Failed to add progress report');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleSelectCourse = async (courseName: string, currentUser?: any) => {
    const activeUser = currentUser || user;
    console.log("handleSelectCourse called for:", courseName, "User:", activeUser?.uid);
    
    if (!activeUser) {
      console.log("No user, setting pending course:", courseName);
      setPendingCourse(courseName);
      setShowCourseSelection(false);
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    setIsSelectingCourse(true);
    try {
      const userRef = doc(db, 'users', activeUser.uid);
      console.log("Updating Firestore for user:", activeUser.uid);
      
      // Use setDoc with merge to ensure the document exists
      await setDoc(userRef, {
        selectedCourse: courseName,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local profile state
      setUserProfile((prev: any) => ({ 
        ...(prev || {}), 
        selectedCourse: courseName 
      }));
      
      // Pre-fill admission form
      setAdmissionForm(prev => ({
        ...prev,
        course: courseName,
        selectedClass: '',
        student_name: activeUser.displayName || prev.student_name,
        email: activeUser.email || prev.email
      }));
      setIsFromCourseSelection(true);

      // Show success state
      setSelectionSuccess(true);
      setShowCourseSelection(true);
      console.log("Course selection successful for:", courseName);
    } catch (err: any) {
      console.error("Course selection error details:", err);
      if (err.message?.includes('permission-denied')) {
        alert('Permission denied. Please try logging out and back in.');
      } else {
        alert('Failed to select course. Please check your internet and try again.');
      }
    } finally {
      setIsSelectingCourse(false);
    }
  };

  // --- Admission Handler ---
  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdmission(true);
    try {
      await addDoc(collection(db, 'admissions'), {
        ...admissionForm,
        uid: user?.uid || null,
        submittedAt: serverTimestamp()
      });
      
      // Call email notification API
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_name: admissionForm.student_name,
            course: admissionForm.course + (admissionForm.selectedClass ? ` (${admissionForm.selectedClass})` : ''),
            email: admissionForm.email
          })
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      setIsAdmissionSuccess(true);
      setHasApplied(true);
      setUserAdmission(admissionForm);
      
      setTimeout(() => {
        setShowAdmission(false);
        setIsAdmissionSuccess(false);
        setIsSubmittingAdmission(false);
        setIsFromCourseSelection(false);
        setAdmissionForm({
          student_name: '', father_name: '', dob: '', gender: 'male', course: 'Hifz Program',
          phone: '', email: '', address: '', additional_info: '', selectedClass: ''
        });
        setAdmissionFile(null);
      }, 2000);
    } catch (err: any) {
      setIsSubmittingAdmission(false);
      alert(err.message || 'Submission failed');
    }
  };

  // --- Result Handler ---
  const handleCheckResult = async () => {
    if (!rollNumber) return alert('Enter Roll Number');
    try {
      const q = query(collection(db, 'results'), where('rollNumber', '==', rollNumber));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setResultData({ found: false, message: "Result not found" });
      } else {
        const data = snapshot.docs[0].data();
        setResultData({ found: true, ...data });
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // --- Admin Handlers ---
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmittingAdmin(true);
    try {
      await addDoc(collection(db, 'news'), {
        ...newNews,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        createdAt: serverTimestamp()
      });
      setNewNews({ title: '', description: '', icon: 'newspaper' });
      alert('News added successfully!');
    } catch (err) {
      alert('Failed to add news');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmittingAdmin(true);
    try {
      await addDoc(collection(db, 'courses'), {
        ...newCourse,
        createdAt: serverTimestamp()
      });
      setNewCourse({ name: '', description: '' });
      alert('Course added successfully!');
    } catch (err) {
      alert('Failed to add course');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDeleteAdmission = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this admission?")) return;
    
    try {
      await deleteDoc(doc(db, 'admissions', id));
      alert("Admission deleted successfully");
    } catch (err) {
      console.error("Error deleting admission:", err);
      alert("Failed to delete admission");
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      alert(`User role updated to ${newRole}`);
    } catch (err: any) {
      console.error("Error updating role:", err);
      alert(err.message || "Failed to update role");
    }
  };

  const downloadAdmissionsExcel = () => {
    if (!admissions || admissions.length === 0) {
      alert("No admissions to download");
      return;
    }

    const dataToExport = admissions.map(adm => ({
      'Student Name': adm.student_name,
      'Father Name': adm.father_name,
      'Course': adm.course,
      'Class': adm.selectedClass || 'N/A',
      'Phone': adm.phone,
      'Email': adm.email,
      'Address': adm.address,
      'Gender': adm.gender,
      'DOB': adm.dob,
      'Additional Info': adm.additional_info,
      'Submitted At': adm.submittedAt?.toDate().toLocaleString() || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions");
    XLSX.writeFile(workbook, `Madani_School_Admissions_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* --- Navigation Bar --- */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-madani-gold/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            {/* Logo on Left */}
            <div className="flex-shrink-0 cursor-pointer flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-madani-green flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white/50 relative overflow-hidden group animate-shine logo-glow">
                {/* Light Calligraphy Background inside Navbar Logo */}
                <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none select-none group-hover:scale-125 transition-transform duration-500">
                  <span className="font-amiri text-[4rem] text-white rotate-[-15deg]">﷽</span>
                </div>
                <BookOpen className="w-6 h-6 absolute opacity-30 group-hover:scale-125 transition-transform" />
                <span className="relative z-10 drop-shadow-sm">M</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-madani-green font-bold text-lg leading-none">Madani</span>
                <span className="text-madani-gold font-semibold text-[10px] tracking-wider uppercase">School System</span>
              </div>
            </div>
            
            {/* Search Box in Middle */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madani-green" />
                <input 
                  type="text" 
                  placeholder="Search news, courses..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-madani-gold/20 focus:border-madani-green rounded-full text-sm shadow-sm transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions on Right */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (user) {
                    setSelectedItem({ 
                      title: 'Welcome Back!', 
                      text: `Assalam-o-Alaikum ${user.displayName || user.email}!\n\nWelcome to Madani School System. Your account is active. You can now fill out the admission form and check your results.` 
                    });
                  } else {
                    setSelectedItem({ 
                      title: 'Notifications', 
                      text: 'No new notifications at this time.\n\nPlease login to receive personalized updates and notifications.' 
                    });
                  }
                }}
                className="relative p-2 text-madani-green hover:bg-madani-light-gold rounded-full transition-colors flex-shrink-0"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              </button>
              
              <div className="flex items-center gap-2 sm:gap-4">
                {canManageReports && (
                  <button 
                    onClick={() => setShowAdminPanel(true)}
                    className="flex items-center gap-2 bg-madani-gold text-madani-green px-4 py-2 rounded-full text-xs font-bold hover:bg-madani-light-gold transition-all shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">{isAdmin ? "Admin Panel" : "Teacher Dashboard"}</span>
                  </button>
                )}
                
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        {userProfile?.role && userProfile.role !== 'student' && (
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                            userProfile.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {userProfile.role}
                          </span>
                        )}
                        <span className="text-sm font-bold text-madani-green">
                          {user.email === "arushafatima748@gmail.com" ? "Madani School System" : (userProfile?.name || user.email)}
                        </span>
                      </div>
                      {userProfile?.selectedCourse && (
                        <span className="text-[10px] font-bold text-madani-gold uppercase tracking-tighter">Course: {userProfile.selectedCourse}</span>
                      )}
                    </div>
                    <button onClick={handleLogout} className="p-2 text-amber-700 hover:bg-amber-50 rounded-full transition-colors">
                      <LogOut className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className="p-2 text-madani-green hover:bg-madani-light-gold rounded-full transition-colors">
                    <LogIn className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header id="home" className="relative py-20 overflow-hidden bg-[#fff9f0]">
        {/* Subtle Calligraphy Background for Hero Section */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none select-none flex items-center justify-center overflow-hidden">
          <span className="font-amiri text-[40rem] text-madani-green rotate-[-10deg]">﷽</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          {isAdmin && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 inline-block bg-madani-gold/20 px-6 py-2 rounded-full border border-madani-gold/30 backdrop-blur-sm"
            >
              <span className="text-madani-green font-bold text-sm">Welcome back, Madani School Admin</span>
            </motion.div>
          )}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-48 h-48 sm:w-64 sm:h-64 rounded-full mx-auto bg-gradient-to-br from-emerald-400 via-madani-green to-teal-500 animate-gradient animate-shine logo-glow flex flex-col items-center justify-center p-6 shadow-2xl border-4 border-white/50 relative overflow-hidden group"
          >
            {/* Light Calligraphy Background */}
            <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none select-none group-hover:scale-110 transition-transform duration-700">
              <span className="font-amiri text-[12rem] text-white rotate-[-15deg]">﷽</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight drop-shadow-md">Madani School System</h1>
              <div className="w-full h-[2px] bg-madani-gold/80 mb-2"></div>
              <p className="font-amiri text-xl sm:text-2xl text-madani-light-gold font-bold drop-shadow-sm">جامعہ فیضان حلیمہ سعدیہ</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 inline-flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-madani-gold/20"
          >
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <CheckCircle className="w-5 h-5 text-madani-green" />
              Wifaqul Madaris Islami Rizviya (HEC Certified)
            </div>
            <p className="font-amiri text-amber-900 text-sm">مدرسہ فیضان حلیمہ سعدیہ چکوال - زیر اہتمام مدنی تحریک</p>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-6"
          >
            <button 
              onClick={openCourseSelection}
              disabled={hasApplied}
              className={`px-10 py-4 rounded-full font-bold shadow-xl transition-all flex items-center gap-3 group border-2 border-white/20 ${hasApplied ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-200/50 hover:scale-105'}`}
            >
              <BookOpen className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              {hasApplied ? "Course Selected" : "Select Your Course"}
            </button>
            <button 
              onClick={() => setShowAdmission(true)}
              className={`px-10 py-4 rounded-full font-bold shadow-xl transition-all flex items-center gap-3 border-2 border-white/20 ${hasApplied ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-200/50 hover:scale-105' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-orange-200/50 hover:scale-105'}`}
            >
              <UserPlus className="w-6 h-6" />
              {hasApplied ? "View My Admission" : "Apply for Admission"}
            </button>
          </motion.div>
        </div>
      </header>

      {/* --- Donation Section --- */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-gradient-to-br from-madani-light-gold to-orange-50 rounded-[3rem] p-8 sm:p-12 text-center shadow-xl border border-amber-400 relative overflow-hidden"
          >
            <div className="absolute bottom-[-20px] right-[-20px] text-9xl opacity-5 font-amiri text-madani-green">﷽</div>
            <h2 className="text-3xl font-bold text-amber-900 mb-4 flex items-center justify-center gap-3">
              <Heart className="w-8 h-8 fill-amber-600 text-amber-600" />
              Donate for Sadaqah Jariyah
            </h2>
            <p className="font-amiri text-2xl text-amber-800 italic mb-8">"The best among you are those who benefit others." 🌙</p>
            <button 
              onClick={() => setSelectedItem({ title: 'Donation', text: 'Choose donation type:\n\nMonthly: Bank Meezan, A/C: 1234-5678\nOne Time: Bank Meezan, A/C: 1234-5678\nSadaqah: Bank Meezan (Waqf), A/C: 9876-5432' })}
              className="bg-madani-green text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-madani-gold hover:text-madani-green transition-all border-2 border-madani-gold"
            >
              Give Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- Services Section --- */}
      <section id="services" className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-madani-green text-center mb-12 relative">
            Our Pages & Services
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madani-gold via-amber-400 to-madani-gold rounded-full shadow-sm"></div>
          </h2>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {[
              { 
                icon: Mic2, 
                title: 'Hifz', 
                gradient: 'from-emerald-400 to-teal-500',
                action: () => setSelectedItem({ 
                  title: 'Hifz Program', 
                  text: 'Our Hifz program focuses on complete Quran memorization with proper Tajweed rules.' 
                })
              },
              { 
                icon: BookMarked, 
                title: 'Nazra', 
                gradient: 'from-amber-400 to-orange-500',
                action: () => setSelectedItem({ 
                  title: 'Nazra Quran', 
                  text: 'Nazra Quran course is designed for beginners to learn how to read the Quran with correct pronunciation.' 
                })
              },
              { 
                icon: Scroll, 
                title: 'Dars', 
                gradient: 'from-blue-400 to-indigo-500',
                action: () => setSelectedItem({ 
                  title: 'Dars-e-Nizami', 
                  text: 'The Alimah Course (Dars-e-Nizami) is an 8-year comprehensive study of Islamic sciences.' 
                })
              },
              { 
                icon: Laptop, 
                title: 'Modern', 
                gradient: 'from-purple-400 to-pink-500',
                action: () => setSelectedItem({ 
                  title: 'Modern Education', 
                  text: 'Along with Islamic studies, we provide modern school education from Playgroup to Class 5.' 
                })
              },
              { 
                icon: UserPlus, 
                title: 'Admission', 
                gradient: 'from-rose-400 to-red-500', 
                action: () => setShowAdmission(true) 
              },
              { 
                icon: Trophy, 
                title: 'Result', 
                gradient: 'from-cyan-400 to-blue-500', 
                action: () => setShowResult(true) 
              },
              { 
                icon: FileText, 
                title: canManageReports ? 'Manage Reports' : 'My Progress', 
                gradient: 'from-violet-400 to-purple-600', 
                action: () => setShowProgressReports(true) 
              },
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10, scale: 1.1 }}
                onClick={service.action}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${service.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-2xl transition-all border-4 border-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <service.icon className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform relative z-10" />
                </div>
                <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{service.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- News Section --- */}
      <section id="news" className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-madani-green text-center mb-12 relative">
            Latest News
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madani-gold via-amber-400 to-madani-gold rounded-full shadow-sm"></div>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {isLoading ? (
              <div className="col-span-full text-center py-10">Loading news...</div>
            ) : filteredNews.length > 0 ? filteredNews.map((news) => (
              <motion.div 
                key={news._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] shadow-lg border border-madani-gold/20 hover:shadow-xl transition-all group"
              >
                <div className="text-madani-green mb-4 group-hover:scale-110 transition-transform">
                  {news.icon === 'graduation-cap' ? <GraduationCap className="w-10 h-10" /> : <Newspaper className="w-10 h-10" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="w-4 h-4 text-madani-gold" />
                  {news.date}
                </div>
                <h3 className="text-xl font-bold text-madani-green mb-3">{news.title}</h3>
                <p className="text-slate-600 mb-6">{news.description}</p>
                <button 
                  onClick={() => setSelectedItem({ title: news.title, text: news.fullMessage || news.description })}
                  className="inline-flex items-center gap-2 bg-emerald-50 text-madani-green px-5 py-2 rounded-full font-semibold hover:bg-madani-green hover:text-white transition-all border border-madani-gold/30"
                >
                  Open Message <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-10 text-slate-500 italic">No news found matching your search.</div>
            )}
          </div>
        </div>
      </section>

      {/* --- Courses Section --- */}
      <section id="courses" className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-madani-green text-center mb-12 relative">
            Courses Offered
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madani-gold via-amber-400 to-madani-gold rounded-full shadow-sm"></div>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {isCoursesLoading ? (
              <div className="col-span-full text-center py-10">
                <div className="w-10 h-10 border-4 border-madani-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500">Loading courses...</p>
              </div>
            ) : filteredCourses.length > 0 ? filteredCourses.map((course, idx) => {
              const gradients = [
                'from-emerald-500 to-teal-600',
                'from-amber-500 to-orange-600',
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-600',
                'from-rose-500 to-red-600',
                'from-cyan-500 to-blue-600'
              ];
              const gradient = gradients[idx % gradients.length];
              
              return (
                <motion.div
                  key={course._id}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="relative bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col group"
                >
                  <div className={`h-3 w-full bg-gradient-to-r ${gradient}`} />
                  <div className="p-8 flex flex-col flex-grow">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 shadow-lg group-hover:rotate-6 transition-transform`}>
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-madani-green transition-colors">{course.name}</h3>
                    <p className="text-slate-600 leading-relaxed mb-8 flex-grow">{course.description}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedItem({ title: course.name, text: course.description })}
                        className="flex-1 px-6 py-3 rounded-full border-2 border-slate-100 text-sm font-bold hover:bg-slate-50 transition-all text-slate-700"
                      >
                        Details
                      </button>
                      <button
                        disabled={isSelectingCourse}
                        onClick={() => handleSelectCourse(course.name)}
                        className={`flex-1 px-6 py-3 rounded-full bg-gradient-to-r ${gradient} text-white text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                      >
                        {isSelectingCourse ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        Select
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="col-span-full text-center py-10 text-slate-500 italic">No courses found matching your search.</div>
            )}
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section id="contact" className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-madani-green mb-8 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-madani-gold" />
              Contact Us
            </h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madani-light-gold flex items-center justify-center text-madani-green">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Chakwal, Punjab, Pakistan</span>
              </div>
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madani-light-gold flex items-center justify-center text-madani-green">
                  <Phone className="w-5 h-5" />
                </div>
                <span>03215972120</span>
              </div>
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madani-light-gold flex items-center justify-center text-madani-green">
                  <Mail className="w-5 h-5" />
                </div>
                <span>madanischool72@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-madani-gold/20">
            <h3 className="text-xl font-bold text-madani-green mb-4">Our Location</h3>
            <div className="aspect-video rounded-2xl overflow-hidden shadow-inner border border-slate-200">
              <iframe 
                src="https://maps.google.com/maps?q=Chakwal%2C%20Punjab%2C%20Pakistan&t=&z=13&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* --- Admin Panel Button (Floating) --- */}
      {isAdmin && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdminPanel(true)}
          className="fixed bottom-24 right-6 z-[100] bg-madani-green text-white px-6 py-4 rounded-full shadow-[0_0_20px_rgba(30,70,59,0.3)] border-2 border-madani-gold flex items-center gap-3 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
          <Trophy className="w-6 h-6 text-madani-gold animate-pulse" />
          <span className="font-bold tracking-wide">Admin Dashboard</span>
        </motion.button>
      )}

      {/* --- Footer --- */}
      <footer className="mt-auto madani-gradient animate-gradient py-6 text-white border-t-4 border-madani-gold shadow-2xl relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-wrap justify-center gap-2 mb-6 opacity-20 font-amiri text-lg tracking-[0.5em] select-none">
            أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center md:text-left mb-4">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-madani-gold/30">
                  <BookOpen className="w-5 h-5 text-madani-gold" />
                </div>
                <span className="text-lg font-bold tracking-tight">Madani School System</span>
              </div>
              <p className="text-[10px] text-madani-light-gold/80 max-w-xs">
                Quality Islamic and modern education since 2015. HEC certified.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <ul className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-madani-gold transition-colors">Home</button></li>
                <li><button onClick={() => setShowAdmission(true)} className="hover:text-madani-gold transition-colors">Admissions</button></li>
                <li><button onClick={() => setShowResult(true)} className="hover:text-madani-gold transition-colors">Results</button></li>
              </ul>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1">
              <div className="text-[10px] space-y-0.5 text-center md:text-right opacity-80">
                <p>Chakwal, Pakistan</p>
                <p>+92 300 1234567</p>
                <p>info@madanischool.edu.pk</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 text-center">
            <p className="text-[10px] font-medium opacity-60">&copy; 2025 Madani School System | جامعہ حلیمہ سعدیہ</p>
            <p className="text-[8px] opacity-30 mt-0.5 uppercase tracking-widest">Last Updated: April 2026</p>
          </div>
        </div>
      </footer>

      {/* --- Modals --- */}
      
      {/* Course Selection Modal */}
      <AnimatePresence>
        {showCourseSelection && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-madani-gold relative z-10 max-h-[90vh] overflow-y-auto"
            >
              {(!user || userProfile?.selectedCourse || isAdmin || userProfile?.role === 'teacher') && (
                <button 
                  onClick={() => { setShowCourseSelection(false); setSelectionSuccess(false); }}
                  className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-madani-green transition-colors z-20"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
              {selectionSuccess ? (
                <div className="text-center py-8">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 mx-auto mb-6 flex items-center justify-center text-emerald-600 border-4 border-emerald-200">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-bold text-madani-green mb-4">Congratulations!</h3>
                  <p className="text-slate-700 text-lg leading-relaxed mb-8">
                    Your selection for <span className="font-bold text-madani-gold">{userProfile?.selectedCourse}</span> has been recorded.<br/><br/>
                    Student admission process in <span className="font-bold">Jamia Halima Sadia</span> is now being processed.
                  </p>
                  <button 
                    onClick={() => { 
                      setShowCourseSelection(false); 
                      setSelectionSuccess(false);
                      setShowAdmission(true);
                    }}
                    className="w-full bg-madani-green text-white py-4 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all shadow-lg"
                  >
                    Complete Admission Form
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full madani-gradient mx-auto mb-4 flex items-center justify-center text-white border-4 border-madani-gold/30">
                      <BookOpen className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-bold text-madani-green">Select Your Course</h3>
                    <p className="text-slate-600 mt-2">Please choose the course you are interested in to continue.</p>
                  </div>
                  
                  <div className="grid gap-4">
                    {courses.length > 0 ? courses.map((course) => (
                      <motion.button
                        key={course._id}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSelectingCourse}
                        onClick={() => handleSelectCourse(course.name)}
                        className="group p-5 rounded-2xl border-2 border-slate-100 hover:border-madani-gold hover:bg-madani-light-gold transition-all text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <h4 className="font-bold text-madani-green group-hover:text-madani-green">{course.name}</h4>
                          <p className="text-sm text-slate-500">{course.description}</p>
                        </div>
                        {isSelectingCourse ? (
                          <div className="w-5 h-5 border-2 border-madani-gold border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-madani-gold" />
                        )}
                      </motion.button>
                    )) : isCoursesLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-madani-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-medium">Loading courses...</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="mt-4 text-sm text-madani-green hover:underline font-bold"
                        >
                          Taking too long? Click to Refresh
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-10 px-6 text-slate-500 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="mb-4">No courses available at the moment.</p>
                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => window.location.reload()}
                            className="text-madani-green font-bold hover:underline"
                          >
                            Refresh Page
                          </button>
                          {isAdmin && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                              <p className="text-xs text-amber-800 mb-2 not-italic">
                                Admin: No courses found. Click below to add default courses.
                              </p>
                              <button 
                                onClick={async () => {
                                  setIsSelectingCourse(true);
                                  const initialCourses = [
                                    { name: "Hifz-e-Quran", description: "Full Quran Memorization", createdAt: serverTimestamp() },
                                    { name: "Nazra Quran", description: "Quran reading with Tajweed", createdAt: serverTimestamp() },
                                    { name: "Dars-e-Nizami", description: "8-year Alimah course", createdAt: serverTimestamp() },
                                    { name: "Modern Education", description: "Schooling from Playgroup to Class 10", createdAt: serverTimestamp() }
                                  ];
                                  for (const item of initialCourses) {
                                    await addDoc(collection(db, 'courses'), item);
                                  }
                                  setIsSelectingCourse(false);
                                  alert("Default courses added!");
                                }}
                                className="w-full bg-madani-green text-white py-2 rounded-full text-xs font-bold shadow-sm"
                              >
                                Seed Default Courses
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-center text-xs text-slate-400 mt-8 italic">
                    You can change your course later from your profile.
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdminPanel(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-4xl w-full shadow-2xl border-4 border-madani-gold relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madani-green">Admin Control Panel</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                </div>
              </div>

              {/* Admin Tabs */}
              <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                {[
                  { id: 'admissions', label: 'Admissions', icon: UserPlus, adminOnly: true },
                  { id: 'reports', label: 'Student Reports', icon: FileText, adminOnly: false },
                  { id: 'news', label: 'News & Courses', icon: Newspaper, adminOnly: true },
                  { id: 'users', label: 'User Management', icon: GraduationCap, adminOnly: true }
                ].filter(tab => !tab.adminOnly || isAdmin).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAdminTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${
                      adminTab === tab.id 
                        ? 'border-madani-green text-madani-green bg-emerald-50' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {adminTab === 'reports' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-madani-green flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Manage Progress Reports
                    </h4>
                    <button 
                      onClick={() => setShowAddReport(true)}
                      className="bg-madani-green text-white px-6 py-2 rounded-full font-bold text-xs hover:bg-madani-gold hover:text-madani-green transition-all shadow-md"
                    >
                      + Add New Report
                    </button>
                  </div>
                  
                  {isReportsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-madani-gold mb-4" />
                      <p className="text-slate-500">Loading reports...</p>
                    </div>
                  ) : progressReports.length > 0 ? (
                    <div className="grid gap-4">
                      {progressReports.map((report) => (
                        <div key={report._id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center hover:shadow-md transition-all">
                          <div>
                            <h5 className="font-bold text-madani-green">{report.studentName}</h5>
                            <p className="text-xs text-slate-500">{report.month} {report.year} • Attendance: {report.attendance}%</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                // Logic to view report
                                setSelectedItem({ 
                                  title: `Progress Report: ${report.studentName}`, 
                                  text: `Month: ${report.month} ${report.year}\nAttendance: ${report.attendance}%\nQuran: ${report.quranProgress}\nAcademic: ${report.academicProgress}\nBehavior: ${report.behavior}\nRemarks: ${report.teacherRemarks}` 
                                });
                              }}
                              className="p-2 text-madani-green hover:bg-white rounded-full transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm("Delete this report?")) {
                                  try {
                                    await deleteDoc(doc(db, 'progress_reports', report._id));
                                  } catch (err) {
                                    alert("Error deleting report");
                                  }
                                }
                              }}
                              className="p-2 text-red-500 hover:bg-white rounded-full transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 italic">No reports found.</p>
                    </div>
                  )}
                </div>
              )}

              {adminTab === 'news' && (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                  {/* Add News Form */}
                  <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="font-bold text-madani-green flex items-center gap-2">
                      <Newspaper className="w-5 h-5" /> Add New News
                    </h4>
                    <form onSubmit={handleAddNews} className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="News Title" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-madani-green"
                        value={newNews.title}
                        onChange={e => setNewNews({...newNews, title: e.target.value})}
                        required
                      />
                      <textarea 
                        placeholder="News Description" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-madani-green"
                        rows={3}
                        value={newNews.description}
                        onChange={e => setNewNews({...newNews, description: e.target.value})}
                        required
                      />
                      <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-madani-green"
                        value={newNews.icon}
                        onChange={e => setNewNews({...newNews, icon: e.target.value})}
                      >
                        <option value="newspaper">News Icon</option>
                        <option value="graduation-cap">Education Icon</option>
                        <option value="trophy">Trophy Icon</option>
                      </select>
                      <button 
                        type="submit" 
                        disabled={isSubmittingAdmin}
                        className="w-full bg-madani-green text-white py-2 rounded-full font-bold hover:bg-madani-gold hover:text-madani-green transition-all"
                      >
                        {isSubmittingAdmin ? 'Adding...' : 'Add News'}
                      </button>
                    </form>
                  </div>

                  {/* Add Course Form */}
                  <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="font-bold text-madani-green flex items-center gap-2">
                      <BookOpen className="w-5 h-5" /> Add New Course
                    </h4>
                    <form onSubmit={handleAddCourse} className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Course Name" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-madani-green"
                        value={newCourse.name}
                        onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                        required
                      />
                      <textarea 
                        placeholder="Course Description" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-madani-green"
                        rows={3}
                        value={newCourse.description}
                        onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                        required
                      />
                      <button 
                        type="submit" 
                        disabled={isSubmittingAdmin}
                        className="w-full bg-madani-green text-white py-2 rounded-full font-bold hover:bg-madani-gold hover:text-madani-green transition-all"
                      >
                        {isSubmittingAdmin ? 'Adding...' : 'Add Course'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {adminTab === 'admissions' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-madani-green flex items-center gap-2">
                      <UserPlus className="w-5 h-5" /> All Admissions ({admissions.length})
                    </h4>
                    <button 
                      onClick={downloadAdmissionsExcel}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-emerald-700 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" /> Export Excel
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-madani-green text-white">
                          <th className="p-3 text-sm">Student</th>
                          <th className="p-3 text-sm">Father Name</th>
                          <th className="p-3 text-sm">Course</th>
                          <th className="p-3 text-sm">Phone</th>
                          <th className="p-3 text-sm">Address</th>
                          <th className="p-3 text-sm">Date</th>
                          <th className="p-3 text-sm text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissions.length > 0 ? admissions.map((adm) => (
                          <tr key={adm.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-sm font-bold text-madani-green">{adm.student_name}</td>
                            <td className="p-3 text-sm text-slate-600">{adm.father_name}</td>
                            <td className="p-3 text-sm font-medium">
                              {adm.course}
                              {adm.selectedClass && (
                                <span className="block text-[10px] text-madani-gold font-bold uppercase">Class: {adm.selectedClass}</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-slate-600">{adm.phone}</td>
                            <td className="p-3 text-sm text-slate-500 truncate max-w-[150px]">{adm.address}</td>
                            <td className="p-3 text-sm text-slate-400">
                              {adm.submittedAt?.toDate().toLocaleDateString() || 'Pending'}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteAdmission(adm.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Admission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-slate-400 italic">No admissions yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminTab === 'users' && (
                <div className="animate-in fade-in duration-300">
                  <h4 className="font-bold text-madani-green mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Registered Users ({allUsers.length})
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-madani-green text-white">
                          <th className="p-3 text-sm">Name</th>
                          <th className="p-3 text-sm">Email</th>
                          <th className="p-3 text-sm">Role</th>
                          <th className="p-3 text-sm">Joined</th>
                          <th className="p-3 text-sm text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.length > 0 ? allUsers.map((u) => (
                          <tr key={u.uid} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-sm font-bold text-slate-800">{u.name}</td>
                            <td className="p-3 text-sm text-slate-600">{u.email}</td>
                            <td className="p-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                u.role === 'teacher' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}>
                                {u.role || 'student'}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-slate-400">
                              {u.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="p-3 text-center">
                              {u.email !== "arushafatima748@gmail.com" && (
                                <div className="flex items-center justify-center gap-2">
                                  {u.role !== 'teacher' && (
                                    <button 
                                      onClick={() => updateUserRole(u.uid, 'teacher')}
                                      className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full hover:bg-blue-700 transition-all"
                                    >
                                      Make Teacher
                                    </button>
                                  )}
                                  {u.role === 'teacher' && (
                                    <button 
                                      onClick={() => updateUserRole(u.uid, 'student')}
                                      className="px-3 py-1 bg-slate-400 text-white text-[10px] font-bold rounded-full hover:bg-slate-500 transition-all"
                                    >
                                      Make Student
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-10 text-center text-slate-400 italic">No users registered yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madani-gold relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madani-green">{authMode === 'login' ? 'Login' : 'Signup'}</h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {isAuthSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="flex flex-col items-center justify-center py-8 text-emerald-600"
                  >
                    <CheckCircle className="w-16 h-16 mb-4" />
                    <p className="text-xl font-bold">Success!</p>
                  </motion.div>
                ) : (
                  <>
                    {authMode === 'signup' && (
                      <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                    )}
                    <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isAuthLoading}
                      className="w-full bg-madani-green text-white py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {authMode === 'login' ? 'Login' : 'Signup'}
                    </button>
                  </>
                )}
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with</span></div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-all"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Login with Google
              </button>
              <p className="mt-4 text-center text-slate-600">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-madani-green font-bold hover:underline">
                  {authMode === 'login' ? 'Signup' : 'Login'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admission Modal */}
      <AnimatePresence>
        {showAdmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAdmission(false); setIsFromCourseSelection(false); }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-madani-gold relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-madani-green">Admission Form</h3>
                  {user && <p className="text-xs text-slate-500">Logged in as: {user.email}</p>}
                  {isFromCourseSelection && !hasApplied && (
                    <p className="text-xs font-bold text-emerald-600 mt-1">
                      Step 2: Please complete your information for {admissionForm.course}
                    </p>
                  )}
                </div>
                <button onClick={() => { setShowAdmission(false); setIsFromCourseSelection(false); }} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              
              {isAdmissionSuccess ? (
                <div className="text-center py-12 bg-emerald-50 rounded-3xl border-2 border-emerald-200">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex justify-center mb-4">
                    <CheckCircle className="w-16 h-16 text-emerald-600" />
                  </motion.div>
                  <h4 className="text-2xl font-bold text-emerald-800 mb-2">Submitted!</h4>
                  <p className="text-slate-600">Your admission form has been received successfully.</p>
                </div>
              ) : hasApplied ? (
                <div className="text-center py-10 bg-emerald-50 rounded-3xl border-2 border-emerald-200">
                  <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-emerald-800 mb-2">Already Applied!</h4>
                  <p className="text-slate-600 mb-6 px-6">
                    Assalam-o-Alaikum! You have already submitted an admission application for 
                    <span className="font-bold text-madani-green"> {userAdmission?.course || 'your selected course'}</span>.
                  </p>
                  <div className="bg-white mx-6 p-4 rounded-2xl shadow-sm text-left space-y-2 mb-8">
                    <p className="text-sm"><strong>Student:</strong> {userAdmission?.student_name}</p>
                    <p className="text-sm"><strong>Status:</strong> Under Review</p>
                    <p className="text-sm"><strong>Submitted:</strong> {userAdmission?.submittedAt?.toDate().toLocaleDateString() || 'Recently'}</p>
                  </div>
                  <button 
                    onClick={() => setShowAdmission(false)}
                    className="bg-madani-green text-white px-8 py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdmissionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Student Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.student_name} onChange={e => setAdmissionForm({...admissionForm, student_name: e.target.value})} required />
                  <input type="text" placeholder="Father's Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.father_name} onChange={e => setAdmissionForm({...admissionForm, father_name: e.target.value})} required />
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.dob} onChange={e => setAdmissionForm({...admissionForm, dob: e.target.value})} required />
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.gender} onChange={e => setAdmissionForm({...admissionForm, gender: e.target.value})}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-madani-green mb-1 ml-1 uppercase">Select Course</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none bg-white" 
                      value={admissionForm.course} 
                      onChange={e => setAdmissionForm({...admissionForm, course: e.target.value, selectedClass: ''})}
                    >
                      {courses.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {admissionForm.course.toLowerCase().includes("modern education") && (
                    <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs font-bold text-madani-gold mb-1 ml-1 uppercase">Select Class (Required for Modern Education)</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl border-2 border-madani-gold bg-madani-light-gold/30 outline-none font-bold text-madani-green" 
                        value={admissionForm.selectedClass} 
                        onChange={e => setAdmissionForm({...admissionForm, selectedClass: e.target.value})}
                        required
                      >
                        <option value="">-- Choose Class --</option>
                        <option value="Playgroup">Playgroup</option>
                        <option value="Nursery">Nursery</option>
                        <option value="Prep">Prep</option>
                        <option value="Class 1">Class 1</option>
                        <option value="Class 2">Class 2</option>
                        <option value="Class 3">Class 3</option>
                        <option value="Class 4">Class 4</option>
                        <option value="Class 5">Class 5</option>
                        <option value="Class 6">Class 6</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                      </select>
                    </div>
                  )}
                  <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.phone} onChange={e => setAdmissionForm({...admissionForm, phone: e.target.value})} required />
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.email} onChange={e => setAdmissionForm({...admissionForm, email: e.target.value})} required />
                  <input type="text" placeholder="Address" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={admissionForm.address} onChange={e => setAdmissionForm({...admissionForm, address: e.target.value})} required />
                </div>
                <textarea placeholder="Additional Info" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" rows={3} value={admissionForm.additional_info} onChange={e => setAdmissionForm({...admissionForm, additional_info: e.target.value})} />
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                  <input type="file" id="file-upload" className="hidden" onChange={e => setAdmissionFile(e.target.files?.[0] || null)} />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 text-slate-500">
                    <Upload className="w-8 h-8" />
                    <span>{admissionFile ? admissionFile.name : "Upload Student Image/Documents"}</span>
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingAdmission}
                  className="w-full bg-madani-green text-white py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAdmission ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSubmittingAdmission ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResult(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madani-gold relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madani-green">Check Result</h3>
                <button onClick={() => setShowResult(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Roll Number (e.g., 2025-001)" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none text-center font-bold" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" value={examType} onChange={e => setExamType(e.target.value)}>
                  <option value="">Select Exam (optional)</option>
                  <option value="Annual 2025">Annual 2025</option>
                  <option value="Mid Term 2025">Mid Term 2025</option>
                </select>
                <button onClick={handleCheckResult} className="w-full bg-madani-green text-white py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" /> Show Result
                </button>
                
                {resultData && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                    {resultData.found ? (
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1"><span>Name:</span><span className="font-bold">{resultData.name}</span></div>
                        <div className="flex justify-between border-b pb-1"><span>Exam:</span><span className="font-bold">{resultData.exam}</span></div>
                        <div className="flex justify-between border-b pb-1"><span>Marks:</span><span className="font-bold">{resultData.marks}</span></div>
                        <div className="flex justify-between border-b pb-1"><span>Grade:</span><span className="font-bold">{resultData.grade}</span></div>
                        <div className="flex justify-between"><span>Status:</span><span className={`font-bold ${resultData.status === 'Pass' ? 'text-emerald-600' : 'text-red-600'}`}>{resultData.status}</span></div>
                      </div>
                    ) : (
                      <p className="text-center text-red-600 font-bold">{resultData.message || "No result found"}</p>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madani-gold relative z-10">
              <h3 className="text-2xl font-bold text-madani-green mb-4">{selectedItem.title}</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line mb-8">{selectedItem.text}</p>
              <button onClick={() => setSelectedItem(null)} className="w-full bg-madani-green text-white py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Reports Modal */}
      <AnimatePresence>
        {showProgressReports && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProgressReports(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-4xl w-full shadow-2xl border-4 border-madani-gold relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-madani-green">
                    {canManageReports ? "Manage Progress Reports" : "My Progress Reports"}
                  </h3>
                  <p className="text-slate-500 text-sm">Track monthly progress and evaluations</p>
                </div>
                <div className="flex items-center gap-3">
                  {canManageReports && (
                    <button 
                      onClick={() => setShowAddReport(true)}
                      className="bg-madani-green text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-madani-gold hover:text-madani-green transition-all shadow-md flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Add New Report
                    </button>
                  )}
                  <button onClick={() => setShowProgressReports(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                </div>
              </div>

              {isReportsLoading ? (
                <div className="text-center py-20 text-slate-400 italic">Loading reports...</div>
              ) : progressReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {progressReports.map((report) => (
                    <motion.div 
                      key={report._id} 
                      className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 relative group overflow-hidden"
                      whileHover={{ y: -5 }}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Scroll className="w-20 h-20 text-madani-green" />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="bg-madani-gold/20 text-madani-green text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                            {report.month} {report.year}
                          </span>
                          <h4 className="text-lg font-bold text-slate-800">{report.studentName}</h4>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          report.behavior === 'Excellent' ? 'bg-emerald-200 text-emerald-800' : 
                          report.behavior === 'Good' ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'
                        }`}>
                          {report.behavior}
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span><strong>Attendance:</strong> {report.attendance}</span>
                        </div>
                        <div className="p-3 bg-white/60 rounded-xl">
                          <p className="text-xs font-bold text-madani-green uppercase mb-1 flex justify-between">
                            <span>Quranic Progress</span>
                            <span className="font-amiri text-sm">قرآنی علمیت</span>
                          </p>
                          <p className="text-sm text-slate-700">{report.quranProgress}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white/40 rounded-lg">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                              <span>Class Behavior</span>
                              <span className="font-amiri text-xs">کلاس رویہ</span>
                            </p>
                            <p className="text-xs text-slate-700">{report.classParticipation}</p>
                          </div>
                          <div className="p-2 bg-white/40 rounded-lg">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                              <span>Reading</span>
                              <span className="font-amiri text-xs">پڑھنا</span>
                            </p>
                            <p className="text-xs text-slate-700">{report.readingSkills}</p>
                          </div>
                          <div className="p-2 bg-white/40 rounded-lg">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                              <span>Writing</span>
                              <span className="font-amiri text-xs">لکھنا</span>
                            </p>
                            <p className="text-xs text-slate-700">{report.writingSkills}</p>
                          </div>
                        </div>
                        {report.academicProgress && (
                          <div className="p-3 bg-white/60 rounded-xl">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-1">Academic Progress</p>
                            <p className="text-sm text-slate-700">{report.academicProgress}</p>
                          </div>
                        )}
                        {report.teacherRemarks && (
                          <div className="p-3 bg-madani-gold/5 rounded-xl border border-madani-gold/10">
                            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Teacher Remarks</p>
                            <p className="text-sm italic text-slate-700">"{report.teacherRemarks}"</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                        <span className="text-[10px] text-slate-400">Issued: {report.createdAt?.toDate().toLocaleDateString() || 'Recently'}</span>
                        {canManageReports && (
                          <button 
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this report?')) {
                                await deleteDoc(doc(db, 'progress_reports', report._id));
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No progress reports found yet.</p>
                  {canManageReports && (
                    <button 
                      onClick={() => setShowAddReport(true)}
                      className="mt-4 text-madani-green font-bold hover:underline"
                    >
                      Create the first report
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Progress Report Modal */}
      <AnimatePresence>
        {showAddReport && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddReport(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-madani-gold relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madani-green">New Progress Report</h3>
                <button onClick={() => setShowAddReport(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <form onSubmit={handleAddProgressReport} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Select Student</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.studentId}
                      onChange={(e) => {
                        const std = studentsList.find(s => s.uid === e.target.value);
                        setNewReport({ ...newReport, studentId: e.target.value, studentName: std?.name || '' });
                      }}
                      required
                    >
                      <option value="">-- Choose Student --</option>
                      {studentsList.map(s => (
                        <option key={s.uid} value={s.uid}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Attendance</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 25/26 Days" 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.attendance}
                      onChange={e => setNewReport({...newReport, attendance: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Month</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.month}
                      onChange={e => setNewReport({...newReport, month: e.target.value})}
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Year</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.year}
                      onChange={e => setNewReport({...newReport, year: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 uppercase mb-1 ml-1">Quranic Progress</label>
                  <textarea 
                    placeholder="Describe progress in Quranic studies..." 
                    className="w-full px-4 py-3 rounded-xl border-2 border-emerald-100 focus:border-madani-gold outline-none" 
                    rows={2}
                    value={newReport.quranProgress}
                    onChange={e => setNewReport({...newReport, quranProgress: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-1 ml-1">Academic Progress</label>
                  <textarea 
                    placeholder="Describe progress in English, Urdu, Maths etc..." 
                    className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-madani-gold outline-none" 
                    rows={2}
                    value={newReport.academicProgress}
                    onChange={e => setNewReport({...newReport, academicProgress: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 flex justify-between">
                      <span>Behavior (Overall)</span>
                      <span className="font-amiri text-sm">مجموعی رویہ</span>
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.behavior}
                      onChange={e => setNewReport({...newReport, behavior: e.target.value})}
                    >
                      <option value="Excellent">Excellent (بہترین)</option>
                      <option value="Good">Good (اچھا)</option>
                      <option value="Average">Average (مناسب)</option>
                      <option value="Needs Improvement">Needs Improvement (اصلاح کی ضرورت)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 flex justify-between">
                      <span>Sitting in Class</span>
                      <span className="font-amiri text-sm">کلاس میں بیٹھنا</span>
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.classParticipation}
                      onChange={e => setNewReport({...newReport, classParticipation: e.target.value})}
                    >
                      <option value="Attentive">Attentive (متوجہ)</option>
                      <option value="Restless">Restless (بے چین)</option>
                      <option value="Playful">Playful (شرارتی)</option>
                      <option value="Quiet">Quiet (خاموش)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 flex justify-between">
                      <span>Reading Skills</span>
                      <span className="font-amiri text-sm">پڑھنے کی صلاحیت</span>
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.readingSkills}
                      onChange={e => setNewReport({...newReport, readingSkills: e.target.value})}
                    >
                      <option value="Fluent">Fluent (رواں)</option>
                      <option value="Good">Good (اچھا)</option>
                      <option value="Improving">Improving (بہتر ہو رہا ہے)</option>
                      <option value="Needs Practice">Needs Practice (مشق کی ضرورت)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 flex justify-between">
                      <span>Writing Skills</span>
                      <span className="font-amiri text-sm">لکھنے کی صلاحیت</span>
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none" 
                      value={newReport.writingSkills}
                      onChange={e => setNewReport({...newReport, writingSkills: e.target.value})}
                    >
                      <option value="Excellent">Excellent (بہترین)</option>
                      <option value="Good">Good (اچھا)</option>
                      <option value="Average">Average (مناسب)</option>
                      <option value="Below Average">Below Average (کمزور)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase mb-1 ml-1">Teacher Remarks</label>
                  <textarea 
                    placeholder="Personalized remarks for student..." 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madani-gold outline-none bg-amber-50/30" 
                    rows={2}
                    value={newReport.teacherRemarks}
                    onChange={e => setNewReport({...newReport, teacherRemarks: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingAdmin}
                  className="w-full bg-madani-green text-white py-3 rounded-full font-bold border-2 border-madani-gold hover:bg-madani-gold hover:text-madani-green transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAdmin ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSubmittingAdmin ? "Saving..." : "Save Progress Report"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Back to Top Button --- */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-madani-green text-white flex items-center justify-center shadow-2xl border-2 border-madani-gold z-[60] hover:bg-madani-gold hover:text-madani-green transition-all"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
