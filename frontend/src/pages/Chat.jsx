import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Plus,
    Send,
    MessageSquare,
    User,
    LogOut,
    ChevronDown,
    Bot,
    Paperclip,
    Loader2,
    Settings,
    MoreVertical,
    Share2,
    Trash2,
    Globe
} from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useToast } from '@/hooks/use-toast'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const Chat = () => {
    const { user, profile, signOut } = useAuth()
    const { toast } = useToast()
    const [sessions, setSessions] = useState([])
    const [currentSession, setCurrentSession] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [models, setModels] = useState([])
    const [selectedModel, setSelectedModel] = useState(null)
    const [useWeb, setUseWeb] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        fetchSessions()
        fetchModels()
    }, [])

    useEffect(() => {
        if (currentSession?.id) {
            fetchMessages(currentSession.id)
        }
    }, [currentSession])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    const fetchSessions = async () => {
        try {
            const { data } = await supabase
                .from('chat_sessions')
                .select('*')
                .order('created_at', { ascending: false })
            if (data && data.length > 0) {
                setSessions(data)
                if (!currentSession) setCurrentSession(data[0])
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchModels = async () => {
        try {
            const { data } = await supabase
                .from('ai_models')
                .select('*')
                .eq('is_active', true)
            if (data && data.length > 0) {
                setModels(data)
                setSelectedModel(data[0])
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchMessages = async (sessionId) => {
        try {
            const { data } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
            if (data) setMessages(data)
        } catch (e) {
            console.error(e)
        }
    }

    const createNewChat = async () => {
        if (!user?.id) return
        const { data } = await supabase
            .from('chat_sessions')
            .insert([{ user_id: user.id, title: 'New Chat' }])
            .select()
            .single()
        if (data) {
            setSessions(prev => [data, ...prev])
            setCurrentSession(data)
            setMessages([])
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('user_id', user.id)
        if (currentSession?.id) {
            formData.append('session_id', currentSession.id)
        }

        setIsLoading(true)
        toast({ title: "Uploading...", description: `Processing ${file.name}` })

        try {
            const res = await axios.post(`${BACKEND_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast({ title: "Success", description: res.data.message })
        } catch (err) {
            console.error(err)
            toast({
                variant: 'destructive',
                title: "Upload Failed",
                description: err.response?.data?.detail || err.message
            })
        } finally {
            setIsLoading(false)
            e.target.value = null
        }
    }

    const deleteSession = async (sessionId, e) => {
        if (e) e.stopPropagation();
        if (!confirm("Are you sure you want to delete this chat?")) return;

        try {
            const { error } = await supabase
                .from('chat_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;

            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSession?.id === sessionId) {
                setCurrentSession(sessions.find(s => s.id !== sessionId) || null);
                setMessages([]);
            }
            toast({ title: "Deleted", description: "Chat history removed successfully." });
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Error', description: "Failed to delete chat." });
        }
    }

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault()
        if (!input.trim() || !currentSession?.id || !selectedModel?.api_model_name || isLoading) return

        const userMessage = input
        setInput('')
        setIsLoading(true)

        try {
            const { data: userMsg, error: uErr } = await supabase
                .from('chat_messages')
                .insert([{ session_id: currentSession.id, role: 'user', content: userMessage }])
                .select().single()

            if (uErr) throw uErr
            setMessages(prev => [...prev, userMsg])

            const res = await axios.post(`${BACKEND_URL}/chat`, {
                query: userMessage,
                session_id: currentSession.id,
                user_id: user.id,
                model_name: selectedModel.api_model_name,
                use_web: useWeb
            })

            const aiText = res.data?.response || "I couldn't generate a response."

            const { data: aiMsg, error: aErr } = await supabase
                .from('chat_messages')
                .insert([{ session_id: currentSession.id, role: 'assistant', content: aiText }])
                .select().single()

            if (aErr) throw aErr
            setMessages(prev => [...prev, aiMsg])
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-screen bg-white text-black font-sans">
            {/* Sidebar */}
            <aside className="w-[260px] bg-[#f9f9f9] border-r border-gray-200 flex flex-col transition-all">
                <div className="p-3">
                    <Button
                        variant="ghost"
                        onClick={createNewChat}
                        className="w-full justify-start gap-3 px-3 py-6 h-auto hover:bg-gray-200 rounded-xl transition-colors border-none group"
                    >
                        <div className="bg-white p-1 rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                            <Plus className="w-5 h-5 text-black" />
                        </div>
                        <span className="font-semibold text-[15px] text-black">New Chat</span>
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="space-y-1 mb-4">
                        <div className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Recent Chats</div>
                        {sessions.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setCurrentSession(s)}
                                className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-all duration-200 group flex items-center gap-3 ${currentSession?.id === s.id ? 'bg-white shadow-sm ring-1 ring-gray-200 font-medium' : 'hover:bg-gray-200 text-gray-600 hover:text-black'}`}
                            >
                                <span className={`truncate flex-1 ${currentSession?.id === s.id ? 'text-black' : 'text-gray-600'}`}>{s.title}</span>
                                <Trash2
                                    className={`w-4 h-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100`}
                                    onClick={(e) => deleteSession(s.id, e)}
                                />
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-3 mt-auto">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                        <p className="text-xs text-gray-400 mb-2">Model</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-10 px-3 bg-gray-50 border-gray-200 hover:bg-gray-100 rounded-xl">
                                    <span className="truncate font-medium text-black">{selectedModel?.display_name || 'Select Model'}</span>
                                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[220px] rounded-xl p-1">
                                {models.map(m => (
                                    <DropdownMenuItem
                                        key={m.id}
                                        onClick={() => setSelectedModel(m)}
                                        className="rounded-lg py-2.5 cursor-pointer text-black"
                                    >
                                        {m.display_name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-200 rounded-xl transition-colors">
                                {profile?.avatar_url ? (
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 shadow-sm">
                                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white text-[12px] font-bold">
                                        {user?.email?.charAt?.(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-sm font-semibold truncate flex-1 text-left text-black">{profile?.full_name || user?.email?.split?.('@')?.[0] || 'User'}</span>
                                <Settings className="w-4 h-4 text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px] rounded-xl p-2">
                            <DropdownMenuItem onClick={signOut} className="py-2.5 rounded-lg cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                <LogOut className="w-4 h-4 mr-2" /> Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
                <div ref={scrollRef} className="flex-1 overflow-y-auto pt-4 pb-32">
                    <div className="max-w-3xl mx-auto px-6">
                        {messages.length === 0 && !isLoading && (
                            <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white">
                                    <Bot className="w-8 h-8 text-[#10a37f]" />
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight text-black">How can I help you today?</h1>
                                <p className="text-gray-500 max-w-sm">Ask about your research papers, documents, or search the web for technical facts.</p>
                            </div>
                        )}

                        {messages.map((m, idx) => (
                            <div
                                key={m.id}
                                className={`py-8 flex gap-6 ${m.role === 'user' ? 'flex-row-reverse text-right' : 'flex-row'}`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {m.role === 'user' ? (
                                        profile?.avatar_url ? (
                                            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                                                <img src={profile.avatar_url} alt="U" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                                {profile?.full_name?.charAt?.(0)?.toUpperCase() || 'YU'}
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center shadow-sm">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 min-w-0 ${m.role === 'user' ? 'pr-2' : ''}`}>
                                    <p className="font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-1">
                                        {m.role === 'user' ? 'You' : 'DocMind'}
                                    </p>
                                    <div className="text-[15px] leading-relaxed text-black font-medium">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-4" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-4" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2" {...props} />,
                                                code: ({ node, inline, ...props }) =>
                                                    inline
                                                        ? <code className="bg-gray-100 px-1 rounded text-sm" {...props} />
                                                        : <pre className="bg-gray-50 p-4 rounded-xl overflow-x-auto border border-gray-100 my-4 text-sm"><code {...props} /></pre>
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="py-8 flex gap-6">
                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center shadow-sm">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div className="flex-2 pt-2">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pb-8 pt-4 px-4">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="relative flex items-center ring-1 ring-gray-200 focus-within:ring-gray-300 shadow-lg shadow-gray-200/50 rounded-2xl bg-white transition-all overflow-hidden p-1">
                                <label className="p-3 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors tooltip" title="Upload Document">
                                    <Paperclip className="w-5 h-5" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        onChange={handleFileUpload}
                                        disabled={isLoading}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setUseWeb(!useWeb)}
                                    className={`p-3 transition-colors rounded-xl ${useWeb ? 'text-cyan-500 bg-cyan-50' : 'text-gray-400 hover:text-gray-600'}`}
                                    title={useWeb ? "Web Search Enabled" : "Web Search Disabled"}
                                >
                                    <Globe className={`w-5 h-5 ${useWeb ? 'animate-pulse' : ''}`} />
                                </button>
                                <textarea
                                    placeholder="Message DocMind..."
                                    className="flex-1 max-h-[200px] min-h-[52px] py-4 px-2 outline-none resize-none text-[15px] bg-transparent"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={isLoading}
                                    rows={1}
                                />
                                <div className="p-1.5 flex items-end">
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !input.trim()}
                                        className={`w-10 h-10 rounded-xl p-0 transition-all ${input.trim() ? 'bg-black hover:bg-gray-800' : 'bg-gray-100 text-gray-300'}`}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        </form>
                        <p className="mt-3 text-center text-[11px] text-gray-400">
                            DocMind can make mistakes. Check important info.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Chat
