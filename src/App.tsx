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
  Bell,
  LogIn,
  LogOut,
  X,
  Eye,
  EyeOff,
  Send,
  Upload,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  getDocs
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  
  // Data State
  const [news, setNews] = useState<NewsItem[]>([
    { 
      _id: 'default-1', 
      title: "نئے تعلیمی سال کا آغاز", 
      description: "Madni School میں داخلے کھل گئے ہیں۔", 
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
    { _id: 'default-c3', name: "Dars-e-Nizami", description: "8-year Alim course" }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admission Form State
  const [showAdmission, setShowAdmission] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    student_name: '', father_name: '', dob: '', gender: 'male', course: 'Hifz Program',
    phone: '', email: '', address: '', additional_info: ''
  });
  const [admissionFile, setAdmissionFile] = useState<File | null>(null);
  
  // Result State
  const [showResult, setShowResult] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [examType, setExamType] = useState('');
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // --- Firebase Listeners ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
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
      if (!snapshot.empty) {
        const coursesData = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() } as CourseItem));
        setCourses(coursesData);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeNews();
      unsubscribeCourses();
    };
  }, []);

  // --- Seed Data (First Run) ---
  useEffect(() => {
    const seedData = async () => {
      if (!user || user.email !== "arushafatima748@gmail.com") return;

      const newsSnap = await getDocs(collection(db, 'news'));
      if (newsSnap.empty) {
        const initialNews = [
          { 
            title: "نئے تعلیمی سال کا آغاز", 
            description: "Madni School میں داخلے کھل گئے ہیں۔", 
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
          { name: "Dars-e-Nizami", description: "8-year Alim course", createdAt: serverTimestamp() }
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
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        alert('Login successful!');
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await updateProfile(userCred.user, { displayName: authForm.name });
        // Create user document with UID as ID
        await setDoc(doc(db, 'users', userCred.user.uid), {
          name: authForm.name,
          email: authForm.email,
          role: 'student',
          createdAt: serverTimestamp()
        });
        alert('Signup successful!');
      }
      setShowAuthModal(false);
    } catch (err: any) {
      alert(err.message || 'Authentication failed');
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

  // --- Admission Handler ---
  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'admissions'), {
        ...admissionForm,
        submittedAt: serverTimestamp()
      });
      
      // Call email notification API
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_name: admissionForm.student_name,
            course: admissionForm.course,
            email: admissionForm.email
          })
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      alert('Application submitted successfully!');
      setShowAdmission(false);
      setAdmissionForm({
        student_name: '', father_name: '', dob: '', gender: 'male', course: 'Hifz Program',
        phone: '', email: '', address: '', additional_info: ''
      });
      setAdmissionFile(null);
    } catch (err: any) {
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* --- Navigation Bar --- */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-madni-gold/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            {/* Logo on Left */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-9 h-9 rounded-full madni-gradient flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-madni-gold/20">
                M
              </div>
            </div>
            
            {/* Search Box in Middle */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-madni-green" />
                <input 
                  type="text" 
                  placeholder="Search news, courses..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-madni-gold/20 focus:border-madni-green rounded-full text-sm shadow-sm transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions on Right */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedItem({ title: 'Notifications', text: 'No new notifications at this time.\n\nCheck back later for updates on admissions and results.' })}
                className="relative p-2 text-madni-green hover:bg-madni-light-gold rounded-full transition-colors flex-shrink-0"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              </button>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-sm font-medium text-madni-green">{user.displayName || user.email}</span>
                  <button onClick={handleLogout} className="p-2 text-amber-700 hover:bg-amber-50 rounded-full transition-colors">
                    <LogOut className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className="p-2 text-madni-green hover:bg-madni-light-gold rounded-full transition-colors">
                  <LogIn className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header id="home" className="relative py-20 overflow-hidden bg-[#fff9f0]">
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-48 h-48 sm:w-64 sm:h-64 rounded-full mx-auto madni-gradient animate-gradient flex flex-col items-center justify-center p-6 shadow-2xl border-2 border-madni-gold/30"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">Madni School System</h1>
            <div className="w-full h-[2px] bg-madni-gold mb-2"></div>
            <p className="font-amiri text-xl sm:text-2xl text-madni-light-gold font-bold">جامعہ فیضان حلیمہ سعدیہ</p>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 inline-flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-madni-gold/20"
          >
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <CheckCircle className="w-5 h-5 text-madni-green" />
              Wifaqul Madaris Islami Rizviya (HEC Certified)
            </div>
            <p className="font-amiri text-amber-900 text-sm">مدرسہ فیضان حلیمہ سعدیہ چکوال - زیر اہتمام مدنی تحریک</p>
          </motion.div>
        </div>
      </header>

      {/* --- Donation Section --- */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-gradient-to-br from-madni-light-gold to-orange-50 rounded-[3rem] p-8 sm:p-12 text-center shadow-xl border border-amber-400 relative overflow-hidden"
          >
            <div className="absolute bottom-[-20px] right-[-20px] text-9xl opacity-5 font-amiri text-madni-green">﷽</div>
            <h2 className="text-3xl font-bold text-amber-900 mb-4 flex items-center justify-center gap-3">
              <Heart className="w-8 h-8 fill-amber-600 text-amber-600" />
              Donate for Sadaqah Jariyah
            </h2>
            <p className="font-amiri text-2xl text-amber-800 italic mb-8">"The best among you are those who benefit others." 🌙</p>
            <button 
              onClick={() => setSelectedItem({ title: 'Donation', text: 'Choose donation type:\n\nMonthly: Bank Meezan, A/C: 1234-5678\nOne Time: Bank Meezan, A/C: 1234-5678\nSadaqah: Bank Meezan (Waqf), A/C: 9876-5432' })}
              className="bg-madni-green text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-madni-gold hover:text-madni-green transition-all border-2 border-madni-gold"
            >
              Give Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- Services Section --- */}
      <section id="services" className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-madni-green text-center mb-12 relative">
            Our Pages & Services
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madni-gold via-amber-400 to-madni-gold rounded-full shadow-sm"></div>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                icon: BookOpen, 
                title: 'Hifz Program', 
                color: 'bg-emerald-100 text-emerald-800',
                action: () => setSelectedItem({ 
                  title: 'Hifz Program', 
                  text: 'Our Hifz program focuses on complete Quran memorization with proper Tajweed rules. We provide a supportive environment for students to memorize the Holy Quran efficiently.' 
                })
              },
              { 
                icon: BookOpen, 
                title: 'Nazra Quran', 
                color: 'bg-orange-100 text-orange-800',
                action: () => setSelectedItem({ 
                  title: 'Nazra Quran', 
                  text: 'Nazra Quran course is designed for beginners to learn how to read the Quran with correct pronunciation (Tajweed) and basic Islamic teachings.' 
                })
              },
              { 
                icon: GraduationCap, 
                title: 'Dars-e-Nizami', 
                color: 'bg-blue-100 text-blue-800',
                action: () => setSelectedItem({ 
                  title: 'Dars-e-Nizami', 
                  text: 'The Alim Course (Dars-e-Nizami) is an 8-year comprehensive study of Islamic sciences, including Arabic grammar, Fiqh, Hadith, and Tafseer.' 
                })
              },
              { 
                icon: GraduationCap, 
                title: 'Modern Education', 
                color: 'bg-purple-100 text-purple-800',
                action: () => setSelectedItem({ 
                  title: 'Modern Education', 
                  text: 'Along with Islamic studies, we provide modern school education from Playgroup to Class 5, following the national curriculum.' 
                })
              },
              { icon: UserPlus, title: 'Student Admission', color: 'bg-red-100 text-red-800', action: () => setShowAdmission(true) },
              { icon: Newspaper, title: 'Result Announcement', color: 'bg-emerald-100 text-emerald-800', action: () => setShowResult(true) },
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={service.action}
                className="bg-white p-6 rounded-3xl text-center shadow-md border border-madni-gold/10 cursor-pointer hover:shadow-xl transition-all"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${service.color}`}>
                  <service.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800">{service.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- News Section --- */}
      <section id="news" className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-madni-green text-center mb-12 relative">
            Latest News
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madni-gold via-amber-400 to-madni-gold rounded-full shadow-sm"></div>
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
                className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] shadow-lg border border-madni-gold/20 hover:shadow-xl transition-all group"
              >
                <div className="text-madni-green mb-4 group-hover:scale-110 transition-transform">
                  {news.icon === 'graduation-cap' ? <GraduationCap className="w-10 h-10" /> : <Newspaper className="w-10 h-10" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="w-4 h-4 text-madni-gold" />
                  {news.date}
                </div>
                <h3 className="text-xl font-bold text-madni-green mb-3">{news.title}</h3>
                <p className="text-slate-600 mb-6">{news.description}</p>
                <button 
                  onClick={() => setSelectedItem({ title: news.title, text: news.fullMessage || news.description })}
                  className="inline-flex items-center gap-2 bg-emerald-50 text-madni-green px-5 py-2 rounded-full font-semibold hover:bg-madni-green hover:text-white transition-all border border-madni-gold/30"
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
          <h2 className="text-3xl font-bold text-madni-green text-center mb-12 relative">
            Courses Offered
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-madni-gold via-amber-400 to-madni-gold rounded-full shadow-sm"></div>
          </h2>

          <div className="flex flex-wrap justify-center gap-4">
            {isLoading ? (
              <div>Loading courses...</div>
            ) : filteredCourses.length > 0 ? filteredCourses.map((course) => (
              <motion.button
                key={course._id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedItem({ title: course.name, text: course.description })}
                className="bg-white px-6 py-3 rounded-full shadow-md border-2 border-emerald-100 font-semibold text-madni-green hover:bg-madni-green hover:text-white hover:border-madni-gold transition-all"
              >
                {course.name}
              </motion.button>
            )) : (
              <div className="text-slate-500 italic">No courses found matching your search.</div>
            )}
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section id="contact" className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-madni-green mb-8 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-madni-gold" />
              Contact Us
            </h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madni-light-gold flex items-center justify-center text-madni-green">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Chakwal, Punjab, Pakistan</span>
              </div>
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madni-light-gold flex items-center justify-center text-madni-green">
                  <Phone className="w-5 h-5" />
                </div>
                <span>03215972120</span>
              </div>
              <div className="flex items-center gap-4 text-lg">
                <div className="w-10 h-10 rounded-full bg-madni-light-gold flex items-center justify-center text-madni-green">
                  <Mail className="w-5 h-5" />
                </div>
                <span>madnischool72@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-madni-gold/20">
            <h3 className="text-xl font-bold text-madni-green mb-4">Our Location</h3>
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

      {/* --- Footer --- */}
      <footer className="mt-auto madni-gradient animate-gradient py-12 text-white border-t-4 border-madni-gold shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xl font-bold mb-2">&copy; 2025 Madni School | جامعہ حلیمہ سعدیہ</p>
          <div className="flex items-center justify-center gap-2 text-madni-light-gold">
            <Heart className="w-5 h-5 fill-madni-gold" />
            <span className="font-medium">Ilm o Adab ka markaz</span>
            <Heart className="w-5 h-5 fill-madni-gold" />
          </div>
        </div>
      </footer>

      {/* --- Modals --- */}
      
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madni-gold relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madni-green">{authMode === 'login' ? 'Login' : 'Signup'}</h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                )}
                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button type="submit" className="w-full bg-madni-green text-white py-3 rounded-full font-bold border-2 border-madni-gold hover:bg-madni-gold hover:text-madni-green transition-all">
                  {authMode === 'login' ? 'Login' : 'Signup'}
                </button>
              </form>
              <p className="mt-4 text-center text-slate-600">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-madni-green font-bold hover:underline">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdmission(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-madni-gold relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madni-green">Admission Form</h3>
                <button onClick={() => setShowAdmission(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <form onSubmit={handleAdmissionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Student Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.student_name} onChange={e => setAdmissionForm({...admissionForm, student_name: e.target.value})} required />
                  <input type="text" placeholder="Father's Name" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.father_name} onChange={e => setAdmissionForm({...admissionForm, father_name: e.target.value})} required />
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.dob} onChange={e => setAdmissionForm({...admissionForm, dob: e.target.value})} required />
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.gender} onChange={e => setAdmissionForm({...admissionForm, gender: e.target.value})}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.course} onChange={e => setAdmissionForm({...admissionForm, course: e.target.value})}>
                    <option>Hifz Program</option>
                    <option>Nazra Quran</option>
                    <option>Dars-e-Nizami</option>
                    <option>Modern Education (Playgroup)</option>
                    <option>Modern Education (Class 1-5)</option>
                  </select>
                  <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.phone} onChange={e => setAdmissionForm({...admissionForm, phone: e.target.value})} required />
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.email} onChange={e => setAdmissionForm({...admissionForm, email: e.target.value})} required />
                  <input type="text" placeholder="Address" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={admissionForm.address} onChange={e => setAdmissionForm({...admissionForm, address: e.target.value})} required />
                </div>
                <textarea placeholder="Additional Info" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" rows={3} value={admissionForm.additional_info} onChange={e => setAdmissionForm({...admissionForm, additional_info: e.target.value})} />
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                  <input type="file" id="file-upload" className="hidden" onChange={e => setAdmissionFile(e.target.files?.[0] || null)} />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 text-slate-500">
                    <Upload className="w-8 h-8" />
                    <span>{admissionFile ? admissionFile.name : "Upload Student Image/Documents"}</span>
                  </label>
                </div>
                <button type="submit" className="w-full bg-madni-green text-white py-3 rounded-full font-bold border-2 border-madni-gold hover:bg-madni-gold hover:text-madni-green transition-all flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" /> Submit Application
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResult(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madni-gold relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-madni-green">Check Result</h3>
                <button onClick={() => setShowResult(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Roll Number (e.g., 2025-001)" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none text-center font-bold" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-madni-gold outline-none" value={examType} onChange={e => setExamType(e.target.value)}>
                  <option value="">Select Exam (optional)</option>
                  <option value="Annual 2025">Annual 2025</option>
                  <option value="Mid Term 2025">Mid Term 2025</option>
                </select>
                <button onClick={handleCheckResult} className="w-full bg-madni-green text-white py-3 rounded-full font-bold border-2 border-madni-gold hover:bg-madni-gold hover:text-madni-green transition-all flex items-center justify-center gap-2">
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
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-4 border-madni-gold relative z-10">
              <h3 className="text-2xl font-bold text-madni-green mb-4">{selectedItem.title}</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line mb-8">{selectedItem.text}</p>
              <button onClick={() => setSelectedItem(null)} className="w-full bg-madni-green text-white py-3 rounded-full font-bold border-2 border-madni-gold hover:bg-madni-gold hover:text-madni-green transition-all">Close</button>
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
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-madni-green text-white flex items-center justify-center shadow-2xl border-2 border-madni-gold z-[60] hover:bg-madni-gold hover:text-madni-green transition-all"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
