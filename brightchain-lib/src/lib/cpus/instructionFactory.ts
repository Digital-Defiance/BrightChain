/**
 * Instruction Factory - Data-driven instruction set builder
 *
 * This factory breaks the circular dependency by:
 * 1. Using data (opcode definitions) instead of type-specific code
 * 2. Not importing CPU types in instruction definitions
 * 3. Allowing CPU to optionally use instruction builders
 *
 * Instructions are defined as data (opcode -> function mapping) rather than
 * hard-coded in the CPU or instruction table files.
 */

/**
 * CPU execution context interface
 * Generic enough to work with any CPU implementation
 */
export interface ICpuContext {
  PC: number;
  pop: () => number;
  push: (value: number) => void;
  registers: number[] | Uint32Array;
  memory: Uint8Array;
}

export interface InstructionDefinition {
  readonly opcode: number;
  readonly mnemonic: string;
  readonly handler: (context: ICpuContext) => void;
}

export interface InstructionSet {
  readonly name: string;
  readonly instructions: InstructionDefinition[];
}

/**
 * Create an instruction factory for a given instruction set
 * This avoids circular dependencies by making instruction sets data-driven
 */
export function createInstructionFactory(
  instructionSet: InstructionSet,
): Map<number, (context: ICpuContext) => void> {
  const instructionMap = new Map<number, (context: ICpuContext) => void>();

  for (const instruction of instructionSet.instructions) {
    if (instructionMap.has(instruction.opcode)) {
      throw new Error(
        `Duplicate opcode 0x${instruction.opcode.toString(16)} in instruction set ${instructionSet.name}`,
      );
    }
    instructionMap.set(instruction.opcode, instruction.handler);
  }

  return instructionMap;
}

/**
 * Create a sparse array (0-indexed) from instruction definitions
 * More cache-friendly than Map for sequential opcodes
 */
export function createInstructionArray(
  instructionSet: InstructionSet,
  arraySize: number = 256,
): Array<(context: ICpuContext) => void> {
  const array = new Array<(context: ICpuContext) => void>(arraySize);

  // Fill with no-op by default
  const noOp = () => {
    // No operation
  };
  for (let i = 0; i < arraySize; i++) {
    array[i] = noOp;
  }

  // Fill with actual instructions
  for (const instruction of instructionSet.instructions) {
    if (instruction.opcode < arraySize) {
      array[instruction.opcode] = instruction.handler;
    }
  }

  return array;
}

/**
 * RISC-V RV32I Instruction Set Definition (Subset for Blockchain VM)
 *
 * This is data-driven, so it doesn't depend on CPU type.
 * The CPU can use this to build its instruction handlers.
 */
export const RISCV_RV32I_INSTRUCTIONS: InstructionSet = {
  name: 'RISC-V RV32I (Subset)',
  instructions: [
    // Load/Store instructions
    {
      opcode: 0x03,
      mnemonic: 'LW',
      handler: (_cpu: ICpuContext) => {
        // Load Word
        throw new Error('LW not implemented');
      },
    },
    {
      opcode: 0x23,
      mnemonic: 'SW',
      handler: (_cpu: ICpuContext) => {
        // Store Word
        throw new Error('SW not implemented');
      },
    },

    // Arithmetic instructions
    {
      opcode: 0x13,
      mnemonic: 'ADDI',
      handler: (_cpu: ICpuContext) => {
        // Add Immediate
        throw new Error('ADDI not implemented');
      },
    },
    {
      opcode: 0x33,
      mnemonic: 'ADD',
      handler: (_cpu: ICpuContext) => {
        // Add
        throw new Error('ADD not implemented');
      },
    },
    {
      opcode: 0x33,
      mnemonic: 'SUB',
      handler: (_cpu: ICpuContext) => {
        // Subtract (same opcode as ADD, differs in funct7)
        throw new Error('SUB not implemented');
      },
    },

    // Branch instructions
    {
      opcode: 0x63,
      mnemonic: 'BEQ',
      handler: (_cpu: ICpuContext) => {
        // Branch if Equal
        throw new Error('BEQ not implemented');
      },
    },
    {
      opcode: 0x63,
      mnemonic: 'BNE',
      handler: (_cpu: ICpuContext) => {
        // Branch if Not Equal
        throw new Error('BNE not implemented');
      },
    },

    // Jump instructions
    {
      opcode: 0x6f,
      mnemonic: 'JAL',
      handler: (_cpu: ICpuContext) => {
        // Jump and Link
        throw new Error('JAL not implemented');
      },
    },
    {
      opcode: 0x67,
      mnemonic: 'JALR',
      handler: (_cpu: ICpuContext) => {
        // Jump and Link Register
        throw new Error('JALR not implemented');
      },
    },

    // System instructions
    {
      opcode: 0x73,
      mnemonic: 'SYSTEM',
      handler: (_cpu: ICpuContext) => {
        // System call
        throw new Error('SYSTEM not implemented');
      },
    },

    // No-op
    {
      opcode: 0x13,
      mnemonic: 'NOP',
      handler: () => {
        // No operation
      },
    },
  ],
};

/**
 * Legacy x86-compatible instruction set (for backward compatibility)
 *
 * This is a minimal x86-like instruction set encoded as data.
 * Not recommended for new code, but provided for compatibility.
 */
export const X86_LEGACY_INSTRUCTIONS: InstructionSet = {
  name: 'x86 (Legacy)',
  instructions: [
    {
      opcode: 0x90,
      mnemonic: 'NOP',
      handler: () => {
        // No operation
      },
    },
    {
      opcode: 0xc3,
      mnemonic: 'RET',
      handler: (cpu: ICpuContext) => {
        // Return - pop PC
        cpu.PC = cpu.pop();
      },
    },
    {
      opcode: 0xeb,
      mnemonic: 'JMP',
      handler: (_cpu: ICpuContext) => {
        // Jump
        throw new Error('JMP not implemented');
      },
    },
  ],
};
