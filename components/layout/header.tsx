"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, User, Clock, Plus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="flex items-center gap-3">
            <img
              src="/ps-logo.svg"
              alt="Product School"
              className="h-7 w-auto"
              style={{
                filter: 'brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(205deg) brightness(80%) contrast(115%)'
              }}
            />
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold tracking-widest text-gray-700 uppercase">
              Campaign Manager
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <>
              <Link
                href="/campaigns"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300"
              >
                <Clock className="w-3.5 h-3.5" />
                View Campaigns
              </Link>
              <Link
                href="/campaigns/new"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-ps-blue hover:bg-ps-navy transition-colors px-3 py-1.5 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                New Campaign
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500">
                <User className="h-3.5 w-3.5" />
                <span>{session.user.name}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
