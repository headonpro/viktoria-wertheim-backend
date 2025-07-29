// Alternative Option 3: MagicUI Border Beam
// First install the BorderBeam component from MagicUI
// Then replace the highlighting section with this:

import { BorderBeam } from '@/components/ui/border-beam'

// In the component:
{/* Viktoria team highlighting - animated border beam */}
{isViktoriaTeam && (
  <BorderBeam 
    size={60}
    duration={3}
    colorFrom="#FFD700"
    colorTo="#FFD700"
    className="opacity-60"
  />
)}

// This creates a subtle animated golden beam that travels around the border
// Much more elegant than a full background fill