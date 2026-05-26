import { useState } from "react"
import { PrototypeProvider } from "./PrototypeContext"
import { Shell } from "./components/Shell"
import { MoodHeader } from "./components/MoodHeader"
import { NowPlayingHero } from "./components/NowPlayingHero"
import { DJCaption } from "./components/DJCaption"
import { QuickChips } from "./components/QuickChips"
import { UpNextPreview } from "./components/UpNextPreview"
import { ChatSheet } from "./components/ChatSheet"
import { QueueSheet } from "./components/QueueSheet"
import { ProfileCard } from "./components/ProfileCard"
import { FocusView } from "./components/FocusView"
import { SettingsView } from "./components/SettingsView"

function Body() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)

  return (
    <Shell>
      <MoodHeader
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <NowPlayingHero onOpenFocus={() => setFocusOpen(true)} />

      <div className="mt-auto">
        <DJCaption onOpenChat={() => setChatOpen(true)} />
        <QuickChips />
        <UpNextPreview onOpenQueue={() => setQueueOpen(true)} />
      </div>

      <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
      <ProfileCard open={profileOpen} onClose={() => setProfileOpen(false)} />
      <FocusView open={focusOpen} onClose={() => setFocusOpen(false)} />
      <SettingsView open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
