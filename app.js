import { Gameloop } from './gameloop.js';

var stack = {
    theStack: [],
    get stack() {
        return this.theStack[this.theStack.length - 1];
    },
    set stack(state) {
        this.theStack.push(state);

        if (this.theStack.length >= 500) {
            this.theStack.shift();
        }
    },
    jumpTo(num) {
        this.theStack = this.theStack.slice(0, num + 1);
    },
    reset() {
        this.theStack = [chip8Factory()];
    }
};

var chip8Proto = {
    loadProgram(program) {
        return new Promise((res, rej) => fetch(`./roms/${program}`).then((response) => {
            response.arrayBuffer().then(buffer => {
                var programBuffer = new Uint8Array(buffer);
                for (var i = 0; i < programBuffer.length; i++) {
                    this.memory[i + 512] = programBuffer[i];
                }

                this.screen = Array(64 * 32).fill(0);

                this.fontSet.forEach((font, index) => {
                    this.memory[index] = font;
                });

                this.pc[0] = 0x200;
                this.i[0] = 0;
                this.sp[0] = 0;

                res();
            });
        }));
    },
    emulateCycle() {
        let opcode = this.memory[this.pc[0]] << 8 | this.memory[this.pc[0] + 1];
        let instruction = opcode & 0xF000;
        let x = (opcode & 0x0F00) >> 8;
        let y = (opcode & 0x00F0) >> 4;
        let n = opcode & 0xF;
        let nnn = opcode & 0xFFF;
        let kk = opcode & 0xFF;

        this.pc[0] += 2;

        switch (instruction) {

            case 0x0000:
                switch (opcode) {
                    case 0x00E0:
                        this.screen = Array(64 * 32).fill(0);

                        this.opcode = "0x00E0 -- Clears the screen.";
                        break;
                    case 0x00EE:
                        this.pc[0] = this.stack[--this.sp[0]];
                        
                        this.opcode = "0x00EE -- Returns from a subroutine.";
                        break;
                }
                break;

            case 0x1000:
                this.pc[0] = nnn;

                this.opcode = "0x1NNN -- Jumps to address NNN.";
                break;
            case 0x2000:
                this.stack[this.sp] = this.pc[0];
                this.sp[0]++;
                this.pc[0] = nnn;

                this.opcode = "0x2NNN -- Calls subroutine at NNN.";
                break;
            case 0x3000:
                if (this.v[x] == kk) {
                    this.pc[0] += 2;
                }
                this.opcode = "0x3XNN -- Skips the next instruction if VX equals NN.";
                break;

            case 0x4000:
                if (this.v[x] != kk) {
                    this.pc[0] += 2;
                }

                this.opcode = "0x4XNN -- Skips the next instruction if VX doesn't equal NN.";
                break;
            case 0x5000:
                if (this.v[x] == this.v[y]) {
                    this.pc[0] += 2;
                }

                this.opcode = "0x5XY0 -- Skips the next instruction if VX equals VY.";
                break;
            case 0x6000:
                this.v[x] = kk;

                this.opcode = "0x6XNN -- Sets VX to NN.";
                break;
            case 0x7000:
                this.v[x] += kk;
                this.opcode = "0x7XNN -- Adds NN to VX.";
                break;

            case 0x8000:
                switch (opcode & 0x000F) {
                    case 0x0:
                        this.v[x] = this.v[y];

                        this.opcode = "0x8XY0 -- Sets VX to the value of VY.";
                        break;
                    case 0x1:
                        this.v[x] |= this.v[y];

                        this.opcode = "0x8XY1 -- Sets VX to VX or VY.";
                        break;
                    case 0x2:
                        this.v[x] &= this.v[y];

                        this.opcode = "0x8XY2 -- Sets VX to VX and VY.";
                        break;
                    case 0x3:
                        this.v[x] ^= this.v[y];

                        this.opcode = "0x8XY3 -- Sets VX to VX xor VY.";
                        break;
                    case 0x4:
                        var added = this.v[x] + this.v[y];

                        if (added > 225) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }

                        this.v[x] = added & 0xFF;

                        this.opcode = "0x8XY4 -- Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't.";
                        break;
                    case 0x5:
                        if (this.v[x] > this.v[y]) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }
                        this.v[x] -= this.v[y];

                        this.opcode = "0x8XY5 -- VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.";
                        break;
                    case 0x6:
                        if (this.v[x] & 0x1) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }
                        this.v[x] /= 2;

                        this.opcode = "0x8XY6 -- Stores the least significant bit of VX in VF and then shifts VX to the right by 1.";
                        break;
                    case 0x7:
                        if (this.v[y] > this.v[x]) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }

                        this.v[x] = this.v[y] - this.v[x];

                        this.opcode = "0x8XY7 -- Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.";
                        break;
                    case 0xe:
                        if (this.v[x] & 0x80) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;

                        }
                        this.v[x] *= 2;

                        this.opcode = "0x8XYE -- Stores the most significant bit of VX in VF and then shifts VX to the left by 1.";
                        break;
                }
                break;

            case 0x9000:
                if (this.v[x] != this.v[y]) {
                    this.pc[0] += 2;
                }

                this.opcode = "0x9XY0 -- Skips the next instruction if VX doesn't equal VY.";
                break;
            case 0xA000:
                this.i[0] = nnn;

                this.opcode = "0xANNN -- Sets I to the address NNN.";
                break;
            case 0xB000:
                this.pc[0] = nnn + this.v[0];

                this.opcode = "0xBNNN -- Jumps to the address NNN plus V0.";
                break;
            case 0xC000:
                this.v[x] = Math.floor(Math.random() * 225) & kk;

                this.opcode = "0xCXNN -- Sets VX to the result of a bitwise and operation on a random number and NN.";
                break;
            case 0xD000:
                this.v[15] = 0;
                var regX = this.v[x];
                var regY = this.v[y];

                for (var yLine = 0; yLine < n; yLine++) {
                    var spriteLine = this.memory[this.i[0] + yLine];

                    for (var xLine = 0; xLine < 8; xLine++) {
                        var pixel = spriteLine & (0x80 >> xLine);

                        if (pixel != 0) {
                            if (this.screen[(regX + xLine + ((regY + yLine) * 64))] == 1) {
                                this.v[15] = 1;
                            }
                            this.screen[regX + xLine + ((regY + yLine) * 64)] ^= 1;
                        }
                    }
                }

                this.drawFlag = true;

                this.opcode = "0xDXYN -- Draws a sprite at coordinate (VX, VY) that has a width of 8 pixels and a height of N pixels.";
                break;
            case 0xE000:
                switch (opcode & 0x00FF) {
                    case 0x9E:
                        var key = `key` + this.v[x].toString(16);
                        if (this.keys[key]) {
                            this.pc[0] += 2;
                        }

                        this.opcode = "0xEX9E -- Skips the next instruction if the key stored in VX is pressed.";
                        break;
                    case 0xA1:
                        var key = `key` + this.v[x].toString(16);
                        if (!this.keys[key]) {
                            this.pc[0] += 2;
                        }

                        this.opcode = "0xEX9E -- Skips the next instruction if the key stored in VX isn't pressed.";
                        break;
                }
                break;

            case 0xF000:
                switch (opcode & 0x00FF) {
                    case 0x07:
                        this.v[x] = this.dt[0];

                        this.opcode = "0xFX07 -- Sets VX to the value of the delay timer.";
                        break;
                    case 0x0A:
                        this.running = false;
                        UI.removeKeys();

                        var pause = (key) => {
                             if (`key${key}` in this.keys) {
                                document.removeEventListener('keypress', pause);
                                this.v[x] = this.keys[key];
                                UI.setKeys();
                                this.running = true;
                            }
                        }

                        document.addEventListener('keypress', e => {
                            pause(e.key);
                        });
                        document.querySelector('.js-keyboard').addEventListener('touchstart', e => {
                            pause(e.target.innerHTML.toString().toLowerCase());
                            e.preventDefault();
                        });
                        document.querySelector('.js-keyboard').addEventListener('mouseup', e => {
                            pause(e.target.innerHTML.toString().toLowerCase());
                        });

                        this.opcode = "0xFX0A -- A key press is awaited, and then stored in VX.";
                        return;
                    case 0x15:
                        this.dt[0] = this.v[x];

                        this.opcode = "0xFX15 -- Sets the delay timer to VX.";
                        break;
                    case 0x18:
                        this.st[0] = this.v[x];

                        this.opcode = "0xFX18 -- Sets the sound timer to VX.";
                        break;
                    case 0x1E:
                        this.i[0] += this.v[x];

                        this.opcode = "0xFX1E -- Adds VX to I. VF is set to 1 when there is a range overflow, and to 0 when there isn't.";
                        break;
                    case 0x29:
                        this.i[0] = this.v[x] * 5;

                        this.opcode = "0xFX29 -- Sets I to the location of the sprite for the character in VX. Characters 0-F are represented by a 4x5 font.";
                        break;
                    case 0x33:
                        this.memory[this.i[0]] = this.v[x] / 100;
                        this.memory[this.i[0] + 1] = (this.v[x] / 10) % 10;
                        this.memory[this.i[0] + 2] = (this.v[x] % 100) % 10;

                        this.opcode = "0xFX33 -- Stores the binary-coded decimal representation of VX";
                        break;
                    case 0x55:
                        for (var i = 0; i <= x; i++) {
                            this.memory[this.i[0] + i] = this.v[i];
                        }

                        this.opcode = "0xFX55 -- Stores V0 to VX in memory starting at address I.";
                        break;
                    case 0x65:
                        for (var i = 0; i <= x; i++) {
                            this.v[i] = this.memory[this.i[0] + i];
                        }

                        this.opcode = "0xFX65 -- Fills V0 to VX (including VX) with values from memory starting at address I.";
                        break;
                }
                break;
        }

        
    },
    startGame(game) {
        this.loadProgram(game).then(() => {
            UI.setKeys();
            this.running = true;
        });

    }
};

