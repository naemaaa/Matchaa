import { useState, useRef, useEffect } from 'react'
import { 
  Send, Settings, FileText, CheckCircle2, 
  Search, ChevronRight, Plus, Compass, FolderOpen, 
  LayoutDashboard, BookOpen, Clock, ArrowRight, 
  Lightbulb, GraduationCap, Eye, Calendar, 
  Sparkles, HelpCircle, Loader2, LogOut, Upload, Link, Trash2,
  Menu, X, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react'
import { useMatcha } from '../hooks/useMatcha'
import Onboarding from '../components/Onboarding'

// Helper function to format chat messages with HTML-like styles
function formatMessage(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(SKILL GAP|LEARNING PATH|RESOURCE|PENJELASAN|CV STRENGTH|CV GAP|REKOMENDASI KONKRET|TEMPLATE BULLET POINT|PROFILE STRENGTH|PROFILE GAP|HEADLINE & SUMMARY)\*\*/g,
      '<span class="inline-block bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold px-2 py-0.5 rounded-lg mr-1">$1</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\*\s(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-green-600 font-semibold flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^\d+\.\s(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-green-600 font-semibold flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^[-•]\s(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-green-600 font-semibold flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="my-2"></div>')
    .replace(/\n/g, '<br/>')
}

