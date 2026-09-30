/**
 * Gamepad & Multi-Input Controller Engine
 * Supports standard HTML5 Gamepad API (Xbox, PlayStation, Generic Bluetooth/USB)
 * with keyboard/mouse and virtual on-screen touch joystick fallback.
 */

export interface InputState {
  // 360-degree analog stick / movement
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  moveMag: number; // 0 to 1
  moveAngle: number; // in radians

  // Action buttons (held state)
  pass: boolean; // Ground pass / Press (✕ Cross)
  shoot: boolean; // Shot / Slide tackle (▢ Square)
  lob: boolean; // Lofted pass / Cross (◯ Circle)
  through: boolean; // Through ball / GK charge (△ Triangle)
  sprint: boolean; // Sprint / Turbo (R2 / R1)
  dash: boolean; // Burst Dash command (R2 / Shift)

  // Modifiers
  chipMod: boolean; // L1: Chip shot, chip through ball, switch player
  finesseMod: boolean; // R1: Finesse curl shot
  knuckleMod: boolean; // L2: Knuckleball shot, jockey defense
  pressCommand: boolean; // R1 / Square / C: Commanded 2nd-man team press

  // Just-pressed triggers (for one-shot actions like player switch or burst dash)
  passPressed: boolean;
  shootPressed: boolean;
  lobPressed: boolean;
  throughPressed: boolean;
  dashPressed: boolean;
  switchPressed: boolean;

  // Gamepad status
  gamepadConnected: boolean;
  gamepadId: string;
}

export class InputEngine {
  private keys: Record<string, boolean> = {};
  private prevKeys: Record<string, boolean> = {};
  private prevGamepadButtons: Record<number, boolean> = {};

  // Virtual touch stick input
  public virtualStick = { x: 0, y: 0 };
  public virtualButtons: Record<string, boolean> = {};
  private prevVirtualButtons: Record<string, boolean> = {};