var chip8Factory = (copy) => {
    if (copy) {
        var chip8 = clone(copy);
    } else {
        var chip8 =  {
            screen: Array(64 * 32).fill(0),
            memory: new Uint8Array(new ArrayBuffer(4096)),
            v: new Uint8Array(16),
            i: new Uint16Array(1),
            pc: new Uint16Array(1),
            stack: new Uint16Array(16),
            sp: new Uint16Array(1),
            dt: new Uint8Array(1),
            st: new Uint8Array(1),
            drawFlag: false,
            fontSet: [
                0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
                0x20, 0x60, 0x20, 0x20, 0x70, // 1
                0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
                0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
                0x90, 0x90, 0xF0, 0x10, 0x10, // 4
                0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
                0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
                0xF0, 0x10, 0x20, 0x40, 0x40, // 7
                0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
                0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
                0xF0, 0x90, 0xF0, 0x90, 0x90, // A
                0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
                0xF0, 0x80, 0x80, 0x80, 0xF0, // C
                0xE0, 0x90, 0x90, 0x90, 0xE0, // D
                0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
                0xF0, 0x80, 0xF0, 0x80, 0x80  // F
            ],
            keys: {
                key1: 0,
                key2: 0,
                key3: 0,
                key4: 0,
                key5: 0,
                key6: 0,
                key7: 0,
                key8: 0,
                key9: 0,
                keya: 0,
                keyb: 0,
                keyc: 0,
                keyd: 0,
                keye: 0,
                keyf: 0
            },
            speed: 10,
            running: false,
            opcode: 'Beginning of Stack -- No Opcode called'
        };
    }
    Object.setPrototypeOf(chip8.keys, keysProto);
    Object.setPrototypeOf(chip8, chip8Proto);
    return chip8;
};

