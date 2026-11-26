# 42 Exam Practice Shell

⚡ An interactive practice environment for 42 School exams (Ranks 02-06) ⚡

## 📋 Overview

This project provides a comprehensive practice shell for 42 School examinations, offering interactive menus and practice exercises for different exam ranks. The shell simulates the actual exam environment and helps students prepare effectively.

## 🚀 Features

- **Interactive Menu System**: Clean, colorful terminal interface
- **Multiple Exam Ranks**: Support for Ranks 02, 03, 04, 05 and 06
- **Practice Environment**: Dedicated workspace (`rendu` folder) for submissions
- **Command Practice**: Built-in command reference and practice
- **Easy Navigation**: Simple numbered menu system

## 📁 Project Structure

```
.
├── exam.sh           # Main entry point
├── Makefile          # Build configuration
├── README.md         # This file
└── .resources/       # Practice materials
    ├── main/         # Main menu and interface
    ├── rank02/       # Rank 02 exam exercises
    ├── rank03/       # Rank 03 exam exercises
    ├── rank04/       # Rank 04 exam exercises
    ├── rank05/       # Rank 05 exam exercises
    └── rank06/       # Rank 06 exam exercises
```

## 🔧 Installation & Usage

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/terminal-42s/42_examshell
   cd 42_examshell

2. **Run the exam shell**:
   ```bash
   make
   ```
   
   Or directly:
   ```bash
   bash exam.sh
   ```

### Menu Options

The main menu provides the following options:

- **🔄 1. Commands**: Access command reference and practice
- **🚀 2. Exam Rank 02**: Practice exercises for Rank 02 exam
- **📋 3. Exam Rank 03**: Practice exercises for Rank 03 exam  
- **📄 4. Exam Rank 04**: Practice exercises for Rank 04 exam
- **📄 5. Exam Rank 05**: Practice exercises for Rank 05 exam
- **📄 6. Exam Rank 06**: Practice exercises for Rank 06 exam
- **📁 7. Open Rendu Folder**: Access your submission workspace
- **🔄 8. Update Shell**: Keep your exam shell up-to-date with latest features

## 💡 How to Use

1. Launch the application using `make` or `bash exam.sh`
2. Select your desired exam rank or practice option
3. Follow the on-screen instructions
4. Complete exercises in the automatically created `rendu` folder
5. Use the practice environment to simulate real exam conditions

## 🎮 Exam Quest (memory trainer)

A gamified GUI for committing the exam answers to memory. Currently covers **Rank 03**.

```bash
make game
```

(or just open `game/index.html` in a browser — no server or dependencies needed.)

Each solution is split into small blocks, and every block is drilled in four modes of rising difficulty:

| Mode | What you do |
|------|-------------|
| **Order** | Pick the shuffled lines in the right order |
| **Gaps** | Fill in ~35% of the tokens |
| **Gaps+** | Fill in ~70% of the tokens |
| **Recall** | Type every line from memory (spacing is free, tokens must match) |

Then a **Boss fight** per exercise: the whole file from memory. You earn XP, combos, stars and a daily streak, and blocks you have recalled come back as spaced-repetition **reviews**. Progress is stored in the browser (`localStorage`).

While you train, a **Logic** box at the bottom explains the program in plain words: it hints at what the next line has to do, and once you get it right it shows what that step was for. The **Logic** tab of each exercise shows the whole walkthrough next to the code.

The reference solutions live in `game/solutions/` (`//# id | Title` markers split them into blocks, `| given` marks code the exam hands out, `//! goal` and `//? step || why` lines hold the logic notes, and `//~ step` marks a line that is unchanged from the exam's broken file, shown but not drilled).

Conventions in every solution, so there is one way to remember them: `#include` lines are in **alphabetical order** (after `#define _GNU_SOURCE`, which must come first), and every value is returned **in parentheses**, `return (x);`. When judging, the order of neighbouring `#include` lines never matters. Neighbouring declarations must be in the written order in **Order** mode, but any order is accepted in **Recall** and the boss fight (a declaration still has to come after a variable it uses). **Gaps** keeps every line in place. `return x;` counts the same as `return (x);`.

For **broken_gnl** the solution is the exam's broken file with only the fixes applied, so you only drill the 17 lines that change; the rest is shown dimmed as context. `build.js` checks that every `//~` line really appears in the broken original. After editing them, run `node game/build.js` to regenerate `game/data.js`.

## 📝 Workspace

The shell automatically creates a `rendu` folder where you can:
- Write your solutions
- Test your code
- Practice exam submissions

## 🔄 Staying Up-to-Date

The exam shell includes an automatic update mechanism:

```bash
# From the main menu, select option 8: Update Shell
# Or manually run:
bash update.sh
```

The update script will:
- ✅ Check for latest changes from the repository
- ✅ Display available updates before pulling
- ✅ Download and apply all updates automatically
- ✅ Update file permissions for test scripts
- ✅ Return you to the main menu when complete

Stay tuned for new exam ranks, improved testers, and additional features!

## 🎯 Target Audience

This tool is designed for:
- 42 School students preparing for exams
- Anyone practicing C programming and system administration
- Students wanting to simulate exam conditions

## ⚙️ Requirements

- Bash shell
- Unix-like operating system (Linux/macOS)
- Terminal with color support (recommended)

## 🔄 Updates

The project includes update mechanisms to keep practice materials current with the latest exam requirements.

## 📚 Exam Ranks Covered

- **Rank 02**: Fundamental C programming concepts
- **Rank 03**: Advanced C programming and system calls
- **Rank 04**: Complex algorithms and data structures
- **Rank 05**: Advanced C++ programming and object-oriented design
- **Rank 06**: Advanced system programming (mini_db, mini_serv)

## 🤝 Contributing

This is a practice tool for 42 School students. Contributions and improvements are welcome to enhance the learning experience.

## 📧 Support

For issues or questions regarding the practice environment, please refer to your 42 School resources or community.

---

**Good luck with your exams! 🍀**

*Made for 42 School students by 42 School students*
