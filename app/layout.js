import "../styles/globals.css";
import { Toaster } from "sonner";
import { ProfileProvider } from "../store/profile-context";

export const metadata = {
  title: "LearningOS — AI-Powered Personal Learning Platform",
  description: "Track your study progress, analyze test performance, and get AI-powered insights",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-base text-primary antialiased">
        <ProfileProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "rgb(20,20,30)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgb(240,240,255)",
                fontFamily: "'Inter', sans-serif",
              },
            }}
          />
        </ProfileProvider>
      </body>
    </html>
  );
}