var keysProto = {
    setKey(key, val) {
        switch(key) {
            case '1':
                this['key1'] = val;
            break;

            case '2':
                this['key2'] = val;
            break;

            case '3':
                this['key3'] = val;
            break;

            case '4':
                this['keyc'] = val;
            break;

            case 'q':
                this['key4'] = val;
            break;

            case 'w':
                this['key5'] = val;
            break;

            case 'e':
                this['key6'] = val;
            break;

            case 'r':
                this['keyd'] = val;
            break;

            case 'a':
                this['key7'] = val;
            break;

            case 's':
                this['key8'] = val;
            break;

            case 'd':
                this['key9'] = val;
            break;

            case 'f':
                this['keye'] = val;
            break;

            case 'z':
                this['keya'] = val;
            break;

            case 'x':
                this['key0'] = val;
            break;

            case 'c':
                this['keyb'] = val;
            break;

            case 'v':
                this['keyf'] = val;
            break;
        }
    }
};

var UI = {
    start: false,
    jump: false,
    debugCounter: 0,
    init() {
        document.querySelector('.js-loadGame').addEventListener('click', e => {
            var game = document.querySelector('.js-game').value;

            cancelAnimationFrame(welcome.welcomeAnimation);
            if (Gameloop.webAnimationFrame) {
                cancelAnimationFrame(Gameloop.webAnimationFrame);
            }
            
            Gameloop.setUpdate(update).setRender(render).init(() => {
                stack.reset();
                render();
                this.drawStack(true);
                this.drawCPUInfo();
                this.start = true;
                e.target.innerHTML = "Reset";
                stack.stack.startGame(game);
            });
        });

        document.querySelector('.js-game').addEventListener('change', e => {
            document.querySelector('.js-loadGame').innerHTML = "Start";
        });

        document.querySelector('.js-stackControls').addEventListener('click', e  => {
            if (e.target.classList.contains('js-pause')) {
                this.stackControl('pause');
            };

            if (e.target.classList.contains('js-play')) {
                this.stackControl('play');
            };

            if (e.target.classList.contains('js-step')) {
                this.stackControl('step');
            };
            
        });

        document.querySelector('.js-stack').addEventListener('mouseover', e => {
            var hovered = e.target;

            Array.from(document.querySelector('.js-stack').children).forEach((node, index) => {
                if (node.isSameNode(hovered)) {
                    this.jump = true;

                    this.drawCPUInfo(stack.theStack[index]);
                    render(true, stack.theStack[index]);
                }
            });
        });

        document.querySelector('.js-stack').addEventListener('click', e => {
            var clicked = e.target;

            Array.from(document.querySelector('.js-stack').children).forEach((node, index) => {
                if (node.isSameNode(clicked)) {
                    this.jump = true;
                    this.start = false;
                    stack.jumpTo(index);
                    
                    this.drawCPUInfo(stack.theStack[index]);
                    this.drawStack(true);
                    render();
                }
            });
            
        });
    },
    stackControl(event) {
        switch (event) {
            case 'pause':
                this.start = false;
                this.drawStack();
                this.drawCPUInfo();
            break;
            case 'play':
                this.start = true;
            break;
            case 'step':
                stack.stack = chip8Factory(stack.stack);
                stack.stack.emulateCycle();
                this.drawStack();
                this.drawCPUInfo();
                render();
            break;
        }
    },
    setKeys() {
        document.addEventListener('keydown', e => {
            this.keyDown(e.key);
        });
    
        document.addEventListener('keyup', e => {
            this.keyUp(e.key);
        });
    
        document.querySelector('.js-keyboard').addEventListener('touchstart', e => {
            this.keyDown(e.target.innerHTML.toString().toLowerCase());
            e.preventDefault();
        });
    
        document.querySelector('.js-keyboard').addEventListener('mousedown', e => {
            this.keyDown(e.target.innerHTML.toString().toLowerCase());
        });
    
        document.querySelector('.js-keyboard').addEventListener('touchend', e => {
            this.keyUp(e.target.innerHTML.toString().toLowerCase());
            e.preventDefault();
        });
    
        document.querySelector('.js-keyboard').addEventListener('mouseup', e => {
            this.keyUp(e.target.innerHTML.toString().toLowerCase());
        });
    },
    removeKeys() {
        document.removeEventListener('keydown', this.keyDown);
        document.removeEventListener('keyup', this.keyUp);
    },
    keyDown(key) {
        stack.stack.keys.setKey(key, 1);
    },
    keyUp(key) {
        stack.stack.keys.setKey(key, 0);
    },
    drawStack() {
        var stackElem = document.querySelector('.js-stack');
        var listItems = '';

        stack.theStack.forEach(step => {
            var li = `<li class="StackList-item">${step.opcode}</li> `;
            listItems += li;
        });

        stackElem.innerHTML = listItems;
    },
    drawCPUInfo(state) {
        if (!state) state = stack.stack;
        
        state.v.forEach((v, index) => {
            document.querySelector(`.js-v${index}`).innerHTML = `0x${v.toString(16).padStart(2, 0)}`
        });

        document.querySelector('.js-i').innerHTML = `0x${state.i.toString(16).padStart(4, 0)}`;
        document.querySelector('.js-pc').innerHTML = `0x${state.pc.toString(16).padStart(4, 0)}`;
        document.querySelector('.js-sp').innerHTML = `0x${state.sp.toString(16).padStart(2, 0)}`;
        document.querySelector('.js-dt').innerHTML = `0x${state.dt.toString(16).padStart(2, 0)}`;
        document.querySelector('.js-st').innerHTML = `0x${state.st.toString(16).padStart(2, 0)}`;
    }
};

