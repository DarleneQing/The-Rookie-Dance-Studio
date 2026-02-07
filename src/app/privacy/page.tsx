import { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { TableOfContents } from '@/components/legal/table-of-contents'
import { PDFDownloadButton } from '@/components/legal/pdf-download-button'
import { PrivacyContent } from '@/components/legal/privacy-content'

export const revalidate = 86400 // ISR: revalidate every 24 hours

export const metadata: Metadata = {
  title: 'Privacy Policy | The Rookie Dance Studio',
  description: 'Privacy Policy for The Rookie Dance Studio Platform. Learn how we collect, use, and protect your personal information.',
}

const tocItems = [
  { id: 'summary', title: 'Summary of Key Points' },
  { id: 'information-collect', title: '1. What Information Do We Collect?' },
  { id: 'information-use', title: '2. How Do We Process Your Information?' },
  { id: 'legal-bases', title: '3. What Legal Bases Do We Rely On?' },
  { id: 'information-share', title: '4. When and With Whom Do We Share Information?' },
  { id: 'third-party', title: '5. Third-Party Websites' },
  { id: 'cookies', title: '6. Do We Use Cookies?' },
  { id: 'retention', title: '7. How Long Do We Keep Your Information?' },
  { id: 'security', title: '8. How Do We Keep Your Information Safe?' },
  { id: 'minors', title: '9. Do We Collect Information from Minors?' },
  { id: 'privacy-rights', title: '10. What Are Your Privacy Rights?' },
  { id: 'updates', title: '11. Do We Make Updates to This Notice?' },
  { id: 'contact-privacy', title: '12. How Can You Contact Us?' },
  { id: 'review-data', title: '13. How Can You Review, Update, or Delete Data?' },
  { id: 'swiss-compliance', title: 'Swiss Data Protection Compliance' },
]

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="Learn how we collect, use, and protect your personal information."
      lastUpdated="February 7, 2026"
      downloadButton={
        <PDFDownloadButton
          contentId="privacy-content"
          filename="The-Rookie-Dance-Studio-Privacy-Policy"
        />
      }
    >
      <TableOfContents items={tocItems} />
      <PrivacyContent />
    </LegalPageLayout>
  )
}
