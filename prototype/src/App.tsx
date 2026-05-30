import { useState } from "react"
import { PrototypeProvider } from "./PrototypeContext"
import { Shell } from "./components/Shell"
import { Header } from "./components/Header"
import { ClockPanel } from "./components/ClockPanel"
import { PlayerBar } from "./components/PlayerBar"
import { ChatLive } from "./components/ChatLive"
import { Composer, Footer } from "./components/Composer"
import { Toast } from "./components/Toast"
import { ProfileCard } from "./components/ProfileCard"
import { FocusView } from "./components/FocusView"
import { SettingsView } from "./components/SettingsView"

function Body() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <Shell>
      {/* Centered "device" frame — one hairline-bordered column. */}
      <div className="relative mx-auto flex h-full w-full max-w-[680px] flex-col overflow-hidden sm:my-4 sm:h-[calc(100%-2rem)] sm:rounded-2xl sm:border sm:border-white/8 sm:bg-white/[0.012] light:sm:border-black/8">
        <Header
          onOpenProfile={() => setProfileOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="thin-scroll flex-1 overflow-y-auto">
          <div className="px-4 pt-1 pb-2 sm:px-5">
            <ClockPanel onTap={() => setFocusOpen(true)} />
          </div>
          <PlayerBar />
          <ChatLive />
        </main>

        <Composer />
        <Footer />

        <FocusView open={focusOpen} onClose={() => setFocusOpen(false)} />
        <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <ProfileCard open={profileOpen} onClose={() => setProfileOpen(false)} />
        <Toast />
      </div>
    </Shell>
  )
}

export default function App() {
  return (
    <PrototypeProvider>
      <Body />
    </PrototypeProvider>
  )
}
