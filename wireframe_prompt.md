# SVETI UI/UX Wireframe Generation Prompt

This prompt is designed to be fed into AI UI generators (such as v0.dev, Claude 3.5 Sonnet, or GPT-4o) to recreate the entire SVETI mobile-first ambient LED controller application.

---

```text
Act as an expert UI/UX developer and front-end engineer. Generate a high-fidelity, interactive, mobile-first wireframe mock application matching the specifications below.

### Design Theme & Aesthetics
- Layout: Mobile-first responsive cyberdeck view. On desktop, center the workspace within an elegant phone simulator frame (rounded bezels, Dynamic Island speaker notch, and home bar). 
- Theme: Dark Mode with pure black (#000000) and slate/zinc backgrounds, glassmorphism overlays (backdrop-blur-md, border-white/5), and glowing neon neon accent highlights:
  - Primary: Glowing Purple (rgb(139, 92, 246))
  - Secondary: Hot Pink (rgb(236, 72, 153))
  - Accent: Vibrant Cyan (rgb(6, 182, 212))
- Typography: Clean sans-serif sans (e.g. Inter/Outfit), monospace elements for status, coordinates, and codes.

---

### SCREEN 1: OPERATOR AUTH LOCK GATE
- Header: Sparkles icon with "SVETI Operator Panel".
- Layout: Vertically centered auth card.
- Sign In Panel: Email, password, submit button.
- Registration Toggle: Displays Display Name input and 4 avatar badges (colored circles: Cyber Pink, Neon Mint, Sunset Glow, Electric Indigo).
- Google Authentication: Standardized white button with a vector Google logo reading "Sign In with Google".
- Guest Operator: Secondary button "Continue without registration (Guest)".
- Lock State: All application states and main bottom navigation are hidden until a session is set.

---

### SCREEN 2: DUAL BLE & WIFI ONBOARDING SCANNER
- Navigation state: Only accessible after authentication. Bottom navigation bar is hidden.
- Header: Back button hidden. Title: "Connect Controller".
- Scan Mode Selector: 2-option segment selector pill:
  - Tab 1: "Bluetooth (BLE)" - displays a pulsing radar circular radar-sweeper vector graphics, "Start Scan" trigger, and list of discovered bluetooth lights (e.g. SVETI Strip, Happy Bulb).
  - Tab 2: "WiFi / Network" - displays a form card with "Device Name" and "IP Address" fields, "+ Add WiFi Device" button, and a list of active network devices (with IP details, Connect, and Delete buttons).

---

### SCREEN 3: OPERATOR DASHBOARD (HOME)
- Header: Logo sparkles with "SVETI" and "v2.4 Pro" badge. Glowing green dot indicating connection.
- Column 1:
  - Active Connection status card (shows active device name/IP). Displays a red "Disconnect" button inline. Tapping other parts of the card opens Screen 2.
  - Active Preset Player card: current preset title, timeline tracker line, and play/pause/brightness controls.
  - My Saved Presets shelf: listing custom user layouts with click-to-load and trashcan icons.
- Column 2:
  - Device Layout card: active geometry selector links (Strip, Matrix, Ring) and size configurator buttons.
  - Quick Templates grid: device-filtered presets (e.g. Strip shows Cyber City / Fire; Matrix shows Binary Rain / Ocean; Ring shows Radar / Aura).

---

### SCREEN 4: WORKSPACE CANVAS & LAYERS STACK
- Visualizer Panel: High-fidelity SVG/Canvas preview rendering real-time LED array patterns. Shows circular dots grid depending on geometry (linear strip, 2D matrix, radial ring).
- Layers Stack: List of animation layers. Each card features visibility toggle (eye/eye-closed icon), opacity slider, blend mode select dropdown (normal, add, multiply, overlay), and vertical drag reorder handles.
- Actions: "+ Add Layer" button, and a floating green "Export C++ Code" button opening a bottom drawer.

---

### SCREEN 5: PARAMETER LAYER DETAILS EDITOR
- Contextual sliders and inputs based on selected layer effect:
  - Solid: Quick-select circular color wheels (Red, Green, Blue, Cyan, Purple, Magenta, Yellow, Orange).
  - Gradient: Canvas preview showing stop ranges, sliders to adjust positions, and quick gradient presets buttons (Cyberpunk, Sunset Glow, Ocean Ripple, Forest Aurora).
  - Noise: Speed/scale knobs.
  - Script: Monospace code editor text area for formulas, compilation indicator dot (OK/Error), and formula snippets inject selectors (Sine Wave, Interference, Vortex).
  - Audio: Pulse scale, audio reactive threshold, and sound trigger settings.

---

### SCREEN 6: SOCIAL PRESETS HUB (CLOUD)
- Preset Cards Grid: 2-column layout showing community templates, name, layout badge, like counter, and author avatar.
- Comments Sheet: Bottom slide-up sheet showing user avatar lists and scrolling comment list.
- Publish Drawer: Input text details and publish preset form.

---

### SCREEN 7: USER PROFILE SETTINGS
- Operator Details Badge: User avatar color badge showing initials, operator name, and account type (Registered Cloud Account vs Guest Operator).
- Form Controls: Edit display name field, select badge colors circles.
- Action: "Save Profile Settings" button, and a red "Sign Out / Exit Operator" button that terminates session and redirects back to Screen 1.

---

### GLOBAL NAVIGATION BAR
- Sticky bottom bar containing 4 actions: "Home" (Dashboard), "Canvas" (Workspace), "Cloud" (Social Hub), and "Profile" (Settings).
- Active items are highlighted with primary violet glowing dots and accent text.
```
