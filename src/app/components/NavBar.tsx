"use client"
import { signOut } from "next-auth/react"

export default function NavBar() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="font-semibold">Exam Platform</div>
      <button className="px-3 py-1 border rounded" onClick={() => signOut()}>
        Se déconnecter
      </button>
    </div>
  )
}