export default function Dashboard() {
  const { sessionId, chatHistory, agentState, isLoading, sendChat, uploadDocument, reviewDocumentFull, analyzeJobDescription, deleteDocumentFull } = useMatcha()
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('matcha_onboarded'))
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [input, setInput] = useState('')
  const [jobDesc, setJobDesc] = useState(localStorage.getItem('matcha_job_description') || '')
  const [cvUploaded, setCvUploaded] = useState(false)
  const [cvStatus, setCvStatus] = useState('Belum dianalisis')
  const [cvFileName, setCvFileName] = useState('')
  const [linkedinUploaded, setLinkedinUploaded] = useState(false)
  const [linkedinStatus, setLinkedinStatus] = useState('Belum dihubungkan')
  const [linkedinFileName, setLinkedinFileName] = useState('')
  const [isCvUploading, setIsCvUploading] = useState(false)
  const [isLinkedinUploading, setIsLinkedinUploading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewTab, setPreviewTab] = useState('text')
  const [expandedPhaseIdx, setExpandedPhaseIdx] = useState(0)

  useEffect(() => {
    if (previewDoc) {
      setPreviewTab('text')
    }
  }, [previewDoc])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get stored user name from localStorage (set during onboarding)
  const storedName = localStorage.getItem('matcha_user_name') || ''
  const nameInitial = storedName ? storedName[0].toUpperCase() : 'M'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isLoading])

  // Sync upload states with backend state
  useEffect(() => {
    if (!isCvUploading) {
      if (agentState?.cv_uploaded) {
        setCvUploaded(true)
        setCvStatus(agentState?.cv_reviewed ? 'Teranalisis' : 'Siap dianalisis')
        if (agentState?.cv_filename) {
          setCvFileName(agentState.cv_filename)
        }
      } else {
        setCvUploaded(false)
        setCvStatus('Belum dianalisis')
        setCvFileName('')
      }
    }

    if (!isLinkedinUploading) {
      if (agentState?.linkedin_uploaded) {
        setLinkedinUploaded(true)
        setLinkedinStatus(agentState?.linkedin_reviewed ? 'Teranalisis' : 'Siap dihubungkan')
        if (agentState?.linkedin_filename) {
          setLinkedinFileName(agentState.linkedin_filename)
        }
      } else {
        setLinkedinUploaded(false)
        setLinkedinStatus('Belum dihubungkan')
        setLinkedinFileName('')
      }
    }

    if (agentState?.job_description) {
      setJobDesc(agentState.job_description)
      localStorage.setItem('matcha_job_description', agentState.job_description)
    }
  }, [agentState, isCvUploading, isLinkedinUploading])

  const profile = agentState?.user_profile || {}
  const storedTargetRole = localStorage.getItem('matcha_target_role') || ''
  const targetRole = profile.target_role || agentState?.target_role || storedTargetRole
  const storedHours = parseInt(localStorage.getItem('matcha_hours_per_week') || '0')
  const hoursPerWeek = profile.hours_per_week || storedHours || null

  // ATS analysis data — only show if agent has analyzed
  const atsAnalysis = agentState?.ats_analysis || null
  const matchRate = atsAnalysis?.match_rate || 0
  const masteredSkills = atsAnalysis?.mastered_skills || []
  const skillGaps = atsAnalysis?.skill_gaps || atsAnalysis?.suggested_keywords || []
  const cvKeywords = atsAnalysis?.suggested_keywords || []
  const cvPros = atsAnalysis?.cv_pros || []
  const cvCons = atsAnalysis?.cv_cons || []

  // Roadmap data — only from agent state, no fallback hardcoded data
  const roadmap = agentState?.learning_roadmap || null
  const roadmapPhases = roadmap?.phases && roadmap.phases.length > 0 ? roadmap.phases : []

  // Radial Match Rate gauge calculations
  const radius = 35
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (matchRate / 100) * circumference

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendChat(input)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault()
      handleSend() 
    }
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsCvUploading(true)
    setCvUploaded(true)
    setCvStatus('Mengunggah...')
    setCvFileName(file.name)
    try {
      await uploadDocument(file, 'cv')
      setCvStatus('Siap dianalisis')
    } catch (err) {
      console.error(err)
      setCvStatus('Gagal mengunggah')
      setCvUploaded(false)
    } finally {
      setIsCvUploading(false)
    }
  }

  const handleLinkedinUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsLinkedinUploading(true)
    setLinkedinUploaded(true)
    setLinkedinStatus('Mengunggah...')
    setLinkedinFileName(file.name)
    try {
      await uploadDocument(file, 'linkedin')
      setLinkedinStatus('Siap dihubungkan')
    } catch (err) {
      console.error(err)
      setLinkedinStatus('Gagal mengunggah')
      setLinkedinUploaded(false)
    } finally {
      setIsLinkedinUploading(false)
    }
  }

  const handleDeleteDocument = async (fileType) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus berkas ${fileType === 'cv' ? 'CV' : 'LinkedIn'} Anda?`)
    if (!confirmDelete) return
    await deleteDocumentFull(fileType)
  }

  const triggerReview = async (fileType) => {
    if (fileType === 'cv' && !cvUploaded) return
    if (fileType === 'linkedin' && !linkedinUploaded) return
    await reviewDocumentFull(fileType)
  }

  const handleJobDescSubmit = async () => {
    if (!jobDesc.trim() || isLoading) return
    await analyzeJobDescription(jobDesc)
  }

  const handleAutoAnalyze = async () => {
    if (isLoading) return
    // Pakai analyzeJobDescription dengan string kosong sebagai trigger
    // Backend akan tetap analisis berdasarkan profil & dokumen yang sudah tersimpan
    await analyzeJobDescription('')
  }

  if (showOnboarding) {
    return (
      <Onboarding onComplete={({ namaUser, jurusan, targetKarir, hoursPerWeek }) => {
        setShowOnboarding(false)
        localStorage.setItem('matcha_onboarded', 'true')
        localStorage.setItem('matcha_user_name', namaUser)
        localStorage.setItem('matcha_hours_per_week', String(hoursPerWeek))
        localStorage.setItem('matcha_target_role', targetKarir)
        
        // Simpan profil ke backend session (tanpa LLM call) lewat sendChat greeting pendek
        sendChat(`Halo! Namaku ${namaUser}. Latar belakang saya: ${jurusan}. Target karir: ${targetKarir}. Bisa belajar ${hoursPerWeek} jam/minggu.`)
      }} />
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]">
      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0
        bg-white border-r border-[#E2E8F0] h-screen flex flex-col flex-shrink-0 select-none
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className={`p-6 border-b border-[#F1F5F9] flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3D7B3E] to-[#2D5C30] flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-lg">🍵</span>
            </div>
            {isSidebarOpen && (
              <div className="min-w-0 truncate">
                <span className="font-extrabold text-[#1E293B] text-xl tracking-tight leading-none block font-heading">MATCHA</span>
                <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1 block">Growth & Analytics</span>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex-shrink-0"
              aria-label="Tutup Menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {[
            { name: 'Dashboard', icon: LayoutDashboard },
            { name: 'Career Path', icon: Compass },
            { name: 'Resources', icon: BookOpen },
            { name: 'Document Vault', icon: FolderOpen },
            { name: 'Settings', icon: Settings }
          ].map(item => {
            const Icon = item.icon
            const isActive = activeNav === item.name || (item.name === 'Career Path' && activeNav === 'Career Roadmap')
            return (
              <button 
                key={item.name} 
                onClick={() => {
                  setActiveNav(item.name)
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false)
                  }
                }}
                className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-[#F0F8F1] text-[#2D5C30]' 
                    : 'text-gray-500 hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                <div className={`flex items-center ${isSidebarOpen ? 'gap-3 min-w-0' : 'justify-center'}`}>
                  <Icon size={18} className={isActive ? 'text-[#2D5C30]' : 'text-gray-400 group-hover:text-gray-600'} />
                  {isSidebarOpen && <span className="truncate">{item.name}</span>}
                </div>
                {isActive && isSidebarOpen && (
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-1.5 bg-[#2D5C30] rounded-l-full" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Help & Support (Bottom) */}
        <div className={`p-4 border-t border-[#F1F5F9] space-y-2 flex flex-col ${isSidebarOpen ? 'items-stretch' : 'items-center'}`}>
          <button 
            onClick={() => alert("Pusat Bantuan Matcha dapat dihubungi melalui help@matcha.ai")}
            className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-all`}
            title="Bantuan"
          >
            <HelpCircle size={18} className="text-gray-400 flex-shrink-0" />
            {isSidebarOpen && <span>Bantuan</span>}
          </button>
          
          <button 
            onClick={() => { 
              localStorage.removeItem('matcha_onboarded')
              localStorage.removeItem('matcha_user_name')
              localStorage.removeItem('matcha_hours_per_week')
              localStorage.removeItem('matcha_target_role')
              localStorage.removeItem('matcha_job_description')
              window.location.reload() 
            }}
            className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-left`}
            title="Reset & Mulai Ulang"
          >
            <LogOut size={18} className="text-gray-400 hover:text-red-500 flex-shrink-0" />
            {isSidebarOpen && <span>Reset & Mulai Ulang</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR / HEADER */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-all flex items-center justify-center border border-[#E2E8F0] shadow-sm bg-white"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-bold text-gray-700 hidden sm:block">Matcha Platform</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center font-bold shadow-sm">
                {nameInitial}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-gray-800 font-heading">{storedName || 'Pengguna'}</p>
                {targetRole && (
                  <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[120px]">→ {targetRole}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT DYNAMIC RENDERING */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">

          {/* TAB 1: DASHBOARD VIEW */}
          {(activeNav === 'Dashboard') && (
            <div className="space-y-6">
              {/* Mint Green Welcome Hero Card */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#E6F4EA] via-[#D8F0DF] to-[#CCEBD5] p-8 border border-[#BCE3C5] shadow-sm flex justify-between items-center mb-6">
                <div className="relative z-10 max-w-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#2D5C30] text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full">Open Source</span>
                    <p className="text-[#2D5C30] text-xs font-semibold">Matcha Career Analytics</p>
                  </div>
                  <h1 className="text-3xl font-extrabold text-[#113C1C] font-heading leading-tight mb-2">
                    {storedName ? `Selamat Datang, ${storedName}!` : 'Selamat Datang di Matcha'}
                  </h1>
                  <p className="text-[#2D5C30] text-xs font-medium leading-relaxed mb-6">
                    {targetRole 
                      ? `Siap mewujudkan impianmu sebagai ${targetRole}? Mari analisis progresmu dan dapatkan peta jalan belajar terpersonalisasi.`
                      : 'Siap untuk langkah karir berikutnya? Mari analisis progresmu, temukan kesenjangan keahlian, dan dapatkan peta jalan belajar yang terpersonalisasi.'
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {!atsAnalysis ? (
                      <button 
                        onClick={() => document.getElementById('quick-start-wizard')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-green-950/20"
                      >
                        <Sparkles size={14} />
                        Mulai Setup Profil & Karir
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleAutoAnalyze}
                          disabled={isLoading}
                          className="w-full sm:w-auto px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-green-950/20"
                        >
                          {isLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          {isLoading ? 'Menganalisis...' : 'Mulai Analisis Ulang'}
                        </button>
                        <button 
                          onClick={() => setActiveNav('Career Path')}
                          className="w-full sm:w-auto px-5 py-2.5 border border-[#2D5C30] text-[#2D5C30] hover:bg-[#2D5C30]/5 rounded-xl text-xs font-bold transition-all text-center"
                        >
                          Lihat Roadmap
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Decorative element */}
                <div className="absolute right-0 bottom-0 top-0 w-80 bg-cover bg-right-bottom opacity-20 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(ellipse at bottom right, #3D7B3E 0%, transparent 70%)'
                }}></div>
                <div className="relative hidden lg:block pr-8 z-10">
                  <div className="w-56 h-36 border-[12px] border-[#3D7B3E]/10 rounded-t-full relative flex items-end justify-center">
                    <div className="w-40 h-24 border-[12px] border-[#3D7B3E]/20 rounded-t-full flex items-end justify-center">
                      <div className="w-24 h-12 bg-gradient-to-t from-[#2D5C30] to-[#3D7B3E] rounded-t-full shadow-lg flex items-center justify-center text-3xl">🍵</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK START WIZARD (Show only when atsAnalysis is not available) */}
              {!atsAnalysis ? (
                <div id="quick-start-wizard" className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="border-b border-[#F1F5F9] pb-5 select-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F0F8F1] text-[#2D5C30] flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                          🚀
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-800 font-heading">Langkah Mudah Memulai Analisis Karir</h2>
                          <p className="text-xs text-gray-400 font-medium font-sans">Lengkapi langkah-langkah di bawah ini untuk membuat roadmap belajar dan menganalisis ATS.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-[10px] font-bold text-gray-500">
                        <span className={cvUploaded ? "text-[#2D5C30]" : "text-gray-400"}>1. Unggah CV</span>
                        <ChevronRight size={10} className="text-gray-300" />
                        <span className={jobDesc.trim() ? "text-[#2D5C30]" : "text-gray-400"}>2. Lowongan Target</span>
                        <ChevronRight size={10} className="text-gray-300" />
                        <span className="text-gray-400">3. Analisis</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* STEP 1: DOKUMEN KAMU */}
                    <div className="bg-[#FAFCFA] border border-[#F1F5F9] rounded-2xl p-5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 select-none">
                          <span className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center text-[10px] font-black font-heading">1</span>
                          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Unggah CV & LinkedIn</h3>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold leading-relaxed font-sans select-none">
                          Matcha akan mengekstrak profil, pendidikan, dan daftar keahlian Anda secara instan dari berkas ini.
                        </p>

                        <div className="space-y-3">
                          {/* CV Upload Zone */}
                          <div className={`relative p-4 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                            cvUploaded 
                              ? 'bg-[#F0F8F1]/40 border-green-300 hover:border-green-400' 
                              : 'bg-white border-gray-200 hover:border-green-400 hover:bg-[#F0F8F1]/10'
                          }`}>
                            {isCvUploading ? (
                              <div className="flex flex-col items-center justify-center py-2 text-center space-y-1 select-none">
                                <Loader2 size={20} className="animate-spin text-[#2D5C30]" />
                                <p className="text-[10px] font-bold text-gray-700">Membaca CV...</p>
                              </div>
                            ) : cvUploaded ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center flex-shrink-0">
                                    <FileText size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-700 truncate leading-none mb-1">
                                      {cvFileName}
                                    </p>
                                    <p className="text-[8px] font-semibold text-[#2D5C30] leading-none">{cvStatus}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPreviewDoc('cv');
                                    }} 
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition flex items-center justify-center bg-white border border-gray-100"
                                    title="Tinjau CV"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteDocument('cv');
                                    }} 
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center bg-white border border-red-50"
                                    title="Hapus CV"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center py-3 text-center cursor-pointer group select-none">
                                <Upload size={16} className="text-gray-400 group-hover:text-[#2D5C30] mb-1.5 transition-colors" />
                                <span className="bg-[#E8F5E9] text-[#2D5C30] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1">CV (Wajib)</span>
                                <p className="text-[10px] font-bold text-gray-600 group-hover:text-[#2D5C30] leading-none mb-0.5">Pilih Berkas CV</p>
                                <p className="text-[8px] text-gray-400 font-semibold">PDF/DOCX hingga 5MB</p>
                                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                              </label>
                            )}
                          </div>

                          {/* LinkedIn Upload Zone */}
                          <div className={`relative p-4 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                            linkedinUploaded 
                              ? 'bg-blue-50/20 border-blue-300 hover:border-blue-400' 
                              : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50/5'
                          }`}>
                            {isLinkedinUploading ? (
                              <div className="flex flex-col items-center justify-center py-2 text-center space-y-1 select-none">
                                <Loader2 size={20} className="animate-spin text-blue-600" />
                                <p className="text-[10px] font-bold text-gray-700">Membaca LinkedIn...</p>
                              </div>
                            ) : linkedinUploaded ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold">in</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-700 truncate leading-none mb-1">
                                      {linkedinFileName}
                                    </p>
                                    <p className="text-[8px] font-semibold text-blue-600 leading-none">{linkedinStatus}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPreviewDoc('linkedin');
                                    }} 
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition flex items-center justify-center bg-white border border-gray-100"
                                    title="Tinjau LinkedIn"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteDocument('linkedin');
                                    }} 
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center bg-white border border-red-50"
                                    title="Hapus LinkedIn"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center py-3 text-center cursor-pointer group select-none">
                                <Upload size={16} className="text-gray-400 group-hover:text-blue-600 mb-1.5 transition-colors" />
                                <span className="bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1">LinkedIn (Opsional)</span>
                                <p className="text-[10px] font-bold text-gray-600 group-hover:text-blue-600 leading-none mb-0.5">Pilih PDF LinkedIn</p>
                                <p className="text-[8px] text-gray-400 font-semibold">PDF hasil ekspor LinkedIn</p>
                                <input type="file" accept=".pdf" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Success Check */}
                      {(cvUploaded || linkedinUploaded) && (
                        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center gap-1.5 text-[10px] text-[#2D5C30] font-bold select-none">
                          <CheckCircle2 size={12} /> Dokumen siap dianalisis
                        </div>
                      )}
                    </div>

                    {/* STEP 2: PASTE JOB DESCRIPTION */}
                    <div className="bg-[#FAFCFA] border border-[#F1F5F9] rounded-2xl p-5 flex flex-col justify-between lg:col-span-2">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 select-none">
                          <span className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center text-[10px] font-black font-heading">2</span>
                          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tempel Deskripsi Lowongan Kerja Target (Opsional)</h3>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold leading-relaxed font-sans select-none">
                          Dengan menempelkan deskripsi lowongan target, Matcha akan menghitung skor ATS Match Rate dan mendeteksi kesenjangan keahlian secara akurat.
                        </p>

                        <textarea
                          value={jobDesc}
                          onChange={e => setJobDesc(e.target.value)}
                          placeholder="Tempel (paste) deskripsi pekerjaan/syarat lowongan di sini... (Contoh: Minimal 2 tahun pengalaman React, Node.js, SQL, REST API...)"
                          rows={3}
                          className="w-full bg-white border border-[#E2E8F0] focus:border-[#BCE3C5] focus:bg-white rounded-xl p-3.5 text-xs font-medium focus:outline-none text-gray-700 placeholder-gray-400 transition-all resize-none leading-relaxed"
                        />
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold text-gray-400 select-none">
                          {!cvUploaded && (
                            <span className="text-amber-600">💡 Unggah CV terlebih dahulu untuk analisis ATS yang optimal.</span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (jobDesc.trim()) {
                              await handleJobDescSubmit()
                            } else {
                              await handleAutoAnalyze()
                            }
                          }}
                          disabled={isLoading}
                          className="px-6 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-green-950/15"
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isLoading ? "Menganalisis..." : "Mulai Analisis Karir"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TWO-COLUMN GRID */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* COLUMN 1: CAREER PROFILE CARD */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 w-full text-left leading-none">Career Profile</p>
                    
                    {atsAnalysis ? (
                      <>
                        {/* SVG Radial Match Rate Gauge */}
                        <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r={radius} className="stroke-[#F1F5F9]" strokeWidth="8" fill="transparent" />
                            <circle 
                              cx="56" 
                              cy="56" 
                              r={radius} 
                              className="stroke-[#2D5C30] transition-all duration-500" 
                              strokeWidth="8" 
                              fill="transparent" 
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute text-center flex flex-col justify-center items-center">
                            <span className="text-2xl font-black text-[#1E293B] leading-none font-heading">{matchRate}%</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">Match Rate</span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-gray-600 px-4 leading-relaxed mb-5">
                          Kecocokanmu dengan target role <strong className="text-[#2D5C30] font-bold">{targetRole || 'yang dipilih'}</strong>{matchRate < 50 ? ' masih perlu ditingkatkan.' : ' sudah cukup baik!'}
                        </p>

                        {/* Mastered Skills */}
                        {masteredSkills.length > 0 && (
                          <div className="w-full text-left mb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Mastered Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {masteredSkills.map((s, idx) => (
                                <span key={idx} className="bg-[#E8F5E9] text-[#2D5C30] text-[10px] font-bold px-2.5 py-1 rounded-lg">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skill Gaps preview — top 3 only */}
                        {skillGaps.length > 0 && (
                          <div className="w-full text-left">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Skill Gaps</p>
                            <div className="flex flex-wrap gap-1.5">
                              {skillGaps.slice(0, 3).map((gap, idx) => {
                                const label = typeof gap === 'string' ? gap : gap.skill
                                return (
                                  <span key={idx} className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                                    {label}
                                  </span>
                                )
                              })}
                              {skillGaps.length > 3 && (
                                <button
                                  onClick={() => setActiveNav('Career Path')}
                                  className="text-[10px] font-bold text-gray-400 hover:text-[#2D5C30] px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 transition-colors"
                                >
                                  +{skillGaps.length - 3} lainnya →
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* CTA to Career Path */}
                        <button
                          onClick={() => setActiveNav('Career Path')}
                          className="mt-4 w-full py-2 text-xs font-bold text-[#2D5C30] border border-[#BCE3C5] rounded-xl hover:bg-[#F0F8F1] transition-all"
                        >
                          Lihat Analisis Lengkap →
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 py-12 space-y-3 text-center">
                        <div className="w-12 h-12 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-xl">📋</div>
                        <div>
                          <p className="text-xs font-bold text-gray-700">Analisis ATS Belum Tersedia</p>
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-xs">
                            Upload CV dan paste deskripsi kerja untuk memulai analisis kecocokan profil.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveNav('Document Vault')}
                          className="text-[11px] font-bold text-[#2D5C30] hover:underline"
                        >
                          Upload Dokumen →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* COLUMN 2: STATUS REVIEW & DOCUMENT MANAGEMENT */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Status Dokumen</p>
                        <button onClick={() => setActiveNav('Document Vault')} className="text-[10px] font-bold text-[#2D5C30] hover:underline">Kelola</button>
                      </div>

                      <div className="space-y-3">
                        {/* CV Slot */}
                        <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                          cvUploaded ? 'bg-[#FAFCFA] border-[#F1F5F9] hover:border-green-300 hover:bg-[#F4F9F4]/30' : 'bg-white border-[#E2E8F0] border-dashed hover:border-green-300'
                        }`}>
                          {isCvUploading ? (
                            <div className="flex items-center gap-3 w-full py-1">
                              <Loader2 size={16} className="animate-spin text-[#2D5C30] flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-700 truncate leading-none mb-1">Menganalisis CV...</p>
                                <p className="text-[9px] font-semibold text-gray-400">AI sedang membaca berkas baru</p>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group select-none">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cvUploaded ? 'bg-[#E8F5E9] text-[#2D5C30]' : 'bg-gray-100 text-gray-400'} group-hover:bg-[#E8F5E9] group-hover:text-[#2D5C30] transition-colors`}>
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-700 truncate leading-none mb-1 group-hover:text-[#2D5C30] transition-colors">
                                  {cvFileName || 'CV Belum Diunggah'}
                                </p>
                                <p className={`text-[9px] font-semibold flex items-center gap-1 ${cvUploaded ? 'text-[#2D5C30]' : 'text-gray-400'}`}>
                                  <span className={`w-1 h-1 rounded-full ${cvUploaded ? 'bg-[#2D5C30]' : 'bg-gray-400'}`}></span>
                                  {cvStatus}
                                </p>
                              </div>
                              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                            </label>
                          )}
                          {!isCvUploading && (
                            <div className="flex items-center gap-1 flex-shrink-0 relative z-10 ml-2">
                              {cvUploaded && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPreviewDoc('cv');
                                    }} 
                                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition flex items-center justify-center"
                                    title="Tinjau CV"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteDocument('cv');
                                    }} 
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center"
                                    title="Hapus CV"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <label 
                                className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-[#2D5C30] transition cursor-pointer flex items-center justify-center"
                                title={cvUploaded ? "Ganti/Unggah Ulang CV" : "Unggah CV"}
                              >
                                <Upload size={14} />
                                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* LinkedIn Slot */}
                        <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                          linkedinUploaded ? 'bg-[#FAFCFA] border-[#F1F5F9] hover:border-blue-300 hover:bg-[#F4F8FC]/30' : 'bg-white border-[#E2E8F0] border-dashed hover:border-blue-300'
                        }`}>
                          {isLinkedinUploading ? (
                            <div className="flex items-center gap-3 w-full py-1">
                              <Loader2 size={16} className="animate-spin text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-700 truncate leading-none mb-1">Menganalisis LinkedIn...</p>
                                <p className="text-[9px] font-semibold text-gray-400">AI sedang membaca berkas baru</p>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group select-none">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${linkedinUploaded ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'} group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors`}>
                                <span className="text-xs font-bold">in</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-700 truncate leading-none mb-1 group-hover:text-blue-600 transition-colors">
                                  {linkedinFileName || 'LinkedIn PDF Belum Diunggah'}
                                </p>
                                <p className={`text-[9px] font-semibold flex items-center gap-1 ${linkedinUploaded ? 'text-blue-500' : 'text-gray-400'}`}>
                                  <span className={`w-1 h-1 rounded-full ${linkedinUploaded ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                                  {linkedinStatus}
                                </p>
                              </div>
                              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                            </label>
                          )}
                          {!isLinkedinUploading && (
                            <div className="flex items-center gap-1 flex-shrink-0 relative z-10 ml-2">
                              {linkedinUploaded && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPreviewDoc('linkedin');
                                    }} 
                                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition flex items-center justify-center"
                                    title="Tinjau LinkedIn Profile"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteDocument('linkedin');
                                    }} 
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center"
                                    title="Hapus LinkedIn PDF"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <label 
                                className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition cursor-pointer flex items-center justify-center"
                                title={linkedinUploaded ? "Ganti/Unggah Ulang LinkedIn PDF" : "Unggah LinkedIn PDF"}
                              >
                                <Upload size={14} />
                                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mt-4">
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      💡 <strong>Tips Matcha:</strong> Pastikan CV dan Profil LinkedIn Anda selalu diperbarui. Anda bisa bertanya langsung kepada <strong>Matcha Assistant</strong> melalui gelembung chat di sudut kanan bawah untuk berkonsultasi secara privat.
                    </p>
                  </div>
                </div>
              )}

              {/* ROW 3: FASE BELAJAR AKTIF (ROADMAP HIGHLIGHT) */}
              {roadmapPhases.length > 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F0F8F1] text-[#2D5C30] flex items-center justify-center text-lg shadow-sm">
                        📖
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-800 font-heading">Fase Belajar Aktif Saat Ini</h2>
                        <p className="text-xs text-gray-400 font-medium">Progres belajar yang sedang berjalan untuk mencapai target karirmu</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveNav('Career Path')}
                      className="text-xs font-bold text-[#2D5C30] hover:underline flex items-center gap-1"
                    >
                      Lihat Semua Fase ({roadmapPhases.length}) <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                    <div className="space-y-2 max-w-xl">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#E8F5E9] text-[#2D5C30] inline-block">
                        PHASE {roadmapPhases[0].phase_num}: {roadmapPhases[0].weeks}
                      </span>
                      <h3 className="text-base font-black text-gray-800 font-heading">
                        {roadmapPhases[0].title}
                      </h3>
                      <p className="text-xs leading-relaxed text-gray-500 font-medium">
                        {roadmapPhases[0].description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 font-semibold pt-1">
                        <span className="flex items-center gap-1"><Clock size={13} /> {roadmapPhases[0].hours_per_week || hoursPerWeek || '–'} Jam / Minggu</span>
                        <span className="flex items-center gap-1"><Compass size={13} /> Focus: {roadmapPhases[0].focus}</span>
                      </div>
                    </div>

                    {/* Recommended Course buttons */}
                    <div className="flex flex-col gap-2.5 w-full md:w-80 flex-shrink-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Materi Rekomendasi</p>
                      {/* YouTube Free Option */}
                      {(roadmapPhases[0].free_course || roadmapPhases[0].course?.platform?.toLowerCase() === 'youtube') && (
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-red-100 bg-[#FFF5F5]">
                          <div className="w-8 h-8 rounded-lg bg-white border border-red-200 flex items-center justify-center text-xs font-black text-red-600 flex-shrink-0">
                            YT
                          </div>
                          <div className="min-w-0 flex-1 select-none">
                            <p className="text-[8px] text-red-600 font-extrabold uppercase leading-none mb-1">YouTube (Gratis)</p>
                            <p className="text-xs font-bold text-gray-700 truncate leading-none">
                              {roadmapPhases[0].free_course?.title || roadmapPhases[0].course?.title || 'Materi Belajar Gratis'}
                            </p>
                          </div>
                          {(roadmapPhases[0].free_course?.url || roadmapPhases[0].course?.url) && (
                            <a 
                              href={roadmapPhases[0].free_course?.url || roadmapPhases[0].course?.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-all flex-shrink-0 text-center"
                            >
                              Tonton
                            </a>
                          )}
                        </div>
                      )}

                      {/* Paid option */}
                      {(roadmapPhases[0].paid_course || (roadmapPhases[0].course && roadmapPhases[0].course.platform?.toLowerCase() !== 'youtube')) && (
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#FAFCFA]">
                          <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-xs font-black text-[#2D5C30] flex-shrink-0">
                            {roadmapPhases[0].paid_course?.platform ? roadmapPhases[0].paid_course.platform[0].toUpperCase() : (roadmapPhases[0].course?.platform ? roadmapPhases[0].course.platform[0].toUpperCase() : 'C')}
                          </div>
                          <div className="min-w-0 flex-1 select-none">
                            <p className="text-[8px] text-[#2D5C30] font-extrabold uppercase leading-none mb-1">
                              {roadmapPhases[0].paid_course?.platform || roadmapPhases[0].course?.platform || 'Online'} (Sertifikasi)
                            </p>
                            <p className="text-xs font-bold text-gray-700 truncate leading-none">
                              {roadmapPhases[0].paid_course?.title || roadmapPhases[0].course?.title}
                            </p>
                          </div>
                          {(roadmapPhases[0].paid_course?.url || roadmapPhases[0].course?.url) && (
                            <a 
                              href={roadmapPhases[0].paid_course?.url || roadmapPhases[0].course?.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-[#2D5C30] hover:bg-[#1C3B1E] text-white text-[10px] font-bold rounded-lg transition-all flex-shrink-0 text-center"
                            >
                              Buka
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm text-center space-y-4">
                  <div className="w-14 h-14 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-2xl mx-auto">🗺️</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700">Roadmap Belajar Belum Tersedia</h3>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto mt-1">
                      Mulai analisis profil Anda untuk membuat peta jalan belajar terpersonalisasi beserta rekomendasi materi gratis dan sertifikasi.
                    </p>
                  </div>
                  <button
                    onClick={handleAutoAnalyze}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] disabled:bg-gray-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isLoading ? 'Membuat Roadmap...' : 'Buat Roadmap Sekarang'}
                  </button>
                </div>
              )}

              {/* BOTTOM CARDS ROW (TIPS HARI INI ONLY) */}
              <div className="pt-2">
                <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 text-amber-500 shadow-xs">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#14532D] uppercase tracking-wider mb-1 font-heading">Tips Karir Hari Ini</h3>
                    <p className="text-xs text-[#166534] font-medium leading-relaxed">
                      {cvKeywords.length > 0 ? (
                        <>
                          Tambahkan keyword <strong className="font-bold text-[#14532D]">{cvKeywords[0]}</strong> ke CV dan portofoliomu untuk meningkatkan match rate ATS.
                        </>
                      ) : (
                        'Upload CV kamu dan paste deskripsi lowongan untuk mendapatkan tips personalisasi berdasarkan analisis ATS.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CAREER PATH VIEW */}
          {(activeNav === 'Career Path' || activeNav === 'Career Roadmap') && (
            <div className="space-y-6">
              
              {/* Header target role */}
              <div className="flex items-center justify-between select-none">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-gray-800 font-heading leading-none">
                      {targetRole || 'Career Path'}
                    </h1>
                    {atsAnalysis && (
                      <span className={`border text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        matchRate >= 70 
                          ? 'bg-green-50 text-green-600 border-green-200' 
                          : matchRate >= 40 
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${matchRate >= 70 ? 'bg-green-500' : matchRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                        {matchRate >= 70 ? '✅ Good Match' : matchRate >= 40 ? '⚡ Medium Gap' : '🔥 High Gap'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-2">Jalur pembelajaran adaptif terpersonalisasi</p>
                </div>
              </div>

              {/* Skills mastered & Skill gaps side-by-side */}
              {atsAnalysis ? (
                <div className="space-y-6">
                  {/* Row 1: Profile Overview (Mastered Skills on left, CV Pros & Cons on right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
                    
                    {/* SKILLS MASTERED CARD */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-[#F1F5F9] pb-3">
                          <CheckCircle2 size={16} className="text-[#2D5C30]" />
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-heading">Skills Mastered</h3>
                        </div>
                        {masteredSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {masteredSkills.map((s, i) => (
                              <span key={i} className="bg-[#E8F5E9] text-[#2D5C30] text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-[#CDE5D2] hover:bg-[#D4EDDA] transition-all">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3D7B3E]"></span>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium italic">Belum ada skill yang terdeteksi sebagai mastered.</p>
                        )}
                      </div>
                      <div className="bg-[#FAFCFA] border border-[#E8F5E9] rounded-xl p-3.5 mt-6">
                        <p className="text-[10px] text-[#2D5C30] font-semibold leading-relaxed">
                          🎉 Hebat! AI mendeteksi skill ini sudah ada di profil/CV kamu dan sesuai dengan kualifikasi target role.
                        </p>
                      </div>
                    </div>

                    {/* Resume Review (CV Pros & Cons Combined) */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-[#F1F5F9] pb-3">
                          <FileText size={16} className="text-gray-500" />
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-heading">Resume Scorecard (Analisis CV)</h3>
                        </div>
                        <div className="space-y-4">
                          {/* CV Pros */}
                          {cvPros.length > 0 && (
                            <div>
                              <p className="text-[10px] font-extrabold text-[#2D5C30] uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span>🟢</span> Kelebihan CV
                              </p>
                              <ul className="space-y-1.5 pl-1">
                                {cvPros.map((p, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                                    <span className="text-[#2D5C30] shrink-0 mt-0.5">•</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* CV Cons */}
                          {cvCons.length > 0 && (
                            <div className={cvPros.length > 0 ? "pt-3 border-t border-[#F8FAFC]" : ""}>
                              <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span>🟡</span> Kekurangan & Area Peningkatan
                              </p>
                              <ul className="space-y-1.5 pl-1">
                                {cvCons.map((c, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                                    <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {cvPros.length === 0 && cvCons.length === 0 && (
                            <p className="text-xs text-gray-400 font-medium italic">Tidak ada detail review CV tersedia.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Skill Gaps vs Company Standards (Full width, ultra premium table layout) */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm select-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F1F5F9] pb-4 mb-6 gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800 font-heading">Gap Analisis vs Standar Perusahaan</h3>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">
                          Daftar kompetensi yang perlu ditingkatkan untuk mencapai target <strong className="text-gray-700">{targetRole}</strong>.
                        </p>
                      </div>
                      <div className="flex gap-1.5 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                        <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-lg">🔴 Kritis</span>
                        <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-lg">🟡 Sedang</span>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg">🔵 Rendah</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {skillGaps.map((gap, i) => {
                        if (typeof gap === 'string') {
                          return (
                            <div key={i} className="flex items-center justify-between p-4 bg-[#FFF5F5] border border-red-100 rounded-2xl hover:border-red-200 transition-all">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">🔴</span>
                                <span className="text-xs font-bold text-gray-800">{gap}</span>
                              </div>
                              <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">Gap Tinggi</span>
                            </div>
                          )
                        }

                        const severity = gap.gap_severity || 'medium'
                        const severityConfig = {
                          high:   { bg: 'bg-[#FFF5F5]',   border: 'border-red-100',   badge: 'bg-red-100 text-red-700',   dot: '🔴', label: 'Kritis' },
                          medium: { bg: 'bg-[#FFFDF5]', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-800', dot: '🟡', label: 'Sedang' },
                          low:    { bg: 'bg-[#F5F9FF]',  border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700',  dot: '🔵', label: 'Rendah' },
                        }
                        const cfg = severityConfig[severity] || severityConfig.medium

                        return (
                          <div key={i} className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border} hover:shadow-sm transition-all duration-200`}>
                            {/* Skill Header */}
                            <div className="flex items-center justify-between gap-3 mb-3 border-b border-white/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800 font-heading">{gap.skill}</span>
                              </div>
                              <span className={`${cfg.badge} text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shrink-0`}>
                                {cfg.dot} {cfg.label}
                              </span>
                            </div>

                            {/* Level Comparison & Suggestions */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              {/* Left: Level Comparison (Spans 5 cols) */}
                              <div className="md:col-span-5 flex items-center gap-2 select-none">
                                <div className="flex-1 bg-white border border-[#E2E8F0]/60 rounded-xl px-3 py-2 text-center shadow-2xs">
                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Dibutuhkan</p>
                                  <p className="text-xs font-bold text-gray-800">{gap.required_level || '—'}</p>
                                </div>
                                <span className="text-gray-300 font-black text-sm shrink-0">→</span>
                                <div className="flex-1 bg-white border border-[#E2E8F0]/60 rounded-xl px-3 py-2 text-center shadow-2xs">
                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Milikmu</p>
                                  <p className="text-xs font-bold text-gray-500">{gap.current_level || 'Belum Ada'}</p>
                                </div>
                              </div>

                              {/* Right: Learning Suggestion (Spans 7 cols) */}
                              {gap.suggestion && (
                                <div className="md:col-span-7 flex items-start gap-2 bg-white/80 border border-white rounded-xl p-3 shadow-2xs">
                                  <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider leading-none mb-1">Rekomendasi Aksi</p>
                                    <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">{gap.suggestion}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* ATS Keywords inside Skill Gaps Card */}
                    {cvKeywords.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-[#F1F5F9] select-none">
                        <div className="flex items-center gap-1.5 mb-3">
                          <Sparkles size={14} className="text-amber-500" />
                          <p className="text-xs font-bold text-gray-700 font-heading">Saran Kata Kunci Terkait untuk Melolosi ATS (CV & Profil)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cvKeywords.map((kw, i) => (
                            <span key={i} className="bg-gradient-to-r from-amber-50 to-[#FCF8E3] text-amber-800 border border-[#F5E79E] text-[10px] font-bold px-3 py-1.5 rounded-xl hover:scale-102 transition-all">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-2xl mx-auto">📊</div>
                  <p className="text-sm font-bold text-gray-700">Analisis Belum Tersedia</p>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                    Silakan unggah CV terlebih dahulu di menu Document Vault, lalu tempel deskripsi pekerjaan target pada formulir di bawah ini untuk memulai analisis kecocokan.
                  </p>
                </div>
              )}

              {/* JOB DESCRIPTION INPUT CARD */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 select-none">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F8F1] text-[#2D5C30] flex items-center justify-center text-lg shadow-sm">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 font-heading">
                      {atsAnalysis ? 'Bandingkan dengan Lowongan Kerja Lain' : 'Bandingkan dengan Lowongan Kerja Target'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">Tempel deskripsi lowongan kerja untuk menganalisis kesesuaian CV kamu (ATS Match Rate) dan mendeteksi skill gap.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <textarea 
                    value={jobDesc}
                    onChange={e => setJobDesc(e.target.value)}
                    placeholder="Tempel (paste) deskripsi pekerjaan di sini... (Contoh: Kualifikasi: Minimal 2 tahun pengalaman dengan React, Node.js, SQL...)"
                    rows={4}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#BCE3C5] focus:bg-white rounded-xl p-4 text-xs font-semibold focus:outline-none text-gray-700 placeholder-gray-400 transition-all resize-none font-medium"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-gray-400 font-semibold select-none">
                      {!cvUploaded && (
                        <span className="text-amber-600 flex items-center gap-1">
                          ⚠️ Hubungkan/unggah CV di Document Vault untuk hasil terbaik.
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={handleJobDescSubmit}
                      disabled={!jobDesc.trim() || isLoading}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {isLoading ? 'Menganalisis...' : 'Bandingkan ATS & Cari Skill Gap'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detailed roadmap timeline */}
              {roadmapPhases.length > 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                  
                  {/* Timeline Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-[#F1F5F9] mb-8 select-none">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-[#2D5C30]" />
                      <h2 className="text-lg font-black text-gray-800 font-heading">{roadmap.total_weeks || roadmapPhases.length}-Week Learning Roadmap</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {hoursPerWeek && (
                        <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 bg-[#F0F8F1] border border-[#BCE3C5] px-3 py-1.5 rounded-xl text-[#2D5C30]">
                          <Clock size={12} />
                          {hoursPerWeek} jam/minggu
                        </span>
                      )}
                      {(roadmap?.start_date || roadmap?.end_date) && (
                        <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl">
                          <Calendar size={12} />
                          <span>{roadmap.start_date} - {roadmap.end_date}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Timeline Roadmap Accordion */}
                  <div className="relative pl-8 border-l border-dashed border-[#CBD5E1] ml-4 space-y-4 py-2 select-none">
                    {roadmapPhases.map((phase, idx) => {
                      const isExpanded = expandedPhaseIdx === idx;
                      return (
                        <div key={idx} className="relative group transition-all duration-300">
                          
                          {/* Step Bullet Indicator */}
                          <button 
                            onClick={() => setExpandedPhaseIdx(isExpanded ? -1 : idx)}
                            className={`absolute -left-12 top-2.5 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer outline-none ${
                              isExpanded 
                                ? 'bg-[#2D5C30] border-[#2D5C30] text-white shadow-md shadow-[#2D5C30]/20 scale-110' 
                                : 'bg-white border-[#E2E8F0] hover:border-[#2D5C30] text-gray-400 hover:text-[#2D5C30] hover:scale-105'
                            }`}
                          >
                            {phase.phase_num}
                          </button>

                          {/* Phase Header Card */}
                          <div className={`rounded-2xl border transition-all duration-300 bg-white ${
                            isExpanded 
                              ? 'border-[#BCE3C5] shadow-sm bg-gradient-to-br from-white to-[#FAFCFA]/30' 
                              : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                          }`}>
                            
                            {/* Toggle Button Container */}
                            <div 
                              onClick={() => setExpandedPhaseIdx(isExpanded ? -1 : idx)}
                              className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                            >
                              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                  isExpanded ? 'bg-[#E8F5E9] text-[#2D5C30]' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  Phase {phase.phase_num} • {phase.weeks}
                                </span>
                                <h3 className={`text-xs font-black font-heading truncate ${
                                  isExpanded ? 'text-gray-800 text-sm' : 'text-gray-600'
                                }`}>
                                  {phase.title}
                                </h3>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg max-w-[120px] truncate hidden sm:inline-block">
                                  Focus: {phase.focus}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-[#2D5C30] transition-transform duration-300" />
                                ) : (
                                  <ChevronDown size={16} className="text-gray-400 transition-transform duration-300" />
                                )}
                              </div>
                            </div>

                            {/* Phase Expanded Content */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-1 border-t border-[#F8FAFC] animate-fadeIn">
                                {/* Description */}
                                <p className="text-xs leading-relaxed text-gray-500 font-medium mb-4">
                                  {phase.description}
                                </p>

                                {/* Allocation Metadata Row */}
                                <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 font-semibold mb-5 pb-3.5 border-b border-[#F1F5F9] select-none">
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                    <Clock size={12} className="text-gray-400" />
                                    {phase.hours_per_week || hoursPerWeek || '—'} Jam / Minggu
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                    <Compass size={12} className="text-gray-400" />
                                    Fokus Belajar: <strong className="text-gray-600">{phase.focus}</strong>
                                  </span>
                                </div>

                                {/* Clean Recommended Resources (YouTube & Paid Grid) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                                  {/* Free option (YouTube) */}
                                  {(phase.free_course || phase.course?.platform?.toLowerCase() === 'youtube') ? (
                                    <div className="flex flex-col justify-between p-4 rounded-xl border border-red-100 bg-[#FFFDFD]">
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full">
                                            Gratis
                                          </span>
                                          <span className="text-[10px] text-gray-400 font-bold">YouTube Playlist</span>
                                        </div>
                                        <h4 className="text-[11px] font-bold text-gray-700 leading-snug line-clamp-2 mb-3">
                                          {phase.free_course?.title || phase.course?.title || 'Materi Belajar Gratis'}
                                        </h4>
                                      </div>
                                      {(phase.free_course?.url || phase.course?.url) && (
                                        <a 
                                          href={phase.free_course?.url || phase.course?.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-center text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                        >
                                          Tonton di YouTube
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                                      <p className="text-[10px] text-gray-400 font-medium">Tidak ada rekomendasi gratis spesifik</p>
                                    </div>
                                  )}

                                  {/* Paid/Certification option */}
                                  {(phase.paid_course || (phase.course && phase.course.platform?.toLowerCase() !== 'youtube')) ? (
                                    <div className="flex flex-col justify-between p-4 rounded-xl border border-[#BCE3C5]/40 bg-[#FCFDFB]">
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-[#2D5C30] px-2.5 py-0.5 rounded-full">
                                            Sertifikasi
                                          </span>
                                          <span className="text-[10px] text-gray-400 font-bold">
                                            {phase.paid_course?.platform || phase.course?.platform || 'Kursus Online'}
                                          </span>
                                        </div>
                                        <h4 className="text-[11px] font-bold text-gray-700 leading-snug line-clamp-2 mb-3">
                                          {phase.paid_course?.title || phase.course?.title}
                                        </h4>
                                      </div>
                                      {(phase.paid_course?.url || phase.course?.url) && (
                                        <a 
                                          href={phase.paid_course?.url || phase.course?.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="w-full py-2 bg-[#2D5C30] hover:bg-[#1C3B1E] text-white text-center text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                        >
                                          Buka Kelas & Sertifikasi
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                                      <p className="text-[10px] text-gray-400 font-medium">Tidak ada rekomendasi berbayar spesifik</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-2xl mx-auto">🗺️</div>
                  <p className="text-sm font-bold text-gray-700">Roadmap Belum Dibuat</p>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                    Chat dengan Matcha dan minta "buatkan roadmap karir saya" untuk mendapatkan peta jalan belajar yang disesuaikan dengan skill gap dan waktu belajarmu.
                  </p>
                  <button
                    onClick={handleAutoAnalyze}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] disabled:bg-gray-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isLoading ? 'Membuat Roadmap...' : 'Buat Roadmap Sekarang'}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: RESOURCES VIEW */}
          {activeNav === 'Resources' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-extrabold text-gray-800 font-heading">Katalog Sumber Belajar</h1>
              <p className="text-xs text-gray-500 font-medium -mt-4">Rekomendasi materi pembelajaran adaptif sesuai dengan kompetensi targetmu.</p>
              
              {roadmapPhases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 select-none">
                  {roadmapPhases.map((p, idx) => (
                    <div key={idx} className="bg-white border border-[#E2E8F0] hover:border-[#BCE3C5] hover:shadow-md rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all duration-200">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-[#F1F5F9] text-gray-500 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">Phase {p.phase_num}</span>
                          <span className="text-[9px] font-bold text-gray-400">{p.weeks}</span>
                        </div>
                        <h3 className="text-xs font-black text-gray-800 font-heading mb-1.5">{p.title}</h3>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4">
                          Pelajari materi mengenai <strong className="text-gray-700">{p.title}</strong> yang berfokus pada skill <em>{p.focus}</em>.
                        </p>
                      </div>
                      
                      <div className="space-y-2 mt-2">
                        {/* YouTube free option */}
                        {(p.free_course || p.course?.platform?.toLowerCase() === 'youtube') && (
                          <a 
                            href={p.free_course?.url || p.course?.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full py-2 bg-[#FFF5F5] hover:bg-red-50 text-red-600 border border-red-100 text-xs font-bold rounded-xl text-center transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>🎥</span> Tonton Gratis (YouTube)
                          </a>
                        )}

                        {/* Paid option */}
                        {(p.paid_course || p.course) && (p.paid_course?.platform?.toLowerCase() !== 'youtube' && p.course?.platform?.toLowerCase() !== 'youtube') && (
                          <a 
                            href={p.paid_course?.url || p.course?.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full py-2 bg-[#F0F8F1] hover:bg-[#E8F5E9] text-[#2D5C30] border border-[#CDE5D2] text-xs font-bold rounded-xl text-center transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>💼</span> Sertifikasi ({(p.paid_course?.platform || p.course?.platform || 'Online')})
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 shadow-sm text-center space-y-4">
                  <div className="w-14 h-14 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-2xl mx-auto">📚</div>
                  <p className="text-sm font-bold text-gray-700">Belum Ada Kursus yang Direkomendasikan</p>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                    Kursus akan muncul di sini setelah kamu membuat roadmap karir. Chat dengan Matcha dan minta pembuatan roadmap.
                  </p>
                  <button
                    onClick={() => { setActiveNav('Dashboard'); setTimeout(() => textareaRef.current?.focus(), 100) }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5C30] hover:bg-[#1C3B1E] text-white rounded-xl text-xs font-bold transition-all mx-auto"
                  >
                    <Sparkles size={14} />
                    Buat Roadmap Dulu
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENT VAULT VIEW */}
          {activeNav === 'Document Vault' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-extrabold text-gray-800 font-heading">Gudang Dokumen</h1>
              <p className="text-xs text-gray-500 font-medium -mt-4">Kelola dokumen CV dan profil LinkedIn yang dianalisis oleh Matcha.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CV UPLOAD CARD */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 font-heading">Curriculum Vitae (CV)</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Analisis ATS & skill gap berdasarkan CV</p>
                    </div>
                  </div>

                  {isCvUploading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 select-none border-2 border-dashed border-green-200 bg-[#FAFCFA] rounded-2xl animate-pulse">
                      <Loader2 size={24} className="animate-spin text-[#2D5C30]" />
                      <p className="text-xs font-bold text-gray-700">Menganalisis CV...</p>
                      <p className="text-[10px] text-gray-400 font-semibold">AI sedang mengekstrak profil untuk roadmap Anda</p>
                    </div>
                  ) : cvUploaded ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F0F8F1] border border-[#BCE3C5] hover:border-[#2D5C30] hover:bg-[#E8F5E9]/50 transition-all duration-150">
                        <label className="flex-1 cursor-pointer group select-none">
                          <p className="text-xs font-bold text-gray-700 group-hover:text-[#2D5C30] transition-colors">{cvFileName}</p>
                          <p className="text-[10px] text-[#2D5C30] font-semibold mt-0.5">{cvStatus}</p>
                          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                        </label>
                        <div className="flex items-center gap-1 relative z-10 ml-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPreviewDoc('cv');
                            }} 
                            className="p-2 hover:bg-white rounded-lg text-[#2D5C30] transition flex items-center justify-center"
                            title="Tinjau CV"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteDocument('cv');
                            }} 
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center"
                            title="Hapus CV"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center justify-center gap-2 border border-dashed border-[#CBD5E1] hover:border-[#2D5C30] rounded-xl p-3 cursor-pointer text-center group transition duration-150">
                        <Upload size={14} className="text-gray-400 group-hover:text-[#2D5C30]" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-[#2D5C30]">Ganti CV</span>
                        <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#CBD5E1] hover:border-[#2D5C30] rounded-2xl p-8 cursor-pointer text-center group transition duration-150">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-[#F0F8F1] flex items-center justify-center transition">
                        <Upload size={20} className="text-gray-300 group-hover:text-[#2D5C30]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 group-hover:text-[#2D5C30]">Upload CV (PDF/DOCX)</p>
                        <p className="text-[10px] text-gray-400 mt-1">Klik untuk pilih file</p>
                      </div>
                      <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCvUpload} onClick={(e) => { e.target.value = null }} />
                    </label>
                  )}
                </div>

                {/* LINKEDIN UPLOAD CARD */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Link size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 font-heading">LinkedIn Profile PDF</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Export PDF dari LinkedIn → Upload di sini</p>
                    </div>
                  </div>

                  {isLinkedinUploading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 select-none border-2 border-dashed border-blue-200 bg-blue-50/10 rounded-2xl animate-pulse">
                      <Loader2 size={24} className="animate-spin text-blue-600" />
                      <p className="text-xs font-bold text-gray-700">Menganalisis LinkedIn...</p>
                      <p className="text-[10px] text-gray-400 font-semibold">AI sedang mengekstrak profil LinkedIn Anda</p>
                    </div>
                  ) : linkedinUploaded ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 border border-blue-200 hover:border-blue-400 hover:bg-blue-50/70 transition-all duration-150">
                        <label className="flex-1 cursor-pointer group select-none">
                          <p className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{linkedinFileName}</p>
                          <p className="text-[10px] text-blue-600 font-semibold mt-0.5">{linkedinStatus}</p>
                          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                        </label>
                        <div className="flex items-center gap-1 relative z-10 ml-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPreviewDoc('linkedin');
                            }} 
                            className="p-2 hover:bg-white rounded-lg text-blue-600 transition flex items-center justify-center"
                            title="Tinjau LinkedIn Profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteDocument('linkedin');
                            }} 
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition flex items-center justify-center"
                            title="Hapus LinkedIn PDF"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center justify-center gap-2 border border-dashed border-[#CBD5E1] hover:border-blue-400 rounded-xl p-3 cursor-pointer text-center group transition duration-150">
                        <Upload size={14} className="text-gray-400 group-hover:text-blue-600" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Ganti LinkedIn PDF</span>
                        <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                        <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
                          💡 Cara export PDF dari LinkedIn: Buka profil → klik "More" → "Save to PDF"
                        </p>
                      </div>
                      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#CBD5E1] hover:border-blue-400 rounded-2xl p-8 cursor-pointer text-center group transition duration-150">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition">
                          <Upload size={20} className="text-gray-300 group-hover:text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Upload LinkedIn PDF</p>
                          <p className="text-[10px] text-gray-400 mt-1">Klik untuk pilih file</p>
                        </div>
                        <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleLinkedinUpload} onClick={(e) => { e.target.value = null }} />
                      </label>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS VIEW */}
          {activeNav === 'Settings' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-extrabold text-gray-800 font-heading">Pengaturan</h1>
              <p className="text-xs text-gray-500 font-medium -mt-4">Konfigurasi profil dan preferensi belajar kamu.</p>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm max-w-xl space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-heading">Profil Karir</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Nama</label>
                        <input type="text" readOnly value={storedName} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold focus:outline-none text-gray-600" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Target Posisi</label>
                        <input type="text" readOnly value={targetRole || '–'} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold focus:outline-none text-gray-600" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Jam Belajar / Minggu</label>
                        <input type="text" readOnly value={hoursPerWeek ? `${hoursPerWeek} jam` : '–'} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold focus:outline-none text-gray-600" />
                      </div>
                    </div>
                  </div>
  
                  <div className="pt-4 border-t border-[#F1F5F9]">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-heading">Keamanan & Layanan</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-red-50/50 border border-red-100 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-red-600 font-heading">Mulai Ulang Layanan</p>
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">Menghapus semua dokumen terupload, riwayat obrolan, dan mengulangi onboarding.</p>
                      </div>
                      <button 
                        onClick={() => {
                          localStorage.removeItem('matcha_onboarded')
                          localStorage.removeItem('matcha_user_name')
                          localStorage.removeItem('matcha_hours_per_week')
                          localStorage.removeItem('matcha_target_role')
                          window.location.reload()
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition text-center"
                      >
                        Mulai Ulang
                      </button>
                    </div>
                  </div>
            </div>
          </div>
          )}

        </div>
      </main>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (() => {
        const currentFileName = previewDoc === 'cv' ? cvFileName : linkedinFileName
        const isPdf = currentFileName ? currentFileName.toLowerCase().endsWith('.pdf') : false
        
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-3 select-none">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${previewDoc === 'cv' ? 'bg-[#E8F5E9] text-[#2D5C30]' : 'bg-blue-50 text-blue-600'}`}>
                    {previewDoc === 'cv' ? <FileText size={18} /> : <span className="font-bold text-sm">in</span>}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-800 text-base font-heading">
                      {previewDoc === 'cv' ? 'Preview: Curriculum Vitae (CV)' : 'Preview: Profil LinkedIn'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {currentFileName || (previewDoc === 'cv' ? 'File CV' : 'File LinkedIn')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tab toggler if file is PDF */}
              {isPdf && (
                <div className="flex border-b border-gray-100 mb-4 select-none">
                  <button
                    onClick={() => setPreviewTab('text')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                      previewTab === 'text'
                        ? 'border-[#2D5C30] text-[#2D5C30]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Teks Hasil Ekstraksi
                  </button>
                  <button
                    onClick={() => setPreviewTab('pdf')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                      previewTab === 'pdf'
                        ? 'border-[#2D5C30] text-[#2D5C30]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Dokumen PDF Asli
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4 min-h-[40vh]">
                {previewTab === 'pdf' && isPdf ? (
                  <iframe 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/preview/${sessionId}/${previewDoc}`}
                    className="w-full h-[55vh] border-0 rounded-xl"
                    title="PDF Preview"
                  />
                ) : (
                  previewDoc === 'cv' ? (
                    agentState?.cv_text ? (
                      <pre className="whitespace-pre-wrap font-sans text-xs text-gray-600 leading-relaxed font-medium">
                        {agentState.cv_text}
                      </pre>
                    ) : cvStatus === 'Sedang Proses' ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-xs font-semibold space-y-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#2D5C30] border-t-transparent" />
                        <span>Sedang mengekstrak teks CV Anda...</span>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400 text-xs font-semibold">
                        Teks hasil ekstraksi CV tidak ditemukan.
                      </div>
                    )
                  ) : (
                    agentState?.linkedin_text ? (
                      <pre className="whitespace-pre-wrap font-sans text-xs text-gray-600 leading-relaxed font-medium">
                        {agentState.linkedin_text}
                      </pre>
                    ) : linkedinStatus === 'Sedang Proses' ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-xs font-semibold space-y-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                        <span>Sedang mengekstrak teks profil LinkedIn Anda...</span>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400 text-xs font-semibold">
                        Teks hasil ekstraksi LinkedIn tidak ditemukan.
                      </div>
                    )
                  )
                )}
              </div>

              <div className="flex justify-end select-none">
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  Tutup Preview
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* FLOATING CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat Popover Window */}
        {isChatOpen && (
          <div className="mb-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl flex flex-col h-[500px] w-96 max-w-[calc(100vw-2rem)] overflow-hidden transition-all duration-200">
            {/* Popover Header */}
            <div className="px-5 py-4 border-b border-[#F1F5F9] bg-[#FAFCFA] flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center font-bold shadow-sm text-sm">
                  🍵
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-tight font-heading">Matcha Assistant</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3D7B3E] animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-semibold">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                aria-label="Tutup Chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFCFA]">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="w-12 h-12 bg-[#F0F8F1] rounded-2xl flex items-center justify-center text-2xl shadow-sm">🍵</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 font-heading">Halo! Saya Matcha Assistant.</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed font-medium">
                      Tanyakan mengenai target karirmu, minta saran perbaikan CV, atau buat roadmap belajar personal.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
                    {[
                      "Bantu buat roadmap karir saya 📊",
                      "Tolong review CV saya 📄",
                      "Bandingkan CV saya dengan lowongan target 🎯"
                    ].map(suggestion => (
                      <button 
                        key={suggestion}
                        onClick={() => { setInput(suggestion); textareaRef.current?.focus() }}
                        className="w-full text-left text-xs bg-white hover:bg-[#F0F8F1] text-gray-600 hover:text-[#2D5C30] px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#BCE3C5] transition-all font-semibold shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0 mt-0.5">
                        🍵
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs shadow-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#2D5C30] text-white rounded-tr-none'
                        : 'bg-white text-gray-700 border border-[#E2E8F0] rounded-tl-none'
                    }`} dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />

                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-gray-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {nameInitial}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#E8F5E9] text-[#2D5C30] flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0 mt-0.5">
                    🍵
                  </div>
                  <div className="bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center h-8">
                    <span className="w-1.5 h-1.5 bg-[#3D7B3E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#3D7B3E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#3D7B3E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-[#F1F5F9] bg-white flex-shrink-0">
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] focus-within:border-[#BCE3C5] focus-within:bg-white rounded-xl px-4 py-2.5 transition-all">
                <textarea 
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanyakan sesuatu..."
                  className="flex-1 bg-transparent border-none text-xs focus:outline-none text-gray-700 placeholder-gray-400 resize-none max-h-20"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-[#2D5C30] disabled:bg-gray-200 text-white disabled:text-gray-400 flex items-center justify-center transition-all flex-shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bubble Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-[#2D5C30] hover:bg-[#1C3B1E] text-white flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          aria-label="Tanya Matcha"
        >
          {isChatOpen ? (
            <X size={24} />
          ) : (
            <MessageSquare size={24} />
          )}
        </button>
      </div>
    </div>
  )
}