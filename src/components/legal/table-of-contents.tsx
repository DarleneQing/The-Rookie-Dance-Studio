'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TOCItem {
  id: string
  title: string
  level?: number
}

interface TableOfContentsProps {
  items: TOCItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      
      // Close mobile menu after clicking
      if (window.innerWidth < 768) {
        setIsOpen(false)
      }
    }
  }

  return (
    <div className="mb-6">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg transition-colors flex items-center justify-between font-outfit text-white"
      >
        <span className="font-semibold">Table of Contents</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {/* TOC Content */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
          <h2 className="font-syne font-bold text-lg text-white mb-4">Table of Contents</h2>
          <nav>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className={`text-left w-full text-white/70 hover:text-white font-outfit text-sm transition-colors ${
                      item.level === 2 ? 'pl-4' : ''
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  )
}
