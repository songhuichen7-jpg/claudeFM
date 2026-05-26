// UPnP push-to-Naim (or any UPnP-MediaRenderer). Skipped unless NAIM_URL env
// is set — the rest of the system works without it; this just *mirrors* the
// now-playing URL to a living-room speaker.

const NAIM_URL = process.env.NAIM_URL // e.g. http://192.168.1.50:8080

export async function pushToRoom(trackUrl: string, title: string, artist: string): Promise<boolean> {
  if (!NAIM_URL) return false
  try {
    const body = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<s:Body>
  <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
    <InstanceID>0</InstanceID>
    <CurrentURI>${trackUrl}</CurrentURI>
    <CurrentURIMetaData>${escapeXml(`<DIDL-Lite><item><dc:title>${title}</dc:title><upnp:artist>${artist}</upnp:artist></item></DIDL-Lite>`)}</CurrentURIMetaData>
  </u:SetAVTransportURI>
</s:Body>
</s:Envelope>`
    const res = await fetch(`${NAIM_URL}/AVTransport/Control`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=\"utf-8\"",
        SOAPACTION: "\"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI\"",
      },
      body,
    })
    return res.ok
  } catch (err) {
    console.warn("[naim] push failed", (err as Error).message)
    return false
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, c => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;",
  }[c]!))
}

export function naimEnabled() {
  return !!NAIM_URL
}
