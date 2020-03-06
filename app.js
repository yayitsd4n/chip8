import { Gameloop } from './gameloop.js';

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

var stack = {
    theStack: [],
    get stack() {
        return this.theStack[this.theStack.length - 1];
    },
    set stack(state) {
        this.theStack.push(state);

        if (this.theStack.length >= 20) {
            this.theStack.shift();
        }
    },
    reset() {
        this.theStack = [];
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
        var subInstruction = opcode & 0x000F;
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
                        break;

                    case 0x00EE:
                        this.pc[0] = this.stack[--this.sp[0]];
                        break;
                }
                break;

            case 0x1000:
                this.pc[0] = nnn;
                break;

            case 0x2000:
                this.stack[this.sp] = this.pc[0];
                this.sp[0]++;
                this.pc[0] = nnn;
                break;

            case 0x3000:
                if (this.v[x] == kk) {
                    this.pc[0] += 2;
                }
                break;

            case 0x4000:
                if (this.v[x] != kk) {
                    this.pc[0] += 2;
                }
                break;

            case 0x5000:
                if (this.v[x] == this.v[y]) {
                    this.pc[0] += 2;
                }
                break;

            case 0x6000:
                this.v[x] = kk;
                break;

            case 0x7000:
                this.v[x] += kk;
                break;

            case 0x8000:
                switch (subInstruction) {
                    case 0x0:
                        this.v[x] = this.v[y];

                        break;
                    case 0x1:
                        this.v[x] |= this.v[y];

                        break;
                    case 0x2:
                        this.v[x] &= this.v[y];

                        break;
                    case 0x3:
                        this.v[x] ^= this.v[y];

                        break;
                    case 0x4:
                        var added = this.v[x] + this.v[y];

                        if (added > 225) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }

                        this.v[x] = added & 0xFF;

                        break;
                    case 0x5:
                        if (this.v[x] > this.v[y]) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }
                        this.v[x] -= this.v[y];
                        break;
                    case 0x6:
                        if (this.v[x] & 0x1) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }
                        this.v[x] /= 2;

                        break;
                    case 0x7:
                        if (this.v[y] > this.v[x]) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;
                        }

                        this.v[x] = this.v[y] - this.v[x];
                        break;
                    case 0xe:
                        if (this.v[x] & 0x80) {
                            this.v[15] = 1;
                        } else {
                            this.v[15] = 0;

                        }
                        this.v[x] *= 2;

                        break;
                }
                break;

            case 0x9000:
                if (this.v[x] != this.v[y]) {
                    this.pc[0] += 2;
                }
                break;

            case 0xA000:
                this.i[0] = nnn;
                break;

            case 0xB000:
                this.pc[0] = nnn + this.v[0];
                break;

            case 0xC000:
                this.v[x] = Math.floor(Math.random() * 225) & kk;

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
                break;

            case 0xE000:
                switch (opcode & 0x00FF) {
                    case 0x9E:
                        var key = `key` + this.v[x].toString(16);
                        if (this.keys[key]) {
                            this.pc[0] += 2;
                        }
                        break;
                    case 0xA1:
                        var key = `key` + this.v[x].toString(16);
                        if (!this.keys[key]) {
                            this.pc[0] += 2;
                        }
                        break;
                }
                break;

            case 0xF000:
                switch (opcode & 0x00FF) {
                    case 0x07:
                        this.v[x] = this.dt[0];
                        break;
                    case 0x0A:
                        this.running = false;
                        removeKeys();

                        var pause = (key) => {
                             if (`key${key}` in this.keys) {
                                document.removeEventListener('keypress', pause);
                                this.v[x] = this.keys[key];
                                setKeys();
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
                        return;

                    case 0x15:
                        this.dt[0] = this.v[x];
                        break;
                    case 0x18:
                        this.st[0] = this.v[x];
                        break;
                    case 0x1E:
                        this.i[0] += this.v[x];
                        break;
                    case 0x29:
                        this.i[0] = this.v[x] * 5;
                        break;
                    case 0x33:
                        this.memory[this.i[0]] = this.v[x] / 100;
                        this.memory[this.i[0] + 1] = (this.v[x] / 10) % 10;
                        this.memory[this.i[0] + 2] = (this.v[x] % 100) % 10;
                        break;
                    case 0x55:
                        for (var i = 0; i <= x; i++) {
                            this.memory[this.i[0] + i] = this.v[i];
                        }
                        break;
                    case 0x65:
                        for (var i = 0; i <= x; i++) {
                            this.v[i] = this.memory[this.i[0] + i];
                        }
                        break;
                }
                break;
        }
    }
};

