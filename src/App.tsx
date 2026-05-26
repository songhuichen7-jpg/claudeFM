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

function Body() {
  const { hideChat } = usePlayer()
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <Shell>
      <Header onOpenProfile={() => setProfileOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      <Clock onTap={() => setFocusOpen(true)} />
      <Player onOpenFocus={() => setFocusOpen(true)} />
      {!hideChat && <ChatStream />}
      <div className="mt-auto">
        <InputBar />
        <Footer />
      </div>
      <ProfileCard open={profileOpen} onClose={() => setProfileOpen(false)} />
      <FocusView open={focusOpen} onClose={() => setFocusOpen(false)} />
      <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
