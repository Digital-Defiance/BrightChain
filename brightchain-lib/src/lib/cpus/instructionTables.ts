import { CpuInstructions } from '../enumerations/cpuInstructions';
import { CpuRegisters } from '../enumerations/cpuRegisters';
import * as instructions from './instructions';
import { X86Cpu } from './x86Cpu';

export function buildInstructionMapForCpu(
  cpu: X86Cpu,
): Map<number, () => void> {
  return new Map<number, () => void>([
    [CpuInstructions.fn0x0f, instructions.invokeFn0x0f(cpu)],
    [CpuInstructions.movImm8RegEAX, instructions.mov(cpu, CpuRegisters.EAX)],
    [CpuInstructions.movImm8RegECX, instructions.mov(cpu, CpuRegisters.ECX)],
    [CpuInstructions.movImm8RegEDX, instructions.mov(cpu, CpuRegisters.EDX)],
    [CpuInstructions.movImm8RegEBX, instructions.mov(cpu, CpuRegisters.EBX)],
    [CpuInstructions.movImm8RegESP, instructions.mov(cpu, CpuRegisters.ESP)],
    [CpuInstructions.decEAX, instructions.dec(cpu, CpuRegisters.EAX)],
    [CpuInstructions.decECX, instructions.dec(cpu, CpuRegisters.ECX)],
    [CpuInstructions.decEDX, instructions.dec(cpu, CpuRegisters.EDX)],
    [CpuInstructions.decEBX, instructions.dec(cpu, CpuRegisters.EBX)],
    [CpuInstructions.decESP, instructions.dec(cpu, CpuRegisters.ESP)],
    [CpuInstructions.decEBP, instructions.dec(cpu, CpuRegisters.EBP)],
    [CpuInstructions.decESI, instructions.dec(cpu, CpuRegisters.ESI)],
    [CpuInstructions.decEDI, instructions.dec(cpu, CpuRegisters.EDI)],
    [CpuInstructions.pushEAX, instructions.pushr(cpu, CpuRegisters.EAX)],
    [CpuInstructions.pushECX, instructions.pushr(cpu, CpuRegisters.ECX)],
    [CpuInstructions.pushEDX, instructions.pushr(cpu, CpuRegisters.EDX)],
    [CpuInstructions.pushEBX, instructions.pushr(cpu, CpuRegisters.EBX)],
    [CpuInstructions.pushESP, instructions.pushr(cpu, CpuRegisters.ESP)],
    [CpuInstructions.pushEBP, instructions.pushr(cpu, CpuRegisters.EBP)],
    [CpuInstructions.pushESI, instructions.pushr(cpu, CpuRegisters.ESI)],
    [CpuInstructions.pushEDI, instructions.pushr(cpu, CpuRegisters.EDI)],
    [CpuInstructions.popEAX, instructions.popr(cpu, CpuRegisters.EAX)],
    [CpuInstructions.popECX, instructions.popr(cpu, CpuRegisters.ECX)],
    [CpuInstructions.popEDX, instructions.popr(cpu, CpuRegisters.EDX)],
    [CpuInstructions.popEBX, instructions.popr(cpu, CpuRegisters.EBX)],
    [CpuInstructions.popESP, instructions.popr(cpu, CpuRegisters.ESP)],
    [CpuInstructions.popEBP, instructions.popr(cpu, CpuRegisters.EBP)],
    [CpuInstructions.popESI, instructions.popr(cpu, CpuRegisters.ESI)],
    [CpuInstructions.popEDI, instructions.popr(cpu, CpuRegisters.EDI)],
    [CpuInstructions.pushImm8, instructions.pushi(cpu)],
    [CpuInstructions.movRegReg, instructions.movRegReg(cpu)],
    [CpuInstructions.yam, instructions.yam(cpu)],
    [CpuInstructions.ret, instructions.ret(cpu)],
    [CpuInstructions.movl, instructions.movl(cpu)],
    [CpuInstructions.lea, instructions.lea(cpu)],
    [CpuInstructions.addReg, instructions.addReg(cpu)],
    [CpuInstructions.addRegPad, instructions.addRegPad(cpu)],
    [CpuInstructions.addEAX, instructions.addEAX(cpu)],
    [CpuInstructions.subRAX, instructions.subRAX(cpu)],
    [CpuInstructions.jge, instructions.jge(cpu)],
    [CpuInstructions.x81, instructions.invokeX81(cpu)],
    [CpuInstructions.x83, instructions.invokeX83(cpu)],
    [CpuInstructions.int, instructions.int(cpu)],
    [CpuInstructions.call, instructions.call(cpu)],
    [CpuInstructions.jmpImm8, instructions.jmpImm8(cpu)],
  ]);
}

