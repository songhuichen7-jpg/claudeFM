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
import { LibraryView } from "./components/LibraryView"
import { Toast } from "./components/Toast"

function Body() {
  const { hideChat } = usePlayer()
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  return (
    <Shell>
      {/* Centered "device" frame — one hairline-bordered column. */}
      <div className="shell-glow relative mx-auto flex h-full w-full max-w-[680px] flex-col overflow-hidden sm:my-4 sm:h-[calc(100%-2rem)] sm:rounded-2xl sm:border sm:border-white/8 sm:bg-white/[0.012] light:sm:border-black/8">
        <Header
          onOpenProfile={() => setProfileOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />

        <main className="thin-scroll flex-1 overflow-y-auto">
          <div className="px-4 pt-1 pb-2 sm:px-5">
            <Clock onTap={() => setFocusOpen(true)} />
          </div>
          <Player onOpenFocus={() => setFocusOpen(true)} />
          {!hideChat && <ChatStream />}
        </main>

        <InputBar />
        <Footer />

        <FocusView open={focusOpen} onClose={() => setFocusOpen(false)} />
        <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <LibraryView open={libraryOpen} onClose={() => setLibraryOpen(false)} />
        <ProfileCard open={profileOpen} onClose={() => setProfileOpen(false)} />
        <Toast />
      </div>
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
