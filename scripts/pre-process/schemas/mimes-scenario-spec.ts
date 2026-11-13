import { declareSchema } from './_template'

export const mimesScenarioSpec = declareSchema({
  id: 'mimes-scenario-spec',
  family: 'mimes-input-scenarios',
  classify: (headers) =>
    headers.some((c) => /scenario/i.test(c)) &&
    headers.some((c) => /parameter/i.test(c)) &&
    headers.some((c) => /^value$/i.test(c.trim())),
})
