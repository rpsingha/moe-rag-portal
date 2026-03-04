'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare, Search, GraduationCap, Clock, AlertTriangle, Library,
  LayoutDashboard, Send, Bot, User, ChevronRight, FileText, BookOpen,
  Building2, IndianRupee, Award, Loader2, Database, Sparkles, Scale,
  ArrowRight, Plus, History, Bookmark, Globe, Shield, TrendingUp,
  CheckCircle2, XCircle, MinusCircle, ExternalLink
} from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1592542306951-17d42a2d0d1b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxJbmRpYW4lMjBlZHVjYXRpb24lMjB1bml2ZXJzaXR5fGVufDB8fHxibHVlfDE3NzIyOTM2ODV8MA&ixlib=rb-4.1.0&q=85';
const AI_IMAGE = 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxBSSUyMHRlY2hub2xvZ3l8ZW58MHx8fGJsdWV8MTc3MjI5MzY5OHww&ixlib=rb-4.1.0&q=85';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Ask AI', icon: MessageSquare },
  { id: 'eligibility', label: 'Eligibility Engine', icon: GraduationCap },
  { id: 'timeline', label: 'Policy Timeline', icon: Clock },
  { id: 'conflicts', label: 'Conflict Detector', icon: AlertTriangle },
  { id: 'policies', label: 'Policy Library', icon: Library },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeCitation, setActiveCitation] = useState(null);
  const chatEndRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Eligibility state
  const [eligibilityForm, setEligibilityForm] = useState({
    institutionType: '', studentType: '', cgpa: '', familyIncome: '',
    gateScore: '', naacGrade: '', state: '', category: ''
  });
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  // Timeline state
  const [timelineTopics, setTimelineTopics] = useState([]);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineYear, setTimelineYear] = useState(2020);

  // Conflict state
  const [conflicts, setConflicts] = useState([]);
  const [conflictQuery, setConflictQuery] = useState('');
  const [conflictAnalysis, setConflictAnalysis] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Policy library state
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        if (data.data.totalPolicies > 0) setIsSeeded(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsSeeded(true);
        fetchStats();
      }
    } catch (e) { console.error(e); }
    setIsSeeding(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId })
      });
      const data = await res.json();
      if (data.success) {
        if (!sessionId) setSessionId(data.data.sessionId);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data.answer,
          citations: data.data.citations
        }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch (e) { console.error(e); }
    setSearchLoading(false);
  };

  const handleEligibility = async () => {
    setEligibilityLoading(true);
    try {
      const res = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eligibilityForm)
      });
      const data = await res.json();
      if (data.success) setEligibilityResult(data.data);
    } catch (e) { console.error(e); }
    setEligibilityLoading(false);
  };

  const fetchTimeline = async (topic) => {
    setSelectedTimeline(topic);
    try {
      const res = await fetch(`/api/timeline?topic=${topic}`);
      const data = await res.json();
      if (data.success) setTimelineData(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchTimelineTopics = async () => {
    try {
      const res = await fetch('/api/timeline?topic=all');
      const data = await res.json();
      if (data.success) setTimelineTopics(data.data.topics);
    } catch (e) { console.error(e); }
  };

  const fetchConflicts = async () => {
    try {
      const res = await fetch('/api/conflict-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) setConflicts(data.data.conflicts);
    } catch (e) { console.error(e); }
  };

  const handleConflictAnalysis = async () => {
    if (!conflictQuery.trim()) return;
    setConflictLoading(true);
    try {
      const res = await fetch('/api/conflict-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customQuery: conflictQuery })
      });
      const data = await res.json();
      if (data.success) {
        setConflictAnalysis(data.data.aiAnalysis);
        setConflicts(data.data.knownConflicts);
      }
    } catch (e) { console.error(e); }
    setConflictLoading(false);
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/policies');
      const data = await res.json();
      if (data.success) setPolicies(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'timeline') fetchTimelineTopics();
    if (activeTab === 'conflicts') fetchConflicts();
    if (activeTab === 'policies') fetchPolicies();
  }, [activeTab]);

  const newChatSession = () => {
    setChatMessages([]);
    setSessionId(null);
    setActiveCitation(null);
  };

  // ============= RENDER FUNCTIONS =============

  const renderHeader = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="tricolor-top" />
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF9933] via-white to-[#138808] flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-[#000080]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#000080] leading-tight">Ministry of Education</h1>
              <p className="text-xs text-gray-500 font-medium">Department of Higher Education | Government of India</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[#138808] border-[#138808] font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="text-[#000080] border-[#000080]">
            <Globe className="w-3 h-3 mr-1" />
            English
          </Badge>
          <LogoutButton />
        </div>
      </div>
    </header>
  );

  const renderSidebar = () => (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[#000080] min-h-[calc(100vh-60px)] flex flex-col transition-all duration-300`}>
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-[#FF9933] text-white shadow-lg'
                  : 'text-blue-100 hover:bg-[#000060] hover:text-white'
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-200 text-center">
            <p>Higher Education</p>
            <p>Intelligence Portal v1.0</p>
          </div>
        </div>
      )}
    </aside>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden h-64 bg-gradient-to-r from-[#000080] to-[#1a237e]">
        <div className="absolute inset-0 bg-black/30" style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3
        }} />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <h2 className="text-3xl font-bold text-white mb-2">Higher Education Intelligence Portal</h2>
          <p className="text-blue-100 text-lg max-w-2xl">
            AI-powered policy intelligence for NEP 2020, UGC/AICTE regulations, and centrally funded schemes.
            Ask questions, check eligibility, trace policy evolution, and detect conflicts.
          </p>
          {!isSeeded && (
            <Button
              onClick={handleSeed}
              disabled={isSeeding}
              className="mt-4 bg-[#FF9933] hover:bg-[#e88a2e] text-white w-fit"
            >
              {isSeeding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Initializing Policy Database...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" />Initialize Policy Database</>
              )}
            </Button>
          )}
          {isSeeded && (
            <Badge className="mt-4 bg-[#138808] text-white w-fit text-sm py-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Policy Database Active — {stats?.totalPolicies || 0} policies indexed
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#FF9933]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Policies</p>
                <p className="text-3xl font-bold text-[#000080]">{stats?.totalPolicies || 0}</p>
              </div>
              <FileText className="w-10 h-10 text-[#FF9933] opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#138808]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Indexed Chunks</p>
                <p className="text-3xl font-bold text-[#000080]">{stats?.totalChunks || 0}</p>
              </div>
              <Database className="w-10 h-10 text-[#138808] opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#000080]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Conversations</p>
                <p className="text-3xl font-bold text-[#000080]">{stats?.totalChats || 0}</p>
              </div>
              <MessageSquare className="w-10 h-10 text-[#000080] opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Known Conflicts</p>
                <p className="text-3xl font-bold text-[#000080]">5</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('chat')}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bot className="w-6 h-6 text-[#000080]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#000080]">Ask AI About Policies</h3>
              <p className="text-sm text-muted-foreground">RAG-powered Q&A with citations</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('eligibility')}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-[#FF9933]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#000080]">Check Scheme Eligibility</h3>
              <p className="text-sm text-muted-foreground">AI-matched scholarships & grants</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('timeline')}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#138808]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#000080]">Policy Timeline</h3>
              <p className="text-sm text-muted-foreground">Evolution from 1986 to 2025</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {stats?.categories && stats.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#000080] flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Policy Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.categories.map((cat, i) => (
                <Badge key={i} variant="secondary" className="text-sm py-1 px-3 bg-blue-50 text-[#000080] hover:bg-blue-100 cursor-pointer">
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#000080] flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Policy Intelligence Assistant
          </h2>
          <p className="text-sm text-muted-foreground">Ask questions about NEP 2020, UGC/AICTE regulations, schemes, and more</p>
        </div>
        <Button variant="outline" onClick={newChatSession} className="border-[#000080] text-[#000080]">
          <Plus className="w-4 h-4 mr-2" />New Chat
        </Button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 border rounded-lg bg-gray-50 p-4">
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-[#000080]" />
                </div>
                <h3 className="text-lg font-semibold text-[#000080] mb-2">Welcome to the Policy AI Assistant</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Ask any question about Indian higher education policies, regulations, and schemes. I&apos;ll provide answers with citations from official documents.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
                  {[
                    'What are the key features of NEP 2020?',
                    'Explain the Academic Bank of Credits',
                    'What is PMRF eligibility criteria?',
                    'How does graded autonomy work?'
                  ].map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="text-left text-sm h-auto py-2 justify-start"
                      onClick={() => { setChatInput(q); }}
                    >
                      <ChevronRight className="w-3 h-3 mr-1 flex-shrink-0" />{q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user'
                  ? 'bg-[#000080] text-white rounded-2xl rounded-tr-sm px-4 py-3'
                  : 'chat-bubble-ai rounded-2xl rounded-tl-sm px-4 py-3'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-[#000080]" /> : <User className="w-4 h-4" />}
                    <span className="text-xs font-medium opacity-70">
                      {msg.role === 'assistant' ? 'Policy AI' : 'You'}
                    </span>
                  </div>
                  <div className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                    {msg.content}
                  </div>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <p className="text-xs font-semibold text-[#000080] mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        <TooltipProvider>
                          {msg.citations.map((cite, ci) => (
                            <Tooltip key={ci}>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-blue-100 citation-hover"
                                  onClick={() => setActiveCitation(cite)}
                                >
                                  [{cite.index}] {cite.category} ({cite.relevanceScore}%)
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                <p className="font-semibold text-sm">{cite.policyTitle}</p>
                                <p className="text-xs text-gray-500">{cite.sourceDocument} | {cite.clause}</p>
                                <p className="text-xs mt-1">{cite.excerpt}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start mb-4">
                <div className="chat-bubble-ai rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#000080]" />
                    <span className="text-sm text-gray-500">Searching policies & generating response...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </ScrollArea>

          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Ask about NEP 2020, UGC regulations, scholarships, AICTE guidelines..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
              className="flex-1 border-[#000080]/30 focus:border-[#000080]"
              disabled={chatLoading}
            />
            <Button
              onClick={handleChat}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-[#000080] hover:bg-[#000060]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Citation Panel */}
        {activeCitation && (
          <Card className="w-80 flex-shrink-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-[#000080]">Citation Details</CardTitle>
                <button onClick={() => setActiveCitation(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <p className="font-semibold text-[#000080]">{activeCitation.policyTitle}</p>
                <p className="text-xs text-muted-foreground">{activeCitation.sourceDocument}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clause</span>
                  <span className="font-medium">{activeCitation.clause}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary" className="text-xs">{activeCitation.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year</span>
                  <span className="font-medium">{activeCitation.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Relevance</span>
                  <Badge className={`text-xs ${activeCitation.relevanceScore > 70 ? 'bg-[#138808]' : activeCitation.relevanceScore > 50 ? 'bg-[#FF9933]' : 'bg-gray-500'}`}>
                    {activeCitation.relevanceScore}%
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Excerpt:</p>
                <p className="text-xs bg-blue-50 p-2 rounded">{activeCitation.excerpt}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderEligibility = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#000080] flex items-center gap-2">
          <GraduationCap className="w-6 h-6" />
          AI Eligibility Engine
        </h2>
        <p className="text-sm text-muted-foreground">Enter your details to find matching schemes, scholarships, and grants</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#000080] text-base">Applicant Profile</CardTitle>
            <CardDescription>Fill in your details for AI-powered scheme matching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Institution Type</label>
                <Select value={eligibilityForm.institutionType} onValueChange={(v) => setEligibilityForm(prev => ({ ...prev, institutionType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IIT">IIT</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                    <SelectItem value="IIIT">IIIT</SelectItem>
                    <SelectItem value="IISc">IISc</SelectItem>
                    <SelectItem value="IISER">IISER</SelectItem>
                    <SelectItem value="Central University">Central University</SelectItem>
                    <SelectItem value="State University">State University</SelectItem>
                    <SelectItem value="Government College">Government College</SelectItem>
                    <SelectItem value="Private University">Private University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Student Type</label>
                <Select value={eligibilityForm.studentType} onValueChange={(v) => setEligibilityForm(prev => ({ ...prev, studentType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                    <SelectItem value="PhD">PhD Scholar</SelectItem>
                    <SelectItem value="Post-Doc">Post-Doctoral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">CGPA (out of 10)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="e.g., 8.5"
                  value={eligibilityForm.cgpa}
                  onChange={(e) => setEligibilityForm(prev => ({ ...prev, cgpa: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Family Income (per annum)</label>
                <Input
                  type="number"
                  placeholder="e.g., 600000"
                  value={eligibilityForm.familyIncome}
                  onChange={(e) => setEligibilityForm(prev => ({ ...prev, familyIncome: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">GATE Score (if applicable)</label>
                <Input
                  type="number"
                  placeholder="e.g., 780"
                  value={eligibilityForm.gateScore}
                  onChange={(e) => setEligibilityForm(prev => ({ ...prev, gateScore: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">NAAC Grade</label>
                <Select value={eligibilityForm.naacGrade} onValueChange={(v) => setEligibilityForm(prev => ({ ...prev, naacGrade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A++">A++</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B++">B++</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="Not Accredited">Not Accredited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">State</label>
                <Input
                  placeholder="e.g., Maharashtra"
                  value={eligibilityForm.state}
                  onChange={(e) => setEligibilityForm(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <Select value={eligibilityForm.category} onValueChange={(v) => setEligibilityForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="OBC">OBC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="ST">ST</SelectItem>
                    <SelectItem value="EWS">EWS</SelectItem>
                    <SelectItem value="PwD">PwD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleEligibility}
              disabled={eligibilityLoading}
              className="w-full bg-[#FF9933] hover:bg-[#e88a2e] text-white"
            >
              {eligibilityLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Eligibility...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Find Matching Schemes</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#000080] text-base flex items-center gap-2">
              <Award className="w-5 h-5" />
              Eligibility Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibilityResult ? (
              <ScrollArea className="h-[400px]">
                <div className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {eligibilityResult.analysis}
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  Evaluated against {eligibilityResult.schemesEvaluated} schemes in the database
                </p>
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <IndianRupee className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-muted-foreground">Fill in your profile to see matching schemes</p>
                <p className="text-xs text-muted-foreground mt-1">PMRF, NSP, RUSA, PM-USHA, ANRF and more</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#000080] flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Chronological Policy Slider
        </h2>
        <p className="text-sm text-muted-foreground">Explore how education policies have evolved from 1986 to 2025</p>
      </div>

      {/* Topic Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {timelineTopics.map((topic) => (
          <Card
            key={topic.id}
            className={`cursor-pointer transition-all ${selectedTimeline === topic.id ? 'ring-2 ring-[#FF9933] shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => fetchTimeline(topic.id)}
          >
            <CardContent className="pt-4 pb-3">
              <h4 className="font-semibold text-sm text-[#000080]">{topic.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{topic.eventCount} events | {topic.yearRange}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline Visualization */}
      {timelineData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#000080]">{timelineData.title}</CardTitle>
            <CardDescription>Drag the slider to explore policy evolution</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Year Slider */}
            <div className="mb-6">
              <input
                type="range"
                min={timelineData.events[0]?.year || 1986}
                max={timelineData.events[timelineData.events.length - 1]?.year || 2025}
                value={timelineYear}
                onChange={(e) => setTimelineYear(parseInt(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{timelineData.events[0]?.year}</span>
                <span className="text-lg font-bold text-[#000080]">{timelineYear}</span>
                <span className="text-xs text-muted-foreground">{timelineData.events[timelineData.events.length - 1]?.year}</span>
              </div>
            </div>

            {/* Timeline Events */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FF9933] to-[#138808]" />
              <div className="space-y-4">
                {timelineData.events.map((event, idx) => {
                  const isActive = event.year <= timelineYear;
                  const isCurrent = event.year === timelineYear || (
                    idx < timelineData.events.length - 1 &&
                    event.year <= timelineYear &&
                    timelineData.events[idx + 1].year > timelineYear
                  );
                  return (
                    <div key={idx} className={`flex gap-4 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 timeline-dot ${isCurrent ? 'bg-[#FF9933] text-white ring-4 ring-orange-200' :
                          isActive ? 'bg-[#000080] text-white' : 'bg-gray-300 text-gray-500'
                        }`}>
                        <span className="text-xs font-bold">{event.year.toString().slice(-2)}</span>
                      </div>
                      <Card className={`flex-1 ${isCurrent ? 'ring-2 ring-[#FF9933] shadow-md' : ''}`}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-xs ${event.type === 'policy' ? 'border-[#000080] text-[#000080]' :
                                event.type === 'reform' ? 'border-[#FF9933] text-[#FF9933]' :
                                  event.type === 'scheme' ? 'border-[#138808] text-[#138808]' :
                                    event.type === 'milestone' ? 'border-purple-500 text-purple-500' :
                                      'border-gray-400 text-gray-400'
                              }`}>
                              {event.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{event.year}</span>
                          </div>
                          <h4 className="font-semibold text-sm text-[#000080]">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!timelineData && (
        <Card className="py-12">
          <CardContent className="text-center">
            <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a topic above to explore policy evolution</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderConflicts = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#000080] flex items-center gap-2">
          <Scale className="w-6 h-6" />
          Policy Conflict Detector
        </h2>
        <p className="text-sm text-muted-foreground">Identify contradictions between state-level rules and central NEP 2020 guidelines</p>
      </div>

      {/* AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#000080]">AI Conflict Analysis</CardTitle>
          <CardDescription>Describe a potential conflict for AI-powered analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Our state requires colleges to be single-discipline, but NEP says multidisciplinary..."
              value={conflictQuery}
              onChange={(e) => setConflictQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConflictAnalysis()}
              className="flex-1"
              disabled={conflictLoading}
            />
            <Button
              onClick={handleConflictAnalysis}
              disabled={conflictLoading || !conflictQuery.trim()}
              className="bg-[#FF9933] hover:bg-[#e88a2e]"
            >
              {conflictLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {conflictAnalysis && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-sm text-[#000080] mb-2">AI Analysis</h4>
              <div className="text-sm whitespace-pre-wrap text-gray-700">{conflictAnalysis}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Known Conflicts */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#000080]">Known Policy Conflicts ({conflicts.length})</h3>
        {conflicts.map((conflict, idx) => (
          <Card key={idx} className={`border-l-4 ${conflict.severity === 'High' ? 'border-l-red-500' :
              conflict.severity === 'Medium' ? 'border-l-[#FF9933]' : 'border-l-yellow-400'
            }`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${conflict.severity === 'High' ? 'bg-red-500' :
                        conflict.severity === 'Medium' ? 'bg-[#FF9933]' : 'bg-yellow-500'
                      } text-white`}>
                      {conflict.severity} Severity
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-[#000080]">{conflict.centralPolicy}</h4>
                  <p className="text-xs text-muted-foreground">{conflict.centralClause}</p>
                </div>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${conflict.severity === 'High' ? 'text-red-500' :
                    conflict.severity === 'Medium' ? 'text-[#FF9933]' : 'text-yellow-500'
                  }`} />
              </div>
              <div className="bg-red-50 border border-red-100 rounded p-2 mb-2">
                <p className="text-xs font-medium text-red-800">Conflict: {conflict.stateConflict}</p>
              </div>
              <p className="text-sm text-gray-700 mb-2">{conflict.description}</p>
              <div className="bg-green-50 border border-green-100 rounded p-2">
                <p className="text-xs font-medium text-[#138808]">Recommendation: {conflict.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#000080] flex items-center gap-2">
            <Library className="w-6 h-6" />
            Policy Library
          </h2>
          <p className="text-sm text-muted-foreground">Browse and search the complete policy database</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search policies semantically... e.g., 'research funding for PhD students'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searchLoading} className="bg-[#000080] hover:bg-[#000060]">
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-[#000080]">Search Results ({searchResults.length})</h3>
          {searchResults.map((result, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                      <span className="text-xs text-muted-foreground">{result.year}</span>
                      <Badge className={`text-xs ${result.relevanceScore > 70 ? 'bg-[#138808]' : result.relevanceScore > 50 ? 'bg-[#FF9933]' : 'bg-gray-500'} text-white`}>
                        {result.relevanceScore}% match
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-[#000080]">{result.policyTitle}</h4>
                    <p className="text-xs text-muted-foreground">{result.sourceDocument} | {result.clause}</p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">{result.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All Policies */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#000080]">All Policies ({policies.length})</h3>
        {policies.length === 0 && (
          <Card className="py-8">
            <CardContent className="text-center">
              <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-muted-foreground">No policies in database. Click &quot;Initialize Policy Database&quot; on the Dashboard.</p>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {policies.map((policy, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs bg-blue-50 text-[#000080]">{policy.category}</Badge>
                  <span className="text-xs text-muted-foreground">{policy.year}</span>
                </div>
                <h4 className="font-semibold text-sm text-[#000080] mb-1">{policy.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{policy.source}</p>
                {selectedPolicy?.id === policy.id && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-700 leading-relaxed">{policy.content}</p>
                    {policy.clause && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Reference: {policy.clause}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'chat': return renderChat();
      case 'eligibility': return renderEligibility();
      case 'timeline': return renderTimeline();
      case 'conflicts': return renderConflicts();
      case 'policies': return renderPolicies();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}
      <div className="flex">
        {renderSidebar()}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
