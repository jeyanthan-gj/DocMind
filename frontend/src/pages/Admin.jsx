import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
    Users,
    LayoutGrid,
    Key,
    Plus,
    Trash2,
    Save,
    ShieldCheck,
    RefreshCw,
    LogOut,
    MessageSquare,
    Bot
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

const Admin = () => {
    const { profile, signOut } = useAuth()
    const { toast } = useToast()

    // States
    const [users, setUsers] = useState([])
    const [models, setModels] = useState([])
    const [settings, setSettings] = useState({})

    // Form States
    const [newModel, setNewModel] = useState({ display_name: '', api_model_name: '' })
    const [groqKey, setGroqKey] = useState('')
    const [typesenseKey, setTypesenseKey] = useState('')

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchUsers()
            fetchModels()
            fetchSettings()
        }
    }, [profile])

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*')
        if (data) setUsers(data)
    }

    const fetchModels = async () => {
        const { data } = await supabase.from('ai_models').select('*')
        if (data) setModels(data)
    }

    const fetchSettings = async () => {
        const { data } = await supabase.from('system_settings').select('*')
        if (data) {
            const s = {}
            data.forEach(item => s[item.key] = item.value)
            setSettings(s)
            setGroqKey(s.GROQ_API_KEY || '')
            setTypesenseKey(s.TYPESENSE_API_KEY || '')
        }
    }

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
        else {
            toast({ title: 'Success', description: 'User deleted' })
            fetchUsers()
        }
    }

    const addModel = async () => {
        if (!newModel.display_name || !newModel.api_model_name) return
        const { error } = await supabase.from('ai_models').insert([newModel])
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
        else {
            toast({ title: 'Success', description: 'Model added' })
            setNewModel({ display_name: '', api_model_name: '' })
            fetchModels()
        }
    }

    const toggleModel = async (id, isActive) => {
        const { error } = await supabase.from('ai_models').update({ is_active: !isActive }).eq('id', id)
        if (!error) fetchModels()
    }

    const saveSettings = async () => {
        const upserts = [
            { key: 'GROQ_API_KEY', value: groqKey },
            { key: 'TYPESENSE_API_KEY', value: typesenseKey }
        ]
        const { error } = await supabase.from('system_settings').upsert(upserts)
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
        else toast({ title: 'Success', description: 'Settings updated' })
    }

    if (profile?.role !== 'admin') {
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <div className="text-center space-y-6">
                    <ShieldCheck className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-3xl font-bold text-black">Access Denied</h1>
                    <p className="text-gray-500 max-w-sm">Admin privileges are required to access this dashboard.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans flex flex-col">
            <header className="h-20 border-b border-gray-100 flex items-center justify-between px-12 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white">
                        <Bot className="w-6 h-6 text-[#10a37f]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DocMind System Control</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link to="/chat">
                        <Button variant="ghost" className="gap-2 font-semibold text-gray-600 hover:text-black">
                            <MessageSquare className="w-4 h-4" /> Go to Chat
                        </Button>
                    </Link>
                    <Button variant="outline" className="border-gray-200 rounded-xl" onClick={() => { fetchUsers(); fetchModels(); fetchSettings(); }}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Sync
                    </Button>
                    <Button variant="ghost" onClick={signOut} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-12">
                <Tabs defaultValue="users" className="space-y-12">
                    <TabsList className="bg-gray-50 p-1 rounded-2xl w-fit border border-gray-100">
                        <TabsTrigger value="users" className="rounded-xl px-8 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                            <Users className="w-4 h-4" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="models" className="rounded-xl px-8 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                            <LayoutGrid className="w-4 h-4" /> AI Models
                        </TabsTrigger>
                        <TabsTrigger value="secrets" className="rounded-xl px-8 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                            <Key className="w-4 h-4" /> System Secrets
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                <h2 className="text-xl font-bold text-black">User Registry</h2>
                                <p className="text-sm text-gray-500">Monitor and manage access permissions for all DocMind users.</p>
                            </div>
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow className="border-b border-gray-100">
                                        <TableHead className="py-4 px-8 text-black font-bold text-xs uppercase tracking-widest">User</TableHead>
                                        <TableHead className="text-black font-bold">Role</TableHead>
                                        <TableHead className="text-black font-bold">Joined</TableHead>
                                        <TableHead className="text-right text-black font-bold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-gray-50 border-gray-100">
                                            <TableCell className="py-5 px-8">
                                                <div className="flex items-center gap-3">
                                                    {u.avatar_url ? (
                                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                                                            <img src={u.avatar_url} alt="A" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">
                                                            {u.email?.charAt?.(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-black text-sm">{u.full_name || 'No Name'}</span>
                                                        <span className="text-xs text-gray-400">{u.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                    {u.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-xs">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right px-8">
                                                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 transition-colors" onClick={() => deleteUser(u.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="models">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-1 space-y-8">
                                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                                    <h3 className="text-xl font-bold text-black mb-2">Register LLM</h3>
                                    <p className="text-sm text-gray-500 mb-8">Add a new model to the research environment.</p>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Friendly Name</label>
                                            <Input
                                                placeholder="Llama 3.1 70B"
                                                className="h-12 rounded-xl border-gray-200 focus:ring-black focus:border-black text-black bg-white"
                                                value={newModel.display_name}
                                                onChange={e => setNewModel({ ...newModel, display_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">API Identifier</label>
                                            <Input
                                                placeholder="llama-3.1-70b-versatile"
                                                className="h-12 rounded-xl border-gray-200 focus:ring-black focus:border-black text-black bg-white font-mono text-xs"
                                                value={newModel.api_model_name}
                                                onChange={e => setNewModel({ ...newModel, api_model_name: e.target.value })}
                                            />
                                        </div>
                                        <Button className="w-full h-12 rounded-xl bg-black hover:bg-gray-800 text-white font-semibold transition-all" onClick={addModel}>
                                            <Plus className="w-4 h-4 mr-2" /> Add AI Model
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                        <h2 className="text-xl font-bold text-black">Active Model Stack</h2>
                                        <p className="text-sm text-gray-500">Enable or disable inference models across the platform.</p>
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-gray-50/50">
                                            <TableRow className="border-b border-gray-100">
                                                <TableHead className="py-4 px-8 text-black font-bold text-xs uppercase tracking-widest">Model Name</TableHead>
                                                <TableHead className="text-black font-bold text-xs uppercase tracking-widest">API Endpoint</TableHead>
                                                <TableHead className="text-black font-bold text-xs uppercase tracking-widest">Status</TableHead>
                                                <TableHead className="text-right px-8 text-black font-bold text-xs uppercase tracking-widest">Deployment</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {models.map((m) => (
                                                <TableRow key={m.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                                    <TableCell className="py-5 px-8 font-medium text-black">{m.display_name}</TableCell>
                                                    <TableCell className="font-mono text-[10px] text-gray-400">{m.api_model_name}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-tighter ${m.is_active ? 'bg-[#10a37f]/10 text-[#10a37f]' : 'bg-red-50 text-red-500'}`}>
                                                            {m.is_active ? 'ENABLED' : 'DISABLED'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right px-8">
                                                        <Switch
                                                            className="data-[state=checked]:bg-[#10a37f]"
                                                            checked={m.is_active}
                                                            onCheckedChange={() => toggleModel(m.id, m.is_active)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="secrets">
                        <div className="max-w-2xl bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-black mb-2">Vault & Secrets</h3>
                            <p className="text-sm text-gray-500 mb-8">Manage critical infrastructure keys required for system operations.</p>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
                                        Groq Inference Key
                                        <span className="text-red-500 tracking-normal lowercase font-normal italic">Confidential</span>
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Enter key..."
                                        className="h-12 rounded-xl border-gray-200 focus:ring-black focus:border-black text-black bg-white"
                                        value={groqKey}
                                        onChange={e => setGroqKey(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
                                        Typesense Vector Key
                                        <span className="text-red-500 tracking-normal lowercase font-normal italic">Confidential</span>
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Enter key..."
                                        className="h-12 rounded-xl border-gray-200 focus:ring-black focus:border-black text-black bg-white"
                                        value={typesenseKey}
                                        onChange={e => setTypesenseKey(e.target.value)}
                                    />
                                </div>

                                <Button className="w-full h-12 rounded-xl bg-black hover:bg-gray-800 text-white font-bold transition-all" onClick={saveSettings}>
                                    <Save className="w-4 h-4 mr-2" /> Commit Changes to Cloud
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

export default Admin
