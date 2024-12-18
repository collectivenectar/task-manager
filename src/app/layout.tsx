import { Providers } from './providers'
import './globals.css'

export const metadata = {
  title: 'Your App Name',
  description: 'Your app description'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}