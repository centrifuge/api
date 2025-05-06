/* eslint-disable @typescript-eslint/no-explicit-any */
type InferArgs<T> = T extends (...t: [...infer Arg]) => any ? Arg : never
type InferReturn<T> = T extends (...t: [...infer Arg]) => infer Res ? Res : never

/**
 * Wrapper to provide standard error handling throughout the application
 * @param method Block handler, Event handler or function for witch a generic catcher should be attached
 * @returns Same function with a corresponding ceneric catcher for error handling
 */
export function errorHandler<TFunc extends (...args: any[]) => any>(
  method: TFunc
): (...args: InferArgs<TFunc>) => InferReturn<TFunc> {
  return function (...args: InferArgs<TFunc>) {
    return method(...args).catch(errorLogger)
  }
}
export function errorLogger<E extends Error>(err: E) {
  logger.error(err)
}

export const missingPool = new Error('Pool not found or untracked! Maybe it was created before starting block?')