export function buildInstructionArray(cpu: X86Cpu): Array<() => void> {
  const instructionList = buildInstructionMapForCpu(cpu);
  const instructionArray = new Array<() => void>(0xff);
  for (let i = 0; i < instructionArray.length; i++) {
    instructionArray[i] = instructions.noOp();
  }
  instructionList.forEach((value, key) => {
    instructionArray[key] = value;
  });
  return instructionArray;
}

export function X83Instructions(
  cpu: X86Cpu,
): Map<number, (reg: number, op2: number) => void> {
  return new Map<number, (reg: number, op2: number) => void>([
    // add
    [0x00, instructions.x83Add(cpu)],

    // sub
    [0x05, instructions.x83Sub(cpu)],

    // cmp
    [0x07, instructions.x83Cmp(cpu)],
  ]);
}

export function fn0x81Instructions(
  cpu: X86Cpu,
): Map<number, (reg: number, value?: number) => void> {
  return new Map<number, (reg: number, value?: number) => void>([
    // sub
    [0x05, instructions.invokeX81_05Sub(cpu)],

    // cmpl
    [0x07, instructions.invokeX81_07Cmp(cpu)],
  ]);
}

export function syscallInstructions(cpu: X86Cpu): Map<number, () => void> {
  return new Map<number, () => void>([
    [0x1, instructions.sysCallExit(cpu)],
    [0x80, instructions.sysCallInterrupt(cpu)],
  ]);
}

// Prefix 0x0F
export function fn0x0fInstructions(cpu: X86Cpu): Map<number, () => void> {
  return new Map<number, () => void>([
    // jge
    [0x8d, instructions.fn0x0f8dJge(cpu)],

    // jle short jump
    [0x8e, instructions.fn0x0f8eJle(cpu)],

    // imul
    [0xaf, instructions.fn0x0fAfImul(cpu)],

    // noop
    [0x1f, instructions.noOp()],
  ]);
}

export function getSysCallInstruction(cpu: X86Cpu, opcode: number): () => void {
  const instruction = cpu.Syscalls.get(opcode);
  if (instruction === undefined) {
    throw new Error('Invalid opcode');
  }
  return instruction;
}

export function getInterruptInstruction(
  cpu: X86Cpu,
  opcode: number,
): () => void {
  const instruction = cpu.Interrupts.get(opcode);
  if (instruction === undefined) {
    throw new Error('Invalid opcode');
  }
  return instruction;
}

export function getFn0x0fInstruction(cpu: X86Cpu, opcode: number): () => void {
  const instruction = fn0x0fInstructions(cpu).get(opcode);
  if (instruction === undefined) {
    throw new Error('Invalid opcode');
  }
  return instruction;
}

export function getFn0x81Instruction(
  cpu: X86Cpu,
  opcode: number,
): (reg: number, value?: number) => void {
  const instruction = fn0x81Instructions(cpu).get(opcode);
  if (instruction === undefined) {
    throw new Error('Invalid opcode');
  }
  return instruction;
}

export function getX83Instruction(
  cpu: X86Cpu,
  opcode: number,
): (reg: number, op2: number) => void {
  const instruction = X83Instructions(cpu).get(opcode);
  if (instruction === undefined) {
    throw new Error('Invalid opcode');
  }
  return instruction;
}
