import { Link } from '@tanstack/react-router';

import { useState } from 'react';
import {
  Briefcase,
  BookOpen,
  Clock,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/">
            <img
              src="/tanstack-word-logo-white.svg"
              alt="TanStack Logo"
              className="h-10"
            />
          </Link>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          {/* Demo Links Start */}

          <Link
            to="/conversations"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <MessageSquare size={20} />
            <span className="font-medium">AI</span>
          </Link>

          <div className="flex items-center gap-3 p-3 rounded-lg mb-1">
            <Briefcase size={20} />
            <span className="font-medium text-gray-400">Job Search</span>
          </div>

          <Link
            to="/jobs"
            onClick={() => setIsOpen(false)}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ml-6 mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors ml-6 mb-2',
            }}
          >
            <Home size={18} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/jobs/extract-from-url"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ml-6 mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors ml-6 mb-2',
            }}
          >
            <Search size={18} />
            <span className="font-medium">Extract From Url</span>
          </Link>

          <Link
            to="/mail"
            onClick={() => setIsOpen(false)}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2 mt-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2 mt-2',
            }}
          >
            <Mail size={20} />
            <span className="font-medium">Mail</span>
          </Link>

          <Link
            to="/knowledge-base"
            onClick={() => setIsOpen(false)}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2 mt-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2 mt-2',
            }}
          >
            <BookOpen size={20} />
            <span className="font-medium">Knowledge Base</span>
          </Link>

          <div className="flex items-center gap-3 p-3 rounded-lg mb-1 mt-2">
            <Clock size={20} />
            <span className="font-medium text-gray-400">Automation</span>
          </div>

          <Link
            to="/cronjobs"
            onClick={() => setIsOpen(false)}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ml-6 mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors ml-6 mb-2',
            }}
          >
            <Home size={18} />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Demo Links End */}
        </nav>
      </aside>
    </>
  );
}
