import { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { TableOfContents } from '@/components/legal/table-of-contents'
import { PDFDownloadButton } from '@/components/legal/pdf-download-button'
import { TermsContent } from '@/components/legal/terms-content'

export const metadata: Metadata = {
  title: 'Terms and Conditions | The Rookie Dance Studio',
  description: 'Terms and Conditions for The Rookie Dance Studio Platform. Learn about our policies, user agreements, and legal terms.',
}

const tocItems = [
  { id: 'scope', title: '1. Scope of Agreement' },
  { id: 'accounts', title: '2. User Accounts and Registration' },
  { id: 'booking', title: '3. Booking and Attendance' },
  { id: 'fees', title: '4. Fees, Payments, and Subscriptions' },
  { id: 'cancellation', title: '5. Cancellation and Refund Policy' },
  { id: 'liability', title: '6. Assumption of Risk and Waiver of Liability' },
  { id: 'medical', title: '7. Medical Fitness and Insurance' },
  { id: 'conduct', title: '8. Code of Conduct' },
  { id: 'media', title: '9. Intellectual Property and Media Release' },
  { id: 'privacy', title: '10. Data Privacy and Protection' },
  { id: 'platform-use', title: '11. Platform Use and Restrictions' },
  { id: 'modifications', title: '12. Modifications to Terms' },
  { id: 'termination', title: '13. Termination' },
  { id: 'limitation', title: '14. Limitation of Liability' },
  { id: 'governing-law', title: '15. Dispute Resolution and Governing Law' },
  { id: 'severability', title: '16. Severability' },
  { id: 'entire-agreement', title: '17. Entire Agreement' },
  { id: 'contact', title: '18. Contact Information' },
]

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms and Conditions"
      description="Please read these terms and conditions carefully before using our services."
      lastUpdated="February 7, 2026"
      downloadButton={
        <PDFDownloadButton
          contentId="terms-content"
          filename="The-Rookie-Dance-Studio-Terms-and-Conditions"
        />
      }
    >
      <TableOfContents items={tocItems} />
      <TermsContent />
    </LegalPageLayout>
  )
}
