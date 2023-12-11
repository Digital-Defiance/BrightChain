import {
  getFn0x0fInstruction,
  getFn0x81Instruction,
  getInterruptInstruction,
  getSysCallInstruction,
  getX83Instruction,
  X83Instructions,
} from './instructionTables';
import CpuRegisters from '../enumerations/cpuRegisters';
import { X86Cpu } from './x86Cpu';

// pop reg
export function popr(cpu: X86Cpu, reg: number) {
  return function () {
    cpu.Registers[reg] = cpu.pop();
  };
}

export function pushi(cpu: X86Cpu) {
  return function () {
    cpu.push(cpu.read(1));
  };
}

export function pushr(cpu: X86Cpu, register: number): () => void {
  return function () {
    cpu.push(cpu.Registers[register]);
  };
}

export function mov(cpu: X86Cpu, register: number): () => void {
  return function () {
    cpu.Registers[register] = cpu.read(4);
  };
}

export function movRegReg(cpu: X86Cpu): () => void {
  return function () {
    const rm = cpu.read(1);
    const r0 = (rm >> 3) & 7;
    const r1 = rm & 7;
    if (!(rm & (1 << 7))) {
      let offset = cpu.read(-1) >> 2;
      if (rm & 4 && offset == 9) {
        offset = 0;
      }
      cpu.Stack[cpu.Registers[r1] + offset] = cpu.Registers[r0];
    } else {
      cpu.Registers[r1] = cpu.Registers[r0];
    }
  };
}

export function movl(cpu: X86Cpu): () => void {
  return function () {
    const op1 = cpu.read(1);
    const reg = op1 & 7;
    let offset = cpu.read(-1) >> 2;
    if (!(op1 & (1 << 6))) {
      offset = 0;
    }
    const sp = cpu.Registers[reg] + offset;
    const value = cpu.read(4);
    cpu.Stack[sp] = value;
  };
}

export function yam(cpu: X86Cpu): () => void {
  return function () {
    const rm = cpu.read(1);
    const r0 = (rm >> 3) & 7;
    const r1 = rm & 7;
    const offset = cpu.read(-1) >> 2;
    cpu.Registers[r0] = cpu.Stack[cpu.Registers[r1] + offset];
  };
}

export function lea(cpu: X86Cpu): () => void {
  return function () {
    const op1 = cpu.read(1);
    const reg0 = (op1 >> 3) & 7;
    const reg1 = op1 & 7;
    let offset = cpu.read(-1);
    if (!(op1 & (1 << 6))) {
      offset = 0;
    }
    cpu.Registers[reg0] = cpu.Registers[reg1] + offset;
  };
}

export function addReg(cpu: X86Cpu): () => void {
  return function () {
    const rm = cpu.read(1) - 0xc0;
    const r0 = rm >> 3;
    const r1 = rm & 7;
    cpu.Registers[r1] += cpu.Registers[r0];
  };
}

export function addRegPad(cpu: X86Cpu): () => void {
  return function () {
    const rm = cpu.read(1);
    const r0 = (rm >> 3) & 7;
    const r1 = rm & 7;
    const offset = cpu.read(-1) >> 2;
    cpu.Registers[r0] += cpu.Stack[cpu.Registers[r1] + offset];
  };
}

export function addEAX(cpu: X86Cpu): () => void {
  return function () {
    cpu.Registers[CpuRegisters.EAX] += cpu.read(4);
  };
}

export function subRAX(cpu: X86Cpu): () => void {
  return function () {
    cpu.Registers[CpuRegisters.EAX] -= cpu.read(4);
  };
}

export function invokeX83(cpu: X86Cpu): () => void {
  return function () {
    const op1 = cpu.read(1);
    const fn = (op1 >> 3) & 7;
    const reg = op1 & 7;
    const op2 = cpu.read(1);
    const fnFunc = getX83Instruction(cpu, fn);
    fnFunc(reg, op2);
  };
}

export function x83Add(cpu: X86Cpu) {
  return function (reg: number, op2: number) {
    cpu.Registers[reg] += op2 >> 2;
  };
}

