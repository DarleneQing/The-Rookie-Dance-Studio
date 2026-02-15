'use client'

import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Search } from 'lucide-react'

const faqData = [
  {
    category: 'Getting Started',
    icon: '🚀',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Visit our website and click "Sign Up" on the homepage. You\'ll need to provide your full name, email address, date of birth, and create a password. Once registered, you can immediately start browsing and booking dance classes.',
      },
      {
        q: 'What\'s the difference between student and adult membership?',
        a: '<strong>Student Members</strong>: Verified students enrolled in educational institutions receive discounted class fees (CHF 10 per class). You\'ll need to upload a valid student card for verification.<br/><br/><strong>Adult Members</strong>: Standard membership for individuals 18 years and older (CHF 15 per class).',
      },
      {
        q: 'How do I verify my student status?',
        a: 'After creating your account:<br/>1. Go to your Settings page<br/>2. Click on "Student Verification"<br/>3. Upload a clear photo of your valid student card<br/>4. Wait for admin approval (usually within 1-2 business days)<br/>5. You\'ll receive a notification once verified',
      },
      {
        q: 'Can I use the platform if I\'m under 18?',
        a: 'Yes, but with conditions: Users aged 16-17 can create accounts independently. Users under 16 require parental or guardian consent. We do not knowingly collect data from users under 16 without proper consent.',
      },
    ],
  },
  {
    category: 'Booking Classes',
    icon: '📅',
    questions: [
      {
        q: 'How do I book a dance class?',
        a: '1. Log in to your account<br/>2. Navigate to the "Courses" page<br/>3. Browse upcoming classes<br/>4. Click "Book Now" on your desired class<br/>5. Review the class details and important rules<br/>6. Confirm your booking',
      },
      {
        q: 'What\'s the difference between single class and subscription booking?',
        a: '<strong>Single Class Booking</strong>: Pay per class (CHF 10 for students, CHF 15 for adults). No subscription required.<br/><br/><strong>Subscription Booking</strong>: If you have an active subscription, your booking will automatically use your subscription credits.',
      },
      {
        q: 'What subscription options are available?',
        a: 'We offer three subscription types:<br/><br/><strong>Monthly Card</strong>: Unlimited classes for 30 days<br/><strong>5-Times Card</strong>: Valid for 5 class check-ins (no expiration)<br/><strong>10-Times Card</strong>: Valid for 10 class check-ins (no expiration)<br/><br/>Contact us at therookiestudio.ch@gmail.com to purchase a subscription.',
      },
      {
        q: 'Can I have multiple subscriptions at the same time?',
        a: 'No, only one active subscription is permitted per user at any time. Once your current subscription expires or is fully used, you can purchase a new one.',
      },
      {
        q: 'What happens if a class is full?',
        a: 'If a class shows "FULL", you cannot book it. We recommend booking early to secure your spot. Check the "Courses" page regularly for new classes or cancellations that free up spots.',
      },
      {
        q: 'Can I see which classes I\'ve booked?',
        a: 'Yes! On the "Courses" page, switch to the "My Bookings" tab to see all your upcoming booked classes. You can also view your complete course history on your Profile page under "Course History".',
      },
    ],
  },
  {
    category: 'Cancellations & Changes',
    icon: '🔄',
    questions: [
      {
        q: 'Can I cancel my booking?',
        a: 'Yes, but timing matters:<br/><br/><strong>Free cancellation</strong>: Cancel up to 24 hours before the class start time<br/><strong>Late cancellation</strong>: Cancellations within 24 hours result in forfeiture of the full contribution fee or subscription credit',
      },
      {
        q: 'How do I cancel a booking?',
        a: '1. Go to the "Courses" page<br/>2. Switch to the "My Bookings" tab<br/>3. Find the class you want to cancel<br/>4. Click "Cancel Booking"<br/>5. Confirm the cancellation<br/><br/>If the button is disabled, you\'re within the 24-hour window and cannot cancel without penalty.',
      },
      {
        q: 'What happens if the studio cancels a class?',
        a: 'If we cancel a class due to instructor unavailability, insufficient enrollment, venue issues, or force majeure events, you can choose between:<br/>• Credit toward future classes<br/>• Full refund of the paid fee<br/><br/>Refunds are processed within 14 business days.',
      },
      {
        q: 'Can I transfer my booking to another person?',
        a: 'No, bookings are non-transferable. Each participant must have their own account and book classes individually.',
      },
    ],
  },
  {
    category: 'Check-in & Attendance',
    icon: '✅',
    questions: [
      {
        q: 'How does the QR code check-in work?',
        a: '1. When you arrive at class, open your Profile page<br/>2. Tap on "SHOW MEMBER QR" (the purple card at the top)<br/>3. Present your QR code to the instructor or admin<br/>4. They will scan it to check you in<br/>5. Your attendance is recorded and subscription credits are deducted (if applicable)',
      },
      {
        q: 'Where can I find my QR code?',
        a: 'Your personal QR code is on your Profile page. Tap the purple "SHOW MEMBER QR" card to display it in full-screen mode for easy scanning.',
      },
      {
        q: 'What if I forget to check in?',
        a: 'Check-in is required for attendance validation. If you forget:<br/>• Your attendance won\'t be recorded<br/>• Your subscription credit won\'t be deducted<br/>• You may not receive credit for the class<br/><br/>Always check in when you arrive!',
      },
      {
        q: 'Can I check in multiple times for the same class?',
        a: 'Yes, the system allows duplicate check-ins. However, only one check-in per class is necessary. Multiple check-ins won\'t deduct additional credits.',
      },
      {
        q: 'What if I booked a class but can\'t attend?',
        a: 'Cancel your booking as soon as possible (ideally more than 24 hours before the class). If you don\'t cancel and don\'t attend, you\'ll forfeit your contribution fee or subscription credit.',
      },
    ],
  },
  {
    category: 'Subscriptions & Credits',
    icon: '💳',
    questions: [
      {
        q: 'How do I check my subscription status?',
        a: 'Your Profile page displays your current subscription status, including:<br/>• Subscription type (Monthly, 5-Times, or 10-Times)<br/>• Validity period (for Monthly cards)<br/>• Remaining credits (for 5-Times and 10-Times cards)<br/>• Progress bar showing usage',
      },
      {
        q: 'What happens when my Monthly Card expires?',
        a: 'Your Monthly Card is valid for exactly 30 days from the start date. After expiration:<br/>• You can no longer book classes using that subscription<br/>• Any bookings made before expiration remain valid<br/>• You\'ll need to purchase a new subscription or book as single classes',
      },
      {
        q: 'Do 5-Times and 10-Times cards expire?',
        a: 'No! 5-Times and 10-Times cards have no expiration date. You can use them at your own pace.',
      },
      {
        q: 'Can I get a refund on unused subscription credits?',
        a: 'All subscriptions are non-refundable except as required by law or at our sole discretion. We recommend choosing the subscription type that best fits your schedule and commitment level.',
      },
      {
        q: 'How can I view my subscription history?',
        a: 'On your Profile page, tap "Subscription History" to see all your past and current subscriptions, including subscription type, start/end dates, total and remaining credits, and number of check-ins used.',
      },
    ],
  },
  {
    category: 'Classes & Instructors',
    icon: '💃',
    questions: [
      {
        q: 'What dance styles do you offer?',
        a: 'We primarily focus on K-pop dance, but we also offer other dance styles. Check the "Courses" page to see upcoming classes and their dance styles.',
      },
      {
        q: 'Can I see the song/choreography before booking?',
        a: 'Yes! Many classes include a "Check Video" link on the course card. Click it to watch a reference video of the choreography.',
      },
      {
        q: 'Who are the instructors?',
        a: 'Our instructors are experienced dancers passionate about teaching. You can see the instructor\'s name and profile picture on each course card.',
      },
      {
        q: 'What should I bring to class?',
        a: '<strong>Required:</strong><br/>• Clean training shoes with clean soles (venue requirement)<br/>• Water bottle<br/>• Comfortable dance clothing<br/><br/><strong>Not Allowed:</strong><br/>• Food inside the venue<br/>• Outdoor shoes on the dance floor',
      },
      {
        q: 'What\'s the class duration?',
        a: 'Most classes are 60-90 minutes long. The exact duration is shown on each course card (e.g., "7:00 PM - 8:30 PM").',
      },
      {
        q: 'Are classes suitable for beginners?',
        a: 'Classes vary in difficulty level. Check the class description or contact us at therookiestudio.ch@gmail.com if you\'re unsure whether a class is suitable for your skill level.',
      },
    ],
  },
  {
    category: 'Payments & Fees',
    icon: '💰',
    questions: [
      {
        q: 'How much do classes cost?',
        a: '<strong>Student Members</strong> (verified): CHF 10 per class<br/><strong>Adult Members</strong>: CHF 15 per class<br/><br/>These are contribution fees to cover the cost of running the studio.',
      },
      {
        q: 'How and when do I pay for classes?',
        a: 'All payments are made in person, typically before class starts. You can pay by:<br/><br/><strong>Payment Methods:</strong><br/>• Cash<br/>• TWINT<br/><br/><strong>Payment Process:</strong><br/>• Pay directly at the venue before class<br/>• Or arrange payment via WhatsApp or WeChat with one of our staff members<br/><br/><strong>For Subscriptions:</strong><br/>After you make the payment, our staff will manually assign the subscription to your account. You\'ll then be able to use it for booking classes.',
      },
      {
        q: 'Are there any additional fees?',
        a: 'No hidden fees! The class contribution fee is all you pay. Subscription purchases are also straightforward with no additional charges.',
      },
      {
        q: 'Can I get a receipt for my payment?',
        a: 'Yes, payment receipts are available. Contact us at therookiestudio.ch@gmail.com with your booking details to request a receipt.',
      },
    ],
  },
  {
    category: 'Account Management',
    icon: '👤',
    questions: [
      {
        q: 'How do I update my profile information?',
        a: '1. Go to Settings<br/>2. Click the edit icon next to the information you want to update<br/>3. Make your changes<br/>4. Save',
      },
      {
        q: 'Can I change my email address?',
        a: 'Email changes require verification. Contact us at therookiestudio.ch@gmail.com with your request, and we\'ll assist you.',
      },
      {
        q: 'How do I change my password?',
        a: '1. Log out of your account<br/>2. Click "Forgot Password" on the login page<br/>3. Enter your email address<br/>4. Check your email for a password reset link<br/>5. Follow the instructions to set a new password',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Email us at therookiestudio.ch@gmail.com with the subject "Account Deletion Request". We\'ll verify your identity and process your request within 30 days. Note: Account deletion is permanent and cannot be undone.',
      },
      {
        q: 'How do I upload or change my profile picture?',
        a: '1. Go to Settings<br/>2. Click on your current avatar<br/>3. Select "Upload Avatar"<br/>4. Choose a photo from your device<br/>5. Crop and adjust as needed<br/>6. Save',
      },
    ],
  },
  {
    category: 'Technical Issues',
    icon: '🔧',
    questions: [
      {
        q: 'I\'m not receiving emails from The Rookie Dance Studio',
        a: 'Check these common issues:<br/>1. <strong>Spam/Junk folder</strong>: Add therookiestudio.ch@gmail.com to your contacts<br/>2. <strong>Email address</strong>: Ensure your registered email is correct in Settings<br/>3. <strong>Email provider</strong>: Some providers have strict filters<br/><br/>Contact us if problems continue.',
      },
      {
        q: 'The website isn\'t loading properly',
        a: 'Try these steps:<br/>1. Clear your browser cache and cookies<br/>2. Try a different browser (Chrome, Firefox, Safari, Edge)<br/>3. Check your internet connection<br/>4. Try accessing from a different device<br/>5. Disable browser extensions that might interfere',
      },
      {
        q: 'I can\'t log in to my account',
        a: 'Common solutions:<br/>• <strong>Forgot password</strong>: Use the "Forgot Password" link<br/>• <strong>Email verification</strong>: Check if you need to verify your email<br/>• <strong>Account status</strong>: Your account may be suspended<br/>• <strong>Browser issues</strong>: Clear cache/cookies or try a different browser',
      },
      {
        q: 'My QR code won\'t display',
        a: '1. Ensure you\'re logged in<br/>2. Try refreshing the page<br/>3. Check your internet connection<br/>4. Try accessing from a different device/browser<br/><br/>If the QR code still won\'t display, contact an instructor or admin at the venue for manual check-in.',
      },
      {
        q: 'I was charged twice for the same booking',
        a: 'Contact us immediately at therookiestudio.ch@gmail.com with:<br/>• Your account email<br/>• Booking details<br/>• Payment confirmation/receipt<br/><br/>We\'ll investigate and process a refund if confirmed.',
      },
    ],
  },
  {
    category: 'Safety & Policies',
    icon: '🛡️',
    questions: [
      {
        q: 'Is dance physically demanding? Do I need to be fit?',
        a: 'Dance classes involve physical movement and exertion. While you don\'t need to be an athlete, you should:<br/>• Be in adequate physical condition to participate<br/>• Have no medical conditions that would prevent safe participation<br/>• Consult a physician before starting if you have health concerns',
      },
      {
        q: 'What if I have a medical condition or injury?',
        a: '• Inform instructors before class about any medical conditions, injuries, or physical limitations<br/>• Instructors are not medical professionals and cannot provide medical advice<br/>• You participate at your own risk and should listen to your body',
      },
      {
        q: 'Do I need insurance?',
        a: 'Yes! You are solely responsible for obtaining and maintaining personal health and accident insurance. The Rookie Dance Studio does not provide insurance coverage for participants.',
      },
      {
        q: 'Can photos or videos be taken during classes?',
        a: 'By participating in classes, you grant us permission to capture photos, videos, and other media for promotional, marketing, educational, and archival purposes. If you wish to opt out, notify us in writing at therookiestudio.ch@gmail.com.',
      },
      {
        q: 'What are the rules of conduct?',
        a: 'Participants must:<br/>• Follow all instructor guidance and safety instructions<br/>• Respect fellow participants, instructors, and staff<br/>• Maintain a positive, supportive, and inclusive environment<br/>• Refrain from disruptive, unsafe, or inappropriate behavior<br/><br/>Prohibited: harassment, discrimination, intoxication, unauthorized recording, and any behavior endangering others.',
      },
    ],
  },
  {
    category: 'Contact & Support',
    icon: '📞',
    questions: [
      {
        q: 'How can I contact The Rookie Dance Studio?',
        a: '<strong>Email</strong>: therookiestudio.ch@gmail.com<br/><br/><strong>Social Media</strong>:<br/>• Instagram: <a href="https://www.instagram.com/therookiedancestudio" target="_blank" class="text-rookie-cyan hover:text-rookie-cyan/80">@therookiedancestudio</a><br/>• Xiaohongshu: <a href="https://xhslink.com/m/6AztLTO4Ffo" target="_blank" class="text-rookie-cyan hover:text-rookie-cyan/80">The Rookie Dance Studio</a><br/><br/>We aim to respond within 5 business days.',
      },
      {
        q: 'Where are classes held?',
        a: 'Class locations are specified in the course details. We\'ll provide venue information when you book a class.',
      },
      {
        q: 'Can I suggest a song or choreography for a class?',
        a: 'We love suggestions! Contact us at therookiestudio.ch@gmail.com or message us on social media with your ideas.',
      },
      {
        q: 'How can I become an instructor?',
        a: 'We\'re always looking for passionate dancers! Email us at therookiestudio.ch@gmail.com with:<br/>• Your dance background and experience<br/>• Teaching experience (if any)<br/>• Dance styles you specialize in<br/>• Links to videos of your dancing (if available)',
      },
      {
        q: 'Can I host a private group class?',
        a: 'Yes! Contact us at therookiestudio.ch@gmail.com to discuss private group classes, including group size, preferred dance style, date/time preferences, and budget.',
      },
    ],
  },
  {
    category: 'Legal & Privacy',
    icon: '⚖️',
    questions: [
      {
        q: 'Where can I read the full Terms and Conditions?',
        a: 'Visit our <a href="/terms" class="text-rookie-cyan hover:text-rookie-cyan/80">Terms and Conditions</a> page for complete legal terms governing use of our platform and services.',
      },
      {
        q: 'How is my personal data protected?',
        a: 'We take data protection seriously and comply with Swiss Federal Act on Data Protection (FADP). Read our <a href="/privacy" class="text-rookie-cyan hover:text-rookie-cyan/80">Privacy Policy</a> for detailed information about data collection, usage, protection, and your privacy rights.',
      },
      {
        q: 'What are my rights regarding my personal data?',
        a: 'Under Swiss data protection law, you have the right to:<br/>• Access your personal data<br/>• Request correction of inaccurate data<br/>• Request deletion of your data<br/>• Restrict processing of your data<br/>• Data portability<br/>• Object to processing<br/>• Withdraw consent<br/><br/>Contact us at therookiestudio.ch@gmail.com to exercise these rights.',
      },
      {
        q: 'Do you share my data with third parties?',
        a: 'We only share data with essential service providers: Supabase (authentication/database), Vercel (hosting/analytics), and Google Services (email/fonts). We do NOT sell, rent, or trade your personal information. See our <a href="/privacy" class="text-rookie-cyan hover:text-rookie-cyan/80">Privacy Policy</a> for details.',
      },
    ],
  },
  {
    category: 'About Us',
    icon: '🏢',
    questions: [
      {
        q: 'What is The Rookie Dance Studio?',
        a: 'The Rookie Dance Studio is a non-profit Verein (association) registered under Swiss law, dedicated to providing dance education and community activities. We focus primarily on K-pop dance and creating an inclusive, supportive environment for dancers of all levels.',
      },
      {
        q: 'What makes The Rookie Dance Studio special?',
        a: '• <strong>Community-focused</strong>: We\'re a non-profit dedicated to making dance accessible<br/>• <strong>Affordable</strong>: Contribution fees cover costs, not profit<br/>• <strong>Inclusive</strong>: Welcoming environment for all skill levels<br/>• <strong>Modern platform</strong>: Easy online booking and check-in system<br/>• <strong>Passionate instructors</strong>: Experienced dancers who love teaching',
      },
      {
        q: 'How can I stay updated on new classes and events?',
        a: '• <strong>Check the website</strong>: Log in regularly to see new courses<br/>• <strong>Follow us on social media</strong>: Instagram and Xiaohongshu for updates and announcements<br/>• <strong>Email notifications</strong>: We\'ll send important updates to your registered email',
      },
      {
        q: 'Can I provide feedback about a class or instructor?',
        a: 'Absolutely! We value your feedback. Email us at therookiestudio.ch@gmail.com with the class date, instructor name, your feedback (positive or constructive), and suggestions for improvement.',
      },
    ],
  },
]

