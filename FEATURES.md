# Tournament Manager — Features Guide

A simple guide to everything this app can do.

This app helps you run a **live group-stage draw** and show it on a big screen (projector or second monitor). You set up pots and teams, draw them into groups, create match fixtures, and style the on-screen graphics for broadcast.

---

## How the app is organized

There are **two screens**:

| Screen | Address | Who uses it |
|--------|---------|-------------|
| **Control panel** | `/` (main page) | The operator — you run the draw from here |
| **Projector** | `/projector` | The audience screen — read-only, big display |

The control panel and projector stay **in sync** automatically when both are open in the same browser.

There is **no login**. Anyone with the page can use it.

---

## 1. Setup — prepare the tournament

### Pots and teams
- Create pots (example: Pot 1, Pot 2, Pot 3…)
- Choose how many teams each pot has (1–50)
- Enter each team’s name
- Optionally pick an **African country** for the team (for flags)
- Optionally upload a **custom flag** image
- Drag teams to reorder them inside a pot
- Edit or delete a pot
- **Finalize pots** when you are happy (locks editing)
- Unlock pots again later if you need to change them

### Groups
- Set how many groups you need (A, B, C…)
- Set how many teams go in each group
- See a capacity preview before you start
- Edit groups if needed

### Start the draw
- When pots and groups are ready, start team assignment and move to the Draw step

### Quick start
- **Load test data** fills the app with sample African teams and groups so you can try the draw immediately

---

## 2. Draw — assign teams to groups

- Pick a team from a pot
- Click an empty slot in a group to place that team
- Remove a team from a group if you made a mistake (it goes back to its pot)
- Watch live progress: how many teams are assigned vs total
- See a clear message when the draw is finished
- The projector updates live as you assign teams

---

## 3. Matches — create fixtures

- Build rounds by choosing which **group slots** play each other  
  (example: slot 1 vs slot 4, slot 2 vs slot 3 — same pattern for every group)
- Add several rounds
- Give each round a title and optional notes
- Generate the full list of matches from your pairings
- Preview pairings across all groups
- Filter the matches list by round
- Support for a **bye** when a group has an odd number of slots
- Delete round setups you no longer need

> This app covers **group-stage fixtures only**. It does not include knockout brackets, scores, or standings tables.

---

## 4. Projector — the big-screen display

Open a second window for the audience (`Open Projector`).

### What the projector shows
- Pots and groups as the draw happens
- The currently selected team (spotlight)
- Generated fixtures (Groups view or Fixtures view)
- Live sync with the control panel

### Layout themes
Choose how the screen looks:

- Stadium
- Broadcast
- Broadcast 2
- Gala
- Minimal
- Cinematic
- Custom
- L-Shape

Some layouts have extra options (orientation, pot/group colors, how many pot rows, drag-and-resize blocks, and more).

### L-Shape layout extras
- Embed live video (YouTube, Vimeo, Twitch, or a direct embed link)
- Upload a corner photo
- Highlight a chosen pot

### Branding
- Competition title
- Footer text and size
- Upload a competition logo and set its size
- Upload a background image
- Background animation (none, slide, zoom, fade, rotate)
- Scale team and pot text sizes
- Show or hide pots on the projector

### Colors
- **Auto colors** — pull a palette from your background image
- **Manual colors** — set primary, dark, accents, highlight, and text colors yourself
- Apply or reset the color theme

### Fixtures look
When showing matches, pick a fixtures style:

- Classic Board
- Prestige
- Velocity
- Studio Desk

---

## 5. Save, load, and reset

- **Save** the current tournament and visual settings under a name
- **Load** a saved tournament later
- Everything is stored in the browser (local storage) — no cloud account needed
- **Reset** clears pots, groups, matches, and round settings (with a confirmation)

---

## 6. Export

- **Export PNG** — take a screenshot of the current projector design and download it as an image  
  (useful for sharing graphics or archiving the draw result)

---

## 7. Settings and shortcuts

- Open **Projector Settings** from the control panel, or press **Cmd+K** (Mac) / **Ctrl+K** (Windows)
- Settings cover: General, Branding, Visual, Colors, and Behavior
- Confirmation dialogs protect destructive actions (reset, unlock pots, etc.)

---

## 8. Flags and African teams

- Built-in list of African countries
- Local flag images, with a fallback to FlagCDN when needed
- Custom flag upload per team

---

## What this app does **not** include

To keep expectations clear, these are **not** part of the product today:

- User accounts or passwords
- Player rosters or individual player stats
- Entering match scores
- Standings / league tables
- Knockout / elimination brackets
- Automatic random draw (assignment is manual)
- Venues, referees, or scheduling calendars
- Payments or ticketing
- Email / SMS notifications
- Multiple languages (English only)
- Online multi-user access over the internet (projector sync works in the same browser/origin)

---

## Typical workflow (start to finish)

1. Open the **control panel**
2. Create **pots** and add **teams** (with countries/flags if you want)
3. **Finalize** pots, then create **groups**
4. Open the **projector** on the second screen
5. Run the **draw** — select a team, place it in a group slot
6. When the draw is done, set up **match rounds** and generate **fixtures**
7. Style the screen with a **layout**, **logo**, **background**, and **colors**
8. **Save** your work and/or **export a PNG** of the graphics

---

## In one sentence

**Set up pots and teams → draw them into groups on a live projector → generate group fixtures → brand and export the graphics.**
