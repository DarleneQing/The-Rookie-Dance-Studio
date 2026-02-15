'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

interface PDFDownloadButtonProps {
  contentId: string
  filename: string
}

export function PDFDownloadButton({ contentId, filename }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      const element = document.getElementById(contentId)
      if (!element) {
        throw new Error('Content element not found')
      }

      // Create a clone of the element for PDF generation
      const clone = element.cloneNode(true) as HTMLElement
      clone.style.position = 'absolute'
      clone.style.left = '-9999px'
      clone.style.width = '210mm' // A4 width
      clone.style.backgroundColor = 'white'
      clone.style.color = 'black'
      clone.style.padding = '20mm'
      document.body.appendChild(clone)

      // Convert to canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      // Remove clone
      document.body.removeChild(clone)

      // Calculate PDF dimensions
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save PDF
      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-outfit font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-5 w-5" />
          Download as PDF
        </>
      )}
    </button>
  )
}