var keysProto = {
    setKey(key, val) {
        switch(key) {
            case 1:
                this['key1'] = val;
            break;

            case 2:
                this['key2'] = val;
            break;

            case 3:
                this['key3'] = val;
            break;

            case 4:
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
            running: false
        };
    }
    Object.setPrototypeOf(chip8.keys, keysProto);
    Object.setPrototypeOf(chip8, chip8Proto);
    return chip8;
};

var update = (time) => {
    var speed = Number(document.querySelector('#speed').value);
    stack.stack.speed = speed;

    for (var i = 0; i < stack.stack.speed; i++) {
        if (stack.stack.running) {
            stack.stack = chip8Factory(stack.stack);
            stack.stack.emulateCycle();
        }
    }

    if (stack.stack.running) {
        if (stack.stack.dt[0]) {
            stack.stack.dt[0]--;
        }
    }

    document.querySelector('.js-fps').innerHTML = `FPS: ${Gameloop.currentFPS}`;
};

var render = (time, state) => {
    if (! state) {
        state = stack.stack;
    }

    if (! state.drawFlag) return;

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
};

var keyDown = function(key) {
    stack.stack.keys.setKey(key, 1);
};

var keyUp = function(key) {
    stack.stack.keys.setKey(key, 0);
};

var removeKeys = () => {
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('keyup', keyUp);
};

var setKeys = () => {
    document.addEventListener('keydown', e => {
        keyDown(e.key);
    });

    document.addEventListener('keyup', e => {
        keyUp(e.key);
    });

    document.querySelector('.js-keyboard').addEventListener('touchstart', e => {
        keyDown(e.target.innerHTML.toString().toLowerCase());
        e.preventDefault();
    });

    document.querySelector('.js-keyboard').addEventListener('mousedown', e => {
        keyDown(e.target.innerHTML.toString().toLowerCase());
    });

    document.querySelector('.js-keyboard').addEventListener('touchend', e => {
        keyUp(e.target.innerHTML.toString().toLowerCase());
        e.preventDefault();
    });

    document.querySelector('.js-keyboard').addEventListener('mouseup', e => {
        keyUp(e.target.innerHTML.toString().toLowerCase());
    });
};

var welcome = {
    init() {
        this.animation();
        document.querySelector('.js-loadGame').addEventListener('click', e => {
            var game = document.querySelector('.js-game').value;

            cancelAnimationFrame(this.welcomeAnimation);
            if (Gameloop.webAnimationFrame) {
                cancelAnimationFrame(Gameloop.webAnimationFrame);
            }
            this.startGame(game);
        });
    },
    welcomeAnimation: null,
    animation(timestamp) {
        const canvas = document.getElementById('chip8Screen');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#de8317';
        ctx.font = "28px VT323, monospace";

        if (Math.floor(timestamp / 1000) % 2) {
            ctx.fillStyle = '#de8317';
            ctx.fillRect(20, 120, 15, 30);
        } else {
            ctx.clearRect(20, 120, 15, 30);
        }

        
        if (!timestamp) {
            ctx.fillText('This is a Chip-8 interperter written in JavaScript.', 20, 20);
            ctx.fillText('Pick a ROM and hit \'Start\'.', 20, 60);
            ctx.fillText('Game speed can be adjusted with the slider.', 20, 100);
        }
        
        
        this.welcomeAnimation = requestAnimationFrame(this.animation.bind(this));
    },
    startGame(game) {
        Gameloop.setUpdate(update).setRender(render).init(function () {
            stack.reset();
            stack.stack = chip8Factory(stack.stack);
            stack.stack.loadProgram(game).then(() => {
                setKeys();
                stack.stack.running = true;
            });
        });
    }
};

welcome.init();