import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
    title: 'Sign In - MoE RAG Portal',
    description: 'Sign in to access the Higher Education Intelligence Portal',
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-900">
            <div className="absolute top-8 left-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                        <span className="text-white dark:text-black font-bold text-lg leading-none">M</span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-white">MoE Intelligence Portal</span>
                </div>
            </div>
            <LoginForm />
        </div>
    )
}
