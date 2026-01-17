import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Bot, Upload, User, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const CompleteProfile = () => {
    const [fullName, setFullName] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()
    const canvasRef = useRef(null)
    const fileInputRef = useRef(null)

    // Pre-fill from user metadata (GitHub)
    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '')
            setAvatarPreview(user.user_metadata?.avatar_url || '')
        }
    }, [user])

    // --- VIBRANT LIQUID GRADIENT BACKGROUND ---
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animationFrameId
        let blobs = []

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        class Blob {
            constructor() {
                this.x = Math.random() * canvas.width
                this.y = Math.random() * canvas.width
                this.radius = Math.random() * 400 + 400
                this.vx = (Math.random() - 0.5) * 1.5
                this.vy = (Math.random() - 0.5) * 1.5
                this.color = [
                    'rgba(16, 163, 127, 0.15)',
                    'rgba(147, 51, 234, 0.12)',
                    'rgba(37, 99, 235, 0.12)',
                    'rgba(236, 72, 153, 0.12)'
                ][Math.floor(Math.random() * 4)]
            }
            update() {
                this.x += this.vx
                this.y += this.vy
                if (this.x < -this.radius || this.x > canvas.width + this.radius) this.vx *= -1
                if (this.y < -this.radius || this.y > canvas.height + this.radius) this.vy *= -1
            }
            draw() {
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
                gradient.addColorStop(0, this.color)
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
        }

        const init = () => {
            blobs = []
            for (let i = 0; i < 5; i++) blobs.push(new Blob())
        }

        const animate = () => {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.globalCompositeOperation = 'multiply'
            blobs.forEach(blob => {
                blob.update()
                blob.draw()
            })
            ctx.globalCompositeOperation = 'source-over'
            animationFrameId = requestAnimationFrame(animate)
        }

        window.addEventListener('resize', resize)
        resize()
        init()
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    useEffect(() => {
        if (profile?.full_name) {
            navigate('/chat')
        }
    }, [profile, navigate])

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const handleCompleteProfile = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            let finalAvatarUrl = avatarPreview

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop()
                const fileName = `${user.id}-${Math.random()}.${fileExt}`
                const filePath = `avatars/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath)

                finalAvatarUrl = publicUrl
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    avatar_url: finalAvatarUrl
                })
                .eq('id', user.id)

            if (error) throw error
            toast({ title: 'Success', description: 'Profile updated!' })
            window.location.reload()
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-white text-black font-sans overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            <div className="relative z-10 w-full max-w-[440px] p-8 sm:p-12 mx-4 sm:mx-0 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col items-center space-y-4 mb-10">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {avatarPreview ? (
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden relative">
                                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                <User className="w-8 h-8 text-gray-400 mb-1" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Upload</span>
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-[#10a37f] p-1.5 rounded-full border-2 border-white shadow-sm">
                            <Upload className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-black">Final Step</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">Initialize your research identity</p>
                    </div>
                </div>

                <form onSubmit={handleCompleteProfile} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Your Full Name</label>
                        <Input
                            type="text"
                            placeholder="e.g. Dr. Jane Smith"
                            className="h-14 rounded-2xl border-gray-200 focus:ring-black focus:border-black text-[15px] bg-white text-black pl-5"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Identity Preview</p>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-black">{fullName || 'Scientific Identity'}</p>
                                <p className="text-xs text-gray-400">{user?.email}</p>
                            </div>
                            {fullName && avatarPreview && <Check className="w-4 h-4 text-[#10a37f]" />}
                        </div>
                    </div>

                    <Button className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold transition-all text-[16px] shadow-lg shadow-black/10 group overflow-hidden relative" type="submit" disabled={loading}>
                        <span className={`flex items-center justify-center gap-2 transition-transform ${loading ? 'translate-y-10' : ''}`}>
                            Launch DocMind <Bot className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                        )}
                    </Button>
                </form>

                <p className="text-[10px] text-center text-gray-300 mt-10 leading-relaxed uppercase tracking-widest font-bold">
                    Secure Research Sandbox v1.0
                </p>
            </div>
        </div>
    )
}

export default CompleteProfile
