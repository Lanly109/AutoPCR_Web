type PolyfillOptions = {
  transfer?: unknown[]
}

function createDataCloneError(message: string): Error {
  try {
    return new DOMException(message, "DataCloneError")
  } catch {
    const error = new Error(message)
    error.name = "DataCloneError"
    return error
  }
}

function cloneArrayBuffer(input: ArrayBufferLike): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input.slice(0)
  }

  return Uint8Array.from(new Uint8Array(input)).buffer
}

function cloneValue<T>(input: T, seen: WeakMap<object, unknown>): T {
  if (input === null || typeof input !== "object") {
    if (typeof input === "function" || typeof input === "symbol") {
      throw createDataCloneError("The provided value cannot be cloned.")
    }
    return input
  }

  if (seen.has(input as object)) {
    return seen.get(input as object) as T
  }

  if (input instanceof Date) {
    return new Date(input.getTime()) as T
  }

  if (input instanceof RegExp) {
    return new RegExp(input.source, input.flags) as T
  }

  if (input instanceof ArrayBuffer) {
    return cloneArrayBuffer(input) as T
  }

  if (ArrayBuffer.isView(input)) {
    if (input instanceof DataView) {
      return new DataView(
        cloneArrayBuffer(input.buffer),
        input.byteOffset,
        input.byteLength,
      ) as T
    }

    const typedArray = input as unknown as {
      constructor: new (
        buffer: ArrayBuffer,
        byteOffset?: number,
        length?: number,
      ) => unknown
      buffer: ArrayBuffer
      byteOffset: number
      length: number
    }

    return new typedArray.constructor(
      cloneArrayBuffer(typedArray.buffer),
      typedArray.byteOffset,
      typedArray.length,
    ) as T
  }

  if (input instanceof Map) {
    const out = new Map()
    seen.set(input, out)
    input.forEach((value, key) => {
      out.set(cloneValue(key, seen), cloneValue(value, seen))
    })
    return out as T
  }

  if (input instanceof Set) {
    const out = new Set()
    seen.set(input, out)
    input.forEach((value) => {
      out.add(cloneValue(value, seen))
    })
    return out as T
  }

  if (input instanceof WeakMap || input instanceof WeakSet || input instanceof Promise) {
    throw createDataCloneError("The provided value cannot be cloned.")
  }

  const out = Array.isArray(input)
    ? []
    : Object.create(Object.getPrototypeOf(input))

  seen.set(input as object, out)

  for (const key of Reflect.ownKeys(input as object)) {
    const descriptor = Object.getOwnPropertyDescriptor(input as object, key)
    if (!descriptor) {
      continue
    }

    if ("value" in descriptor) {
      descriptor.value = cloneValue(descriptor.value, seen)
    }

    Object.defineProperty(out, key, descriptor)
  }

  return out as T
}

function structuredClonePolyfill<T>(value: T, options?: PolyfillOptions): T {
  if (options && Array.isArray(options.transfer) && options.transfer.length > 0) {
    throw createDataCloneError("This structuredClone polyfill does not support transfer.")
  }

  return cloneValue(value, new WeakMap())
}

if (typeof globalThis.structuredClone !== "function") {
  Object.defineProperty(globalThis, "structuredClone", {
    configurable: true,
    writable: true,
    value: structuredClonePolyfill,
  })
}

export {}