  public gamepadConnected: boolean = false;
  public gamepadId: string = 'None';

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept inputs inside text fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const code = e.code.toLowerCase();
      this.keys[code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code.toLowerCase();
      this.keys[code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('gamepadconnected', (e: any) => {
      this.gamepadConnected = true;
      this.gamepadId = e.gamepad.id || 'Standard Controller';
      console.log('🎮 Gamepad connected:', this.gamepadId);
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
      this.gamepadId = 'None';
      console.log('🎮 Gamepad disconnected');
    });
  }

  public poll(): InputState {
    let moveX = 0;
    let moveY = 0;

    let pass = false;
    let shoot = false;
    let lob = false;
    let through = false;
    let sprint = false;
    let dash = false;
    let chipMod = false;
    let finesseMod = false;
    let knuckleMod = false;
    let pressCommand = false;
    let switchPlayer = false;

    let passPressed = false;
    let shootPressed = false;
    let lobPressed = false;
    let throughPressed = false;
    let dashPressed = false;
    let switchPressed = false;

    // 1. Check Physical Gamepad API (PlayStation standard layout)
    const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

    if (pad && pad.connected) {
      this.gamepadConnected = true;
      this.gamepadId = pad.id;

      // Left analog stick (360 degrees)
      const rawX = pad.axes[0] || 0;
      const rawY = pad.axes[1] || 0;
      const deadzone = 0.15;
      const mag = Math.sqrt(rawX * rawX + rawY * rawY);

      if (mag > deadzone) {
        const norm = (mag - deadzone) / (1 - deadzone);
        moveX = (rawX / mag) * norm;
        moveY = (rawY / mag) * norm;
      }

      // D-Pad backup
      if (pad.buttons[12]?.pressed) moveY = -1; // Up
      if (pad.buttons[13]?.pressed) moveY = 1; // Down
      if (pad.buttons[14]?.pressed) moveX = -1; // Left
      if (pad.buttons[15]?.pressed) moveX = 1; // Right

      // PLAYSTATION ACTION BUTTONS:
      // Button 0 = ✕ Cross (Short Pass / Standing Tackle / Pressure)
      pass = !!pad.buttons[0]?.pressed;
      // Button 1 = ◯ Circle (Lofted Pass / Cross / Clear)
      lob = !!pad.buttons[1]?.pressed;
      // Button 2 = ▢ Square (Power Strike Shoot / Slide Tackle)
      shoot = !!pad.buttons[2]?.pressed;
      // Button 3 = △ Triangle (Through Ball / Goalkeeper Rush)
      through = !!pad.buttons[3]?.pressed;

      // Bumpers & Triggers
      // Button 4 = L1 (Chip Modifier / Switch Player)
      chipMod = !!pad.buttons[4]?.pressed;
      // Button 5 = R1 (Finesse Curl Modifier / 2nd Defender Press / Secondary Dash)
      finesseMod = !!pad.buttons[5]?.pressed;
      // Button 6 = L2 (Knuckle Shot / Defensive Jockey)
      knuckleMod = (pad.buttons[6]?.value || 0) > 0.3 || !!pad.buttons[6]?.pressed;
      // Button 7 = R2 (Sprint / Explosive Dash)
      sprint = (pad.buttons[7]?.value || 0) > 0.3 || !!pad.buttons[7]?.pressed || finesseMod;
      dash = (pad.buttons[7]?.value || 0) > 0.3 || !!pad.buttons[7]?.pressed || finesseMod;

      // Commanded 2nd Man Press (R1 or Square on defense)
      pressCommand = finesseMod || (!pass && !!pad.buttons[2]?.pressed);

      // One-shot edge detection
      if (pass && !this.prevGamepadButtons[0]) passPressed = true;
      if (lob && !this.prevGamepadButtons[1]) lobPressed = true;
      if (shoot && !this.prevGamepadButtons[2]) shootPressed = true;
      if (through && !this.prevGamepadButtons[3]) throughPressed = true;
      if (dash && !(this.prevGamepadButtons[7] || this.prevGamepadButtons[5])) dashPressed = true;
      if (chipMod && !this.prevGamepadButtons[4]) switchPressed = true;

      // Store button states for edge detection
      for (let i = 0; i < 8; i++) {
        this.prevGamepadButtons[i] = !!pad.buttons[i]?.pressed;
      }
    }

    // 2. Keyboard fallback / overlay (PlayStation equivalents)
    // Movement: WASD or Arrow Keys
    let keyX = 0;
    let keyY = 0;
    if (this.keys['keyw'] || this.keys['arrowup']) keyY -= 1;
    if (this.keys['keys'] || this.keys['arrowdown']) keyY += 1;
    if (this.keys['keya'] || this.keys['arrowleft']) keyX -= 1;
    if (this.keys['keyd'] || this.keys['arrowright']) keyX += 1;

    if (keyX !== 0 || keyY !== 0) {
      const len = Math.sqrt(keyX * keyX + keyY * keyY);
      moveX = keyX / len;
      moveY = keyY / len;
    }

    // Keyboard action keys:
    // ✕ Pass / Press: 'J', 'Space', or 'X'
    if (this.keys['keyj'] || this.keys['space'] || this.keys['keyx']) pass = true;
    // ▢ Shoot / Slide: 'K', 'V', or Gamepad Square
    if (this.keys['keyk'] || this.keys['keyv']) shoot = true;
    // ◯ Lofted Pass / Cross: 'I', 'C' (Circle), or 'L'
    if (this.keys['keyi'] || this.keys['keyc'] || this.keys['keyl']) lob = true;
    // △ Through Ball: 'O', 'U', or 'T' (Triangle)
    if (this.keys['keyo'] || this.keys['keyu'] || this.keys['keyt']) through = true;
    // R2 Dash / Sprint: 'Shift' (Left/Right) or 'E'
    if (this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['shift'] || this.keys['keye']) {
      sprint = true;
      dash = true;
    }

    // Modifiers:
    // L1 Chip / Switch: 'Q' or 'Tab'
    if (this.keys['keyq'] || this.keys['tab']) {
      chipMod = true;
      switchPlayer = true;
    }
    // R1 Finesse Curl / Press: 'F' or 'C'
    if (this.keys['keyf'] || this.keys['keyc']) {
      finesseMod = true;
      pressCommand = true;
    }
    // L2 Knuckle: 'R' or 'keyr'
    if (this.keys['keyr']) knuckleMod = true;

    // Edge triggers for keyboard
    if (pass && !(this.prevKeys['keyj'] || this.prevKeys['space'] || this.prevKeys['keyx'])) passPressed = true;
    if (shoot && !(this.prevKeys['keyk'] || this.prevKeys['keyv'])) shootPressed = true;
    if (lob && !(this.prevKeys['keyi'] || this.prevKeys['keyc'] || this.prevKeys['keyl'])) lobPressed = true;
    if (through && !(this.prevKeys['keyo'] || this.prevKeys['keyu'] || this.prevKeys['keyt'])) throughPressed = true;
    if (dash && !(this.prevKeys['shiftleft'] || this.prevKeys['shiftright'] || this.prevKeys['shift'] || this.prevKeys['keye'])) dashPressed = true;
    if (switchPlayer && !(this.prevKeys['keyq'] || this.prevKeys['tab'])) switchPressed = true;

    // 3. Virtual On-Screen Joystick / Touch buttons
    if (this.virtualStick.x !== 0 || this.virtualStick.y !== 0) {
      moveX = this.virtualStick.x;
      moveY = this.virtualStick.y;
    }
    if (this.virtualButtons['pass']) {
      pass = true;
      if (!this.prevVirtualButtons['pass']) passPressed = true;
    }
    if (this.virtualButtons['shoot']) {
      shoot = true;
      if (!this.prevVirtualButtons['shoot']) shootPressed = true;
    }
    if (this.virtualButtons['lob']) {
      lob = true;
      if (!this.prevVirtualButtons['lob']) lobPressed = true;
    }
    if (this.virtualButtons['through']) {
      through = true;
      if (!this.prevVirtualButtons['through']) throughPressed = true;
    }
    if (this.virtualButtons['sprint'] || this.virtualButtons['dash']) {
      sprint = true;
      dash = true;
      if (!this.prevVirtualButtons['sprint'] && !this.prevVirtualButtons['dash']) dashPressed = true;
    }
    if (this.virtualButtons['chip']) chipMod = true;
    if (this.virtualButtons['finesse']) {
      finesseMod = true;
      pressCommand = true;
    }
    if (this.virtualButtons['press']) {
      pressCommand = true;
    }
    if (this.virtualButtons['knuckle']) knuckleMod = true;
    if (this.virtualButtons['switch']) {
      switchPressed = true;
    }

    // Save previous keys & virtual button states
    this.prevKeys = { ...this.keys };
    this.prevVirtualButtons = { ...this.virtualButtons };

    const moveMag = Math.min(1, Math.sqrt(moveX * moveX + moveY * moveY));
    const moveAngle = Math.atan2(moveY, moveX);

    return {
      moveX,
      moveY,
      moveMag,
      moveAngle,
      pass,
      shoot,
      lob,
      through,
      sprint,
      dash,
      chipMod,
      finesseMod,
      knuckleMod,
      pressCommand,
      passPressed,
      shootPressed,
      lobPressed,
      throughPressed,
      dashPressed,
      switchPressed,
      gamepadConnected: this.gamepadConnected,
      gamepadId: this.gamepadId,
    };
  }
}

export const input = new InputEngine();
