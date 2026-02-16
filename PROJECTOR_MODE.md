# Projector Mode Implementation Guide

## Overview
The Projector Mode feature allows you to run a separate read-only view of the tournament draw that automatically synchronizes with the admin control panel in real-time. Perfect for displaying the live draw on a projector or second screen.

## Components Added

### 1. **ProjectorView.tsx** (`app/routes/projector.tsx`)
A dedicated read-only component that:
- Displays pots, groups, and team assignments
- Shows the currently selected team with animated highlighting
- Updates in real-time via Broadcast Channel API
- Optimized for full-screen display with larger fonts and cards
- Includes a live sync indicator at the bottom right
- Completely removes all admin controls and input fields

#### Key Features:
- **Live Status Display**: Shows current selection and assignment progress
- **Responsive Grid Layout**: Automatically adjusts for different screen sizes
- **Animation Effects**: Smooth transitions when teams are selected or assigned
- **Empty State**: Displays helpful message while waiting for the draw to start
- **Sync Indicator**: Visual confirmation that the projector is receiving live updates

### 2. **Broadcast Channel Integration**
#### In `app/routes/home.tsx` (Admin Panel):
```typescript
// Initialization
const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

// Setup in useEffect
broadcastChannelRef.current = new BroadcastChannel("draw_sync");

// Broadcasting state changes
useEffect(() => {
  if (broadcastChannelRef.current && hydrated) {
    broadcastChannelRef.current.postMessage({
      pots,
      groups,
      selectedTeam,
    });
  }
}, [pots, groups, selectedTeam, hydrated]);
```

#### In `ProjectorView.tsx`:
```typescript
// Listen for state updates
const channel = new BroadcastChannel("draw_sync");
channel.addEventListener("message", (event) => {
  const { pots, groups, selectedTeam } = event.data;
  setDrawState({ pots, groups, selectedTeam });
});
```

## Routing Configuration

Updated `app/routes.ts` to include:
```typescript
route("projector", "routes/projector.tsx")
```

This creates a `/projector` route accessible via:
- Direct URL: `http://localhost:5173/projector`
- Button in admin panel: "🎬 Open Projector" button

## How to Use

### Opening the Projector View
1. In the admin panel (main draw screen), click the **"🎬 Open Projector"** button in the header
2. This opens a new window with the projector view
3. Arrange windows side-by-side or use projector setup

### How Synchronization Works
1. When you perform any action in the admin panel (create pots, teams, etc.), the state updates
2. The Broadcast Channel API immediately sends this state to the projector window
3. The projector view receives the message and updates its local state
4. Animations play smoothly to show the changes

### What Synchronizes
- **Pots and Teams**: All pot data including team names and counts
- **Groups and Slots**: Group structure and team assignments
- **Selected Team**: Currently selected team is highlighted
- **Progress**: Assignment progress updates in real-time

## UI Features

### Projector View
- **Large, readable typography** optimized for distance viewing
- **Full-width layout** with responsive grid system
- **Color-coded sections**: Red for pots, green for groups
- **Animated transitions**: Smooth animations when state changes
- **Live sync indicator**: Bottom-right corner shows connection status
- **Progress tracking**: Real-time display of teams assigned
- **Selected team highlighting**: Large pulsing indicator when team is selected

### Admin Controls (Home.tsx)
- New "🎬 Open Projector" button in header (green gradient background)
- No changes to existing functionality
- Full admin controls remain intact

## Performance Considerations

- **Broadcast Channel API**: Native browser feature, zero-latency communication
- **Local state management**: Each window maintains its own state copy
- **Efficient updates**: Only broadcasts when state actually changes
- **No network overhead**: Communication happens locally within the browser
- **Independent components**: Projector view can't modify state (read-only)

## Responsive Design

The projector view is fully responsive:
- **Desktop**: Grid-based layout with 3+ columns
- **Tablet**: 2-column layout
- **Mobile**: Single-column layout (for testing/backup screens)

## Browser Compatibility

- **Broadcast Channel API** requires modern browsers:
  - Chrome 54+
  - Firefox 38+
  - Safari 15.1+
  - Edge 79+

## Styling

All projector-specific styles are in `app/app.css` with the prefix `.projector-*`:
- `.projector-container`: Main wrapper
- `.projector-header`: Top section with status
- `.projector-pots-grid`: Pot cards layout
- `.projector-groups-grid`: Group cards layout
- `.projector-team-card`: Individual team display
- `.projector-slot`: Group slot display
- `.sync-indicator`: Live sync badge

## Cleanup

When closing the projector window:
- The Broadcast Channel automatically unsubscribes
- No lingering connections or listeners
- Admin panel continues functioning normally

## Advanced Usage

### Custom Window Size
```typescript
window.open("/projector", "projector", "width=1920,height=1080,fullscreen=yes")
```

### Multiple Monitors
1. Open projector in one monitor
2. Keep admin panel in another
3. Drag windows to preferred positions
4. Projector synchronizes across monitors

## Troubleshooting

**Projector not updating?**
- Check browser console for errors
- Verify Broadcast Channel API is supported
- Ensure both windows are same origin (localhost/same domain)
- Check that admin panel window has focus and is making changes

**Sync indicator shows disconnected?**
- The projector only shows "live" after receiving first message
- Perform an action in the admin panel (select a team, create group, etc.)
- Sync indicator should activate immediately

**Projector window is blank?**
- Verify admin panel is open and has pots/groups created
- Broadcast Channel requires same-origin windows
- Try refreshing the projector window

## Future Enhancements

Potential improvements:
- Multiple projector windows (different views)
- Recording/replay functionality
- Custom themes for different tournaments
- Spectator vote display integration
- Live chat/comments overlay
