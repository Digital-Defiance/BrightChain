// https://gist.githubusercontent.com/tadeuzagallo/3853299f033bf9b746e4/raw/43467ba1bee7251e1b653123f29e6ff5643a0735/x86.js
// https://gist.github.com/tadeuzagallo/3853299f033bf9b746e4
'use strict';
import { CpuRegisters } from '../enumerations/cpuRegisters';
import {
  buildInstructionArray,
  syscallInstructions,
} from './instructionTables';

export class X86Cpu {
  public NG = false;
  public NZ = false;

  public static readonly StackSize = 1024;
  public static readonly RegisterCount = 8;

  public readonly Interrupts: Map<number, () => void> = new Map<
    number,
    () => void
  >();
  public readonly Program: Uint8Array;
  public readonly Registers: Uint32Array;
  public PC: number;
  public Instructions: Array<() => void>;
  public Syscalls: Map<number, () => void>;

  constructor(
    memory: ArrayBuffer | Uint8Array | number,
    registers: number | Uint32Array,
    pc: number,
  ) {
    if (memory instanceof Uint8Array) {
      this.Program = memory;
    } else if (memory instanceof ArrayBuffer) {
      this.Program = new Uint8Array(memory);
    } else {
      this.Program = new Uint8Array(memory);
    }
    if (registers instanceof Uint32Array) {
      this.Registers = registers;
    } else {
      this.Registers = new Uint32Array(registers);
    }
    this.PC = pc;
    this.Instructions = buildInstructionArray(this);
    this.Syscalls = syscallInstructions(this);
  }
  public readonly Stack = new Uint32Array(X86Cpu.StackSize);

  public read(size: number) {
    let value;
    switch (size) {
      case 1:
        value = this.Program[this.PC];
        break;
      case 2:
        value = (this.Program[this.PC + 1] << 8) | this.Program[this.PC];
        break;
      case 4:
        value =
          (this.Program[this.PC + 3] << 24) |
          (this.Program[this.PC + 2] << 16) |
          (this.Program[this.PC + 1] << 8) |
          this.Program[this.PC];
        break;
      case -1:
        // http://blog.vjeux.com/2013/javascript/conversion-from-uint8-to-int8-x-24.html
        value = (this.Program[this.PC] << 24) >> 24;
        break;
      default:
        throw new Error('Invalid read size');
    }
    this.PC += Math.abs(size); // & 127; // abs
    return value;
  }

  public pop() {
    return this.Stack[this.Registers[CpuRegisters.ESP]++];
  }

  public push(value: number): void {
    this.Stack[--this.Registers[CpuRegisters.ESP]] = value;
  }

  public static new(
    memory: number | Uint8Array | ArrayBuffer,
    registers: number | Uint32Array,
    pc = -1,
  ): X86Cpu {
    const cpu = new X86Cpu(memory, registers, pc);
    cpu.Registers[CpuRegisters.ESP] = 1023;
    return cpu;
  }

  public run() {
    let op;
    while (this.PC !== -1 && (op = this.read(1))) {
      this.Instructions[op]();
    }
  }

  public static run(
    memory: number | Uint8Array | ArrayBuffer,
    registers: number | Uint32Array,
    pc: number,
  ): X86Cpu {
    const cpu = new X86Cpu(memory, registers, pc);
    cpu.Registers[CpuRegisters.ESP] = 1023;
    let op;
    while (cpu.PC !== -1 && (op = cpu.read(1))) {
      cpu.Instructions[op]();
    }
    return cpu;
  }
}
