"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 text-white">
        <h1 className="text-2xl font-bold">In Touch</h1>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-white">
        <h2 className="text-5xl font-bold mb-6">Stay Connected in Real-time</h2>
        <p className="text-xl mb-8 text-blue-100">
          Chat with friends, manage groups, and stay in touch instantly
        </p>
        <Link href="/register">
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Chatting Now
          </Button>
        </Link>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <MessageSquare className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-gray-900">
              Real-time Chat
            </h3>
            <p className="text-gray-600">
              Send messages instantly to friends and see responses in real-time
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg">
            <Users className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-gray-900">
              Group Chats
            </h3>
            <p className="text-gray-600">
              Create groups with friends and have conversations with multiple
              people at once
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg">
            <Zap className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-gray-900">
              Lightning Fast
            </h3>
            <p className="text-gray-600">
              Built with WebSocket technology for instant message delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
