import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
export const dynamic = "force-dynamic";
export default async function SettingsPage() { const settings = await prisma.bookSettings.findFirstOrThrow(); return <><div className="admin-header"><div><p className="eyebrow">CONFIGURATION</p><h1>Settings</h1></div></div><p className="settings-help">Price changes apply to new orders only. Historical order snapshots are never rewritten. Use a signed stock adjustment for inventory changes.</p><SettingsForm settings={settings} /></>; }
