# 🎮 Showdown Layout Template

A reusable **UI rendering engine** for live quiz, trivia, and riddle
games.

> 🎯 **Pure UI Only**\
> No scoring. No timers. No state mutation.\
> Templates render visuals. Games provide structured data.

------------------------------------------------------------------------

# 🧠 Core Architecture

    Game Engine (State + Logic)
            ↓
    prepareUIData(state)
            ↓
    Template (Pure Rendering)
            ↓
    Canvas / Stream Output (YouTube / OBS / WebRTC)

------------------------------------------------------------------------

# 🏗 Philosophy

## 🖼 Templates = Presentation Layer

-   Layout\
-   Styling\
-   Animations\
-   Transitions\
-   Visual effects\
-   Rendering logic

## 🎯 Games = Logic Layer

-   Question selection\
-   Answer validation\
-   Timer countdown\
-   Score updates\
-   Leaderboard sorting\
-   Winner selection

------------------------------------------------------------------------

# 📁 Folder Structure

    showdown-layout/
      ├── index.js
      ├── design-system.js
      ├── utils.js
      ├── ui-components.js
      ├── animations.js
      └── README.md

------------------------------------------------------------------------

# 🧩 UI Components

## Header

Displays title, badge, phase label, and optional timer.

## Timer

Circular animated countdown with danger threshold.

## Card

Reusable container for question, results, and overlays.

## Button (Option Card)

States supported: - default - hover - selected - correct - incorrect -
disabled

## List (Leaderboard)

Supports highlighted row and animated ranking.

## Background

Animated gradients, particles, glow effects.

------------------------------------------------------------------------

# 🧾 Template API

## registerTemplate(templateId, templateConfig)

Registers a UI layout.

## renderTemplate(templateId, ctx, uiData)

Renders UI using structured `uiData`.

## getTemplateDimensions(templateId)

Returns:

    { WIDTH, HEIGHT, FPS }

## getTemplateComponents(templateId)

Returns exposed UI components.

------------------------------------------------------------------------

# 📦 UI Data Contract

Example:

``` js
{
  layout: {
    title: "RIDDLE CHALLENGE",
    badge: "Q12/100",
    phase: "QUESTION",
    timer: { timeLeft: 18, totalTime: 25 }
  },
  content: {
    question: { english: "I speak without a mouth..." },
    options: [
      { prefix: "A", label: "Echo", status: "default" }
    ]
  },
  sidebar: {
    leaderboard: [
      { label: "Ravi", value: 150 }
    ]
  }
}
```

------------------------------------------------------------------------

# 🎥 YouTube Live Description (Sample)

## 🧠🔥 TOPIX99 RIDDLE CHALLENGE -- LIVE! 🔥🧠

Think you're smart? Let's test your brain power with 100 mind-bending
riddles!

### 🎮 How To Play

1.  Watch the riddle on screen\
2.  Choose A, B, C, or D\
3.  Type your answer in LIVE CHAT\
4.  Answer before the 25-second timer ends

Fast + Correct = More Points 🏆

### 🏆 Rules

-   1 point per correct answer\
-   Stay till the end for leaderboard results\
-   Winner gets live shoutout 🎉

Like 👍 Subscribe 🔔 Share 📢

------------------------------------------------------------------------

# 🎥 Streaming Ready

-   OBS compatible\
-   1920×1080\
-   30 FPS

------------------------------------------------------------------------

# 🚀 Benefits

-   Pure UI architecture\
-   Fully reusable\
-   Clean separation\
-   Scalable for live streaming
