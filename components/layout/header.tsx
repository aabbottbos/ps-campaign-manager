"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, User, Clock, Plus, Settings, ChevronDown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-md hover:border-gray-300"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{session.user.name}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        signOut({ callbackUrl: "/login" })
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
