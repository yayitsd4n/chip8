# Chip-8 interpreter
![Chip-8 Demo](/images/demo.gif)

---

## What is this?
This is a Chip-8 interpreter written in JavaScript. It runs in a browser and should work fine on a phone. So far only it's only been tested in Chrome and mobile Safari, but should run on any modern browser. You can clone the repo and run index.html through a local server, or just view the project [here](https://yayitsd4n.github.io/chip8/).

## What is a Chip-8?
Chip-8 is an interpreted programming language used in the mid 1970s. It ran on a virtual machine and was created to allow games to be easily made for a multitude of computers and calculators. More information can be found on [Wikipedia](https://en.wikipedia.org/wiki/CHIP-8).

## How do you use this?
After selecting and starting a game, the keys on screen or on a keyboard can be used as input. Each game has different controls, so you have to input keys through trial and error since game instructions were out of scope with what I wanted to do.

The Chip-8 runs at 60hz, but there's no specification on how many instructions are supposed to run in each tick. To account for this, I added a *Game Speed* slider. The games I tested seemed to run well at 10 instructions per tick, but you can raise or lower that if the speed seems incorrect to you.

## Debugger
A debug side bar is enabled at wider resolutions to show the *Stack Trace*, *Registers*, and debug controls. The *Stack Trace* view shows the last 500 opcodes that have been run. Below the *Stack Trace*, there are controls to stop execution, continue execution, or execute one opcode at a time. Below the controls are a live view of the registers.

While execution is paused, the stack trace items can be hovered over. While hovered, the registers and screen will update to what the values were while executing that opcode. If a stack trace item is clicked, the program will jump to that point in history and continue from there.

## Why did I did this
As intimidating as it is to me, hardware emulation has always been an interest of mine. While Chip-8 technically isn't hardware, it's often recommended as a good stepping stone due it's simplicity and low number of opcodes.

## Resources
* [CowGod's Chip-8 Technical Reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM)
* [Chip-8 Wikipedia](https://en.wikipedia.org/wiki/CHIP-8)
* [Chip-8 Guide](http://www.multigesture.net/articles/how-to-write-an-emulator-chip-8-interpreter/)
