import { useState } from "react"
import { PlayerProvider, usePlayer } from "./state/PlayerContext"
import { Shell } from "./components/Shell"
import { Header } from "./components/Header"
import { Clock } from "./components/Clock"
import { Player } from "./components/Player"
import { ChatStream } from "./components/ChatStream"
import { InputBar, Footer } from "./components/InputBar"
import { ProfileCard } from "./components/ProfileCard"
import { FocusView } from "./components/FocusView"
import { SettingsView } from "./components/SettingsView"
import { LoginCard } from "./components/LoginCard"

function Body() {
  const { hideChat } = usePlayer()
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  // Bumped whenever LoginCard's NcmLoginPanel reports a status change so the
  // Header pill refreshes "LOGIN" → nickname (and vice versa on logout).
  const [loginRev, setLoginRev] = useState(0)

  return (
    <Shell>
      <Header
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLogin={() => setLoginOpen(true)}
        loginRevision={loginRev}
      />
      <Clock onTap={() => setFocusOpen(true)} />
      <Player onOpenFocus={() => setFocusOpen(true)} />
      {!hideChat && <ChatStream />}
      <div className="mt-auto">
        <InputBar />
        <Footer />
      </div>
      <ProfileCard
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <FocusView open={focusOpen} onClose={() => setFocusOpen(false)} />
      <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginCard
        open={loginOpen}
        onClose={() => { setLoginOpen(false); setLoginRev(r => r + 1) }}
        onStatusChange={() => setLoginRev(r => r + 1)}
      />
    </Shell>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <Body />
    </PlayerProvider>
  )
}
