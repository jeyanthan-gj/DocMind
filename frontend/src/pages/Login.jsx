import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, Mail, Lock, Loader2, Bot, Github } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()
    const canvasRef = useRef(null)

    // --- VIBRANT LIQUID GRADIENT BACKGROUND (LIVE VDO STYLE) ---
    useEffect(() => {
        const canvas = canvasRef.current
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
                    'rgba(16, 163, 127, 0.15)', // DocMind Green
                    'rgba(147, 51, 234, 0.12)', // Purple
                    'rgba(37, 99, 235, 0.12)',  // Blue
                    'rgba(236, 72, 153, 0.12)'  // Pink
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

            // Overlay blobs with screen blending
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
        if (user && profile) {
            if (profile.role === 'admin') navigate('/admin')
            else navigate('/chat')
        }
    }, [user, profile, navigate])

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isRegistering) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                })
                if (error) throw error
                toast({ title: 'Success', description: 'Check your email for confirmation link!' })
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleGithubLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-white text-black font-sans overflow-hidden">
            {/* Live Backdrop (Animated Liquid Gradients) */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* Sign In Box (Solid White) */}
            <div className="relative z-10 w-full max-w-[440px] p-8 sm:p-12 mx-4 sm:mx-0 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col items-center space-y-4 mb-10">
                    <div className="w-16 h-16 rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white mb-2">
                        <Bot className="w-8 h-8 text-[#10a37f]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-center text-black">
                        {isRegistering ? 'Create Profile' : 'Member Login'}
                    </h1>
                    <p className="text-gray-400 text-sm text-center font-medium">
                        DocMind AI: Knowledge Reimagined
                    </p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {isRegistering && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Full Name</label>
                                    <Input
                                        type="text"
                                        placeholder="John Doe"
                                        className="h-14 rounded-2xl border-gray-200 focus:ring-black focus:border-black text-[15px] bg-white text-black pl-5"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                className="h-14 rounded-2xl border-gray-200 focus:ring-black focus:border-black text-[15px] bg-white text-black pl-5"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="h-14 rounded-2xl border-gray-200 focus:ring-black focus:border-black text-[15px] bg-white text-black pl-5"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold transition-all mt-4 text-[16px] shadow-lg shadow-black/10" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : (isRegistering ? 'Sign Up' : 'Sign In')}
                        </Button>
                    </form>

                    <div className="relative my-10">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-100" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-gray-300">
                            <span className="bg-white px-4">OR</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 text-black font-bold transition-all flex items-center justify-center gap-3 bg-white shadow-sm text-[15px]"
                        onClick={handleGithubLogin}
                    >
                        <Github className="w-5 h-5 text-black" />
                        <span>Continue with GitHub</span>
                    </Button>
                </div>

                <div className="text-center mt-10">
                    <p className="text-sm text-gray-500">
                        {isRegistering ? 'Part of our network?' : "New to DocMind?"}{' '}
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-[#10a37f] font-bold hover:underline ml-1"
                        >
                            {isRegistering ? 'Sign in' : 'Create profile'}
                        </button>
                    </p>
                </div>

                <p className="text-[10px] text-center text-gray-300 mt-12 leading-relaxed uppercase tracking-widest font-bold">
                    Secure Research Sandbox v1.0
                </p>
            </div>
        </div >
    )
}

export default Login