export function FaqContent() {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter questions based on search query
  const filteredData = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0)

  return (
    <div id="faq-content" className="space-y-6">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 -mx-6 md:-mx-8 mb-6">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rookie-purple/50 focus:border-rookie-purple/50 transition-all font-outfit"
          />
        </div>
      </div>

      {/* FAQ Categories */}
      {filteredData.length > 0 ? (
        <div className="space-y-8">
          {filteredData.map((category, idx) => (
            <div key={idx} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-3 px-2">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="font-syne font-bold text-xl text-white">
                  {category.category}
                </h2>
                <span className="text-white/40 text-sm font-outfit">
                  ({category.questions.length})
                </span>
              </div>

              {/* Questions Accordion */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`${idx}-${qIdx}`}>
                      <AccordionTrigger className="text-left font-outfit text-white/90 hover:text-white">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-white/70 font-outfit leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: item.a }} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/60 font-outfit">
            No questions found matching &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-rookie-cyan hover:text-rookie-cyan/80 font-outfit text-sm"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Still Have Questions */}
      <div className="mt-12 bg-gradient-to-r from-rookie-purple/20 to-rookie-pink/20 rounded-2xl p-6 border border-white/10">
        <h3 className="font-syne font-bold text-xl text-white mb-3">
          Still Have Questions?
        </h3>
        <p className="text-white/80 font-outfit mb-4">
          If you couldn&apos;t find the answer to your question, we&apos;re here to help!
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:therookiestudio.ch@gmail.com"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-outfit font-medium px-6 py-3 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Us
          </a>
          <a
            href="https://www.instagram.com/therookiedancestudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-outfit font-medium px-6 py-3 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </a>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-white/50 font-outfit pt-6 border-t border-white/10">
        <p>
          This FAQ is provided for informational purposes. For legally binding terms, please refer to our{' '}
          <a href="/terms" className="text-rookie-cyan hover:text-rookie-cyan/80">
            Terms and Conditions
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-rookie-cyan hover:text-rookie-cyan/80">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
