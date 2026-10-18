import { checkConfig, generateProblems, runProblem } from './experiments.js'
import { finalizeExperiment, restoreExperiment } from './experimentResult.js'

self.onmessage = async ({ data }) => {
  try {
    if (data.task === 'import') { self.postMessage({ type: 'complete', result: await restoreExperiment(data.result) }); return }
    const config = checkConfig(data.config ?? data); const start = performance.now()
    const problems = generateProblems(config); const records = []
    for (let i = 0; i < problems.length; i++) {
      records.push(...runProblem(problems[i], config))
      if ((i + 1) % 5 === 0 || i === problems.length - 1) self.postMessage({ type: 'progress', completed: i + 1, total: problems.length })
    }
    const result = await finalizeExperiment(config, problems, records, { environment: { userAgent: navigator.userAgent, elapsedMs: performance.now() - start, runtime: 'Web Worker' } })
    self.postMessage({ type: 'complete', result })
  } catch (error) { self.postMessage({ type: 'error', message: error.message }) }
}
