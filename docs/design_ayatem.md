# CodePilot AI Design System

Version: 1.0

---

# Design Philosophy

CodePilot AI is not a dashboard.

CodePilot AI is a developer operating system.

Every UI decision should prioritize:

• Focus
• Speed
• Clarity
• Consistency
• Low cognitive load

The editor is always the center of attention.

---

# Principles

## 1. Editor First

The Monaco editor is the primary workspace.

Everything else supports the editor.

Never let side panels overpower the editor.

---

## 2. Progressive Disclosure

Do not show everything.

Show only what is needed.

Advanced tools appear only when requested.

---

## 3. Keyboard First

Every action should be executable without using the mouse.

Examples

Ctrl + K

Ctrl + P

Ctrl + Shift + A

Esc

Arrow Keys

Enter

Tab

---

## 4. Fast > Fancy

Animations should improve understanding.

Never slow the workflow.

---

# Layout

Primary Layout

---

Explorer

Editor

AI Sidebar

---

Bottom Workspace (collapsed)

---

Status Bar

---

---

# Panel Widths

Explorer

260px

Minimum

220px

Maximum

360px

Resizable

---

AI Sidebar

380px

Minimum

320px

Maximum

520px

Resizable

---

Bottom Workspace

Collapsed by default

Height

300px

Resizable

Maximum

70% screen height

---

# Grid

Use 8px spacing.

Allowed spacing

4

8

12

16

24

32

48

64

Never invent random spacing.

---

# Border Radius

Small

8px

Medium

12px

Large

16px

Cards

16px

Buttons

12px

Inputs

10px

---

# Shadows

Level 1

Small cards

Level 2

Dialogs

Level 3

Floating panels

No excessive glow.

---

# Colors

Background

#090B11

Surface

#10131B

Panel

#151A24

Border

#2B3345

Divider

#202838

---

Primary

Purple

#7C5CFF

Hover

#9378FF

---

Success

#3DDC84

Warning

#F6C445

Danger

#FF5C7A

Info

#3DA5FF

---

Text

Primary

#F3F4F6

Secondary

#B8C1D1

Muted

#6B7280

---

# Typography

Heading XL

32

Heading L

24

Heading M

20

Heading S

16

Body

14

Caption

12

Code

Monospace

---

# Icons

Use only one icon library.

Recommended

Lucide React

Never mix icon libraries.

---

# Buttons

Primary

Filled Purple

Secondary

Outlined

Danger

Red

Ghost

Transparent

Icon Button

Square

40x40

---

# Inputs

Height

40px

Rounded

10px

Placeholder

Muted

Focus

Purple Border

---

# Cards

Padding

24px

Radius

16px

Border

1px

No heavy shadows.

---

# Animation

Fast

150ms

Normal

250ms

Slow

350ms

Use

opacity

transform

Never animate

width

height

left

top

---

# Loading

Skeleton

Instead of spinner

Progress Bar

For long tasks

Streaming

For AI

---

# Empty States

Every panel needs

Icon

Title

Description

Action Button

Never leave blank screens.

---

# Notifications

Top Right

Auto dismiss

4 seconds

Success

Green

Warning

Yellow

Error

Red

---

# Modals

Maximum width

1200px

Escape closes

Backdrop blur

Focus trap

---

# Editor

Always dominant.

Minimum

65%

Preferred

75%

Maximum

80%

---

# Accessibility

Keyboard accessible

Visible focus

Contrast AA

Screen reader labels

---

# Responsive

Desktop

Primary target

Tablet

Supported

Mobile

Read-only

---

# Naming

Components

PascalCase

Hooks

camelCase

Utils

camelCase

Constants

UPPER_CASE

---

# Folder Structure

components/

hooks/

tabs/

services/

utils/

layouts/

contexts/

assets/

styles/

---

# UI Checklist

Before merging

□ Consistent spacing

□ Correct colors

□ Correct typography

□ Keyboard navigation

□ Responsive

□ Loading state

□ Empty state

□ Error state

□ Accessible

□ No layout shift

□ No console errors

---

# Product Goal

Every screen should answer one question:

"What is the developer trying to do right now?"

Everything unrelated should stay hidden until needed.

CodePilot AI should feel like a professional IDE rather than a collection of AI tools.