var update = (time) => {
    var speed = Number(document.querySelector('#speed').value);
    stack.stack.speed = speed;

    for (var i = 0; i < stack.stack.speed; i++) {
        if (stack.stack.running && UI.start) {
            stack.stack = chip8Factory(stack.stack);
            stack.stack.emulateCycle();
        }

    }

    if (stack.stack.running) {
        if (stack.stack.dt[0]) {
            stack.stack.dt[0]--;
        }

        document.querySelector('.js-fps').innerHTML = `FPS: ${Gameloop.currentFPS}`;
    }

};

var render = (time, state) => {
    
    if (!state) state = stack.stack;

    if (state.drawFlag || UI.jump) {

        const canvas = document.getElementById('chip8Screen');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / 64;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        for (const [index, pixel] of  state.screen.entries()) {
            var y = Math.floor(index / 64);
            var x = index - (y * 64);
            var pixelWidth = 1;
            var pixelHeight = 1;


            if (pixel == 1) {
                ctx.fillStyle = '#de8317';
                ctx.fillRect(x * ratio, y * ratio, pixelWidth * ratio, pixelHeight * ratio);
            }
        }

        state.drawFlag = false;
        UI.jump = false;
    }

    if (UI.start) {
        UI.debugCounter++;
        if (UI.debugCounter == 8) {
            UI.drawStack();
            UI.drawCPUInfo();

            UI.debugCounter = 0;
        }
    }
    
};

