# Implementation Spec: S1-LAYOUT-02 — 4-Panel TUI Layout

## 🆔 Task ID
`S1-LAYOUT-02` (client-layout-panels)

## 🎯 Objective
Implement the 4-panel terminal layout using `ratatui`. This provides the visual interface for the game's dashboard, ensuring the Radar, Status, Events, and Command Bar are correctly positioned and labeled.

## 📁 File Location
`spacemud-client/src/ui/`

## 📋 Steps
1.  **Layout Logic**: Create `src/ui/layout.rs` using `ratatui::layout`.
2.  **Define Areas**:
    - **Radar**: Top-left (70% width, 70% height).
    - **Status**: Top-right (30% width, 70% height).
    - **Events**: Bottom-left (100% width, 25% height).
    - **Command Bar**: Bottom-left (100% width, 5% height).
3.  **Borders & Titles**: Each panel should have a distinct border and title (e.g., "RADAR", "STATUS", "LOG", "CMD").

## ✅ Acceptance Criteria
1.  The TUI layout displays all 4 panels on screen.
2.  The layout responds to window resizing correctly.
3.  The Command Bar is at the bottom of the screen.

## 🧪 Verification
1.  Run the client and manually verify the positions and labels.
2.  Resize the terminal window to confirm it scales correctly.
