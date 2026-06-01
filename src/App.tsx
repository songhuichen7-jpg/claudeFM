import { useState } from "react"
import { PlayerProvider, usePlayer } from "./state/PlayerContext"
import { Shell } from "./components/Shell"
import { Header } from "./components/Header"
import { Clock } from "./components/Clock"
import { Player } from "./components/Player"
import { ChatStream } from "./components/ChatStream"
import { InputBar } from "./components/InputBar"
import { ProfileCard } from "./components/ProfileCard"
import { FocusView } from "./components/FocusView"
import { SettingsView } from "./components/SettingsView"
import { LibraryView } from "./components/LibraryView"
import { Toast } from "./components/Toast"
import { DotMatrix } from "./components/DotMatrix"

function Body() {
  const { hideChat } = usePlayer()
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  return (
    <Shell>
      {/* Centered station frame — one hairline-bordered column. */}
      <div className="claudio-device shell-glow relative mx-auto flex h-full w-full max-w-[1320px] flex-col overflow-hidden sm:my-4 sm:h-[calc(100%-2rem)] sm:w-[calc(100%-1rem)] sm:rounded-2xl sm:border sm:border-white/8 sm:bg-white/[0.012] light:sm:border-black/8">
        <DotMatrix className="z-[2] opacity-85" />
        <Header
          onOpenProfile={() => setProfileOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 pt-1 pb-0">
            <Clock onTap={() => setFocusOpen(true)} />
          </div>
          <div className="shrink-0">
            <Player onOpenFocus={() => setFocusOpen(true)} />
          </div>
          {!hideChat && <ChatStream />}
        </main>

        <InputBar />

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
