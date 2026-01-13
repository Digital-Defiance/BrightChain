// https://gist.githubusercontent.com/tadeuzagallo/3853299f033bf9b746e4/raw/43467ba1bee7251e1b653123f29e6ff5643a0735/mach-o.js
// https://gist.github.com/tadeuzagallo/3853299f033bf9b746e4
'use strict';

import { CpuRegisters } from '../enumerations/cpuRegisters';
import { X86Cpu } from './x86Cpu';

const LC_SEGMENT = 0x00000001;
const LC_UNIXTHREAD = 0x00000005;

export function loadBinary(file: Blob) {
  const reader = new FileReader();
  reader.addEventListener('loadend', function () {
    if (typeof reader.result == 'string' || reader.result == null) {
      throw new Error('Invalid Mach-O file');
    } else {
      readBinary(new Uint8Array(reader.result as ArrayBuffer));
    }
  });
  reader.readAsArrayBuffer(file);
}

export function readBinary(buffer: Uint8Array): X86Cpu {
  const header = buffer.subarray(0, 7);
  if (header[0] !== 0xfeedface) {
    throw new Error('Invalid Mach magic');
  }
  const cpu = X86Cpu.new(1048576, 8);
  // var cpuType = header[1];
  // var cpuSubtype = header[2];
  // var fileType = header[3];
  const numCommands = header[4];
  // var commandsSize = header[5];
  // var flags = header[6];
  let currentCommandStart = 7;
  for (let i = 0; i < numCommands; i++) {
    const commandSize = buffer[currentCommandStart + 1];
    const commandEnd = currentCommandStart + commandSize / 4;
    const commandBuffer = buffer.subarray(currentCommandStart, commandEnd);

    handleCommand(cpu, buffer, commandBuffer);

    currentCommandStart = commandEnd;
  }

  if (cpu.PC !== -1) {
    cpu.run();
    return cpu;
  }
  cpu.PC = -1;
  throw new Error('Invalid Mach-O file');
}

export function handleCommand(
  cpu: X86Cpu,
  buffer: Uint8Array,
  commandBuffer: Uint8Array,
) {
  const command = commandBuffer[0];
  switch (command) {
    case LC_SEGMENT:
      handleSegmentCommand(cpu, buffer, commandBuffer);
      break;
    case LC_UNIXTHREAD:
      handleUnixThreadCommand(cpu, buffer, commandBuffer);
      break;
    default:
    // Unhandled command
  }
}

export function handleSegmentCommand(
  cpu: X86Cpu,
  buffer: Uint8Array,
  commandBuffer: Uint8Array,
) {
  const vmAddress = commandBuffer[6] >> 2;
  const vmSize = commandBuffer[7] >> 2;
  const fileOffset = commandBuffer[8] >> 2;
  const fileSize = commandBuffer[9] >> 2;
  const fileEnd = fileOffset + fileSize;

  const view = new Uint32Array(cpu.Program);

  for (let i = 0; i < vmSize; i++) {
    if (fileOffset + i >= fileEnd) {
      break;
    }
    view[vmAddress + i] = buffer[fileOffset + i];
  }
}

export function handleUnixThreadCommand(
  cpu: X86Cpu,
  buffer: Uint8Array,
  commandBuffer: Uint8Array,
) {
  const offset = 4;
  cpu.Registers[CpuRegisters.EAX] = commandBuffer[offset]; // eax
  cpu.Registers[CpuRegisters.ECX] = commandBuffer[offset + 2]; // ecx
  cpu.Registers[CpuRegisters.EDX] = commandBuffer[offset + 3]; // edx
  cpu.Registers[CpuRegisters.EBX] = commandBuffer[offset + 1]; // ebx
  cpu.Registers[CpuRegisters.ESP] = commandBuffer[offset + 7]; // esp
  cpu.Registers[CpuRegisters.EBP] = commandBuffer[offset + 6]; // ebp
  cpu.Registers[CpuRegisters.ESI] = commandBuffer[offset + 5]; // esi
  cpu.Registers[CpuRegisters.EDI] = commandBuffer[offset + 4]; // edi
  //var ss = commandBuffer[offset + 8];
  //var eflags = commandBuffer[offset + 9];
  cpu.PC = commandBuffer[offset + 10];
  //var cs = commandBuffer[offset + 11];
  //var ds = commandBuffer[offset + 12];
  //var es = commandBuffer[offset + 13];
  //var fs = commandBuffer[offset + 14];
  //var gs = commandBuffer[offset + 15];
}