var welcome = {
    init() {
        this.animation();
        UI.init();
    },
    welcomeAnimation: null,
    animation(timestamp) {
        const canvas = document.getElementById('chip8Screen');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#de8317';
        ctx.font = "28px VT323, monospace";

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Math.floor(timestamp / 1000) % 2) {
            ctx.fillStyle = '#de8317';
            ctx.fillRect(10, 240, 15, 25);
        }

        ctx.fillText('This is a Chip-8 interpreter written in JavaScript.', 10, 20);
        ctx.fillText('Pick a ROM and hit \'Start\'.', 10, 60);
        ctx.fillText('Hit buttons (touch or keys) to figure out the controls.', 10, 100);
        ctx.fillText('Game speed can be adjusted with the slider.', 10, 140);
        ctx.fillText('Debugger can be use pause or step to the next call.', 10, 180);
        ctx.fillText('You can go back in time (Desktop) with the Stack Trace.', 10, 220);

        this.welcomeAnimation = requestAnimationFrame(this.animation.bind(this));
    },
    startGame(game) {
        Gameloop.setUpdate(update).setRender(render).init(function () {
            stack.reset();
            stack.stack.startGame(game);
        });
    }
};

var clone = (obj) => {
    var copy;

    if (obj == null || typeof obj != "object") return obj;

    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    if (obj instanceof Uint8Array) {
        var copy = new Uint8Array(obj.length);
        copy.set(obj, 0);
        return copy;
    }

    if (obj instanceof Uint16Array) {
        var copy = new Uint16Array(obj.length);
        copy.set(obj, 0);
        return copy;
    }
    
    if (obj instanceof Object) {
        var copy = {};

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = clone(obj[key]);
            }
        }
        return copy;
    }
};

welcome.init();