import { useState } from "react"
import { PrototypeProvider } from "./PrototypeContext"
import { Shell } from "./components/Shell"
import { MoodHeader } from "./components/MoodHeader"
import { NowPlayingHero } from "./components/NowPlayingHero"
import { DJCaption } from "./components/DJCaption"
import { QuickChips } from "./components/QuickChips"
import { SidePanel, type SidePanelTab } from "./components/SidePanel"
import { Toast } from "./components/Toast"
import { ProfileCard } from "./components/ProfileCard"
import { FocusView } from "./components/FocusView"
import { SettingsView } from "./components/SettingsView"

function Body() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sideTab, setSideTab] = useState<SidePanelTab>("chat")

  return (
    <Shell>
      <MoodHeader
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="relative flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col items-center justify-center px-8 pb-4">
          <div className="flex w-full max-w-[460px] flex-col">
            <NowPlayingHero onOpenFocus={() => setFocusOpen(true)} />
            <DJCaption onOpenChat={() => setSideTab("chat")} />
            <QuickChips />
          </div>
        </section>
        <SidePanel tab={sideTab} setTab={setSideTab} />
      </main>

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