export function x83Sub(cpu: X86Cpu) {
  return function (reg: number, op2: number) {
    cpu.Registers[reg] -= op2 >> 2;
  };
}

export function x83Cmp(cpu: X86Cpu) {
  return function (reg: number, op2: number) {
    const tmp = cpu.Registers[reg] - op2;
    cpu.NZ = tmp != 0;
    cpu.NG = tmp < 0;
  };
}

export function invokeX81_05Sub(cpu: X86Cpu) {
  return function (reg: number, value?: number) {
    if (value == undefined) {
      throw new Error('value is undefined');
    }
    cpu.Registers[reg] -= cpu.read(4);
  };
}

export function invokeX81_07Cmp(cpu: X86Cpu) {
  return function (reg: number) {
    const offset = cpu.read(-1) >> 2;
    const value = cpu.read(4);
    const tmp = cpu.Stack[cpu.Registers[reg] + offset] - value;
    cpu.NZ = tmp != 0;
    cpu.NG = tmp < 0;
  };
}

export function invokeX81(cpu: X86Cpu) {
  return function () {
    const op1 = cpu.read(1);
    const fn = (op1 >> 3) & 7;
    const reg = op1 & 7;
    const fnFunc = getFn0x81Instruction(cpu, fn);
    fnFunc(reg, op1); // this may not be correct
  };
}

export function fn0x0f8dJge(cpu: X86Cpu): () => void {
  return function () {
    const dist = cpu.read(4);
    if (!cpu.NG) {
      cpu.PC += dist;
    }
  };
}

export function invokeFn0x0f(cpu: X86Cpu): () => void {
  return function () {
    // Call the actual function inside the prefix
    const op = cpu.read(1);
    const fn = getFn0x0fInstruction(cpu, op);
    fn();
  };
}

export function fn0x0f8eJle(cpu: X86Cpu): () => void {
  return function () {
    const dist = cpu.read(4);
    if (cpu.NG || !cpu.NZ) {
      cpu.PC += dist;
    }
  };
}

export function fn0x0fAfImul(cpu: X86Cpu): () => void {
  return function () {
    const rm = cpu.read(1) - 0xc0;
    const r0 = rm >> 3;
    const r1 = rm & 7;
    cpu.Registers[r0] = cpu.Registers[r0] * cpu.Registers[r1];
  };
}

export function noOp(cpu: X86Cpu): () => void {
  return function () {
    // noop
  };
}

export function jmpImm32(cpu: X86Cpu): () => void {
  return function () {
    const dst = cpu.read(4);
    cpu.PC += dst;
  };
}

// jmp imm8
export function jmpImm8(cpu: X86Cpu): () => void {
  return function () {
    const dst = cpu.read(1);
    cpu.PC += dst;
  };
}

export function jge(cpu: X86Cpu): () => void {
  return function () {
    const dist = cpu.read(-1);
    if (!cpu.NG) {
      cpu.PC += dist;
    }
  };
}

// dec
export function dec(cpu: X86Cpu, register: number) {
  return function () {
    cpu.Registers[register]--;
  };
}

export function call(cpu: X86Cpu): () => void {
  return function () {
    const dst = cpu.read(4);
    cpu.push(cpu.PC);
    cpu.PC += dst;
  };
}

export function ret(cpu: X86Cpu): () => void {
  return function () {
    cpu.PC = cpu.pop();
  };
}

export function int(cpu: X86Cpu): () => void {
  return function () {
    const op = cpu.read(1);
    const fn = getInterruptInstruction(cpu, op);
    fn();
  };
}

export function sysCallExit(cpu: X86Cpu): () => void {
  return function () {
    console.log(
      'Program returned %s',
      cpu.Stack[cpu.Registers[CpuRegisters.ESP + 1]]
    );
    cpu.PC = -1;
  };
}

export function sysCallInterrupt(cpu: X86Cpu): () => void {
  return function () {
    const syscallOp = cpu.Registers[CpuRegisters.EAX];
    const syscallFunc = getSysCallInstruction(cpu, syscallOp);
    syscallFunc();
  };
}
