import { useState } from "react"
import { PrototypeProvider } from "./PrototypeContext"
import { Shell } from "./components/Shell"
import { MoodHeader } from "./components/MoodHeader"
import { MoodTabs } from "./components/MoodTabs"
import { NowPlayingHero } from "./components/NowPlayingHero"
import { QuickChips } from "./components/QuickChips"
import { Timeline } from "./components/Timeline"
import { Composer } from "./components/Composer"
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
      <MoodHeader
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <MoodTabs />

      <main className="thin-scroll relative flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[640px]">
          <NowPlayingHero onOpenFocus={() => setFocusOpen(true)} />
          <QuickChips />
        </div>
        <div className="mt-2">
          <Timeline />
        </div>
      </main>

      <Composer />

      <Toast />
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
