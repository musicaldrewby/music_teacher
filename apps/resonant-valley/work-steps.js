// The worker can finish a job immediately; the compatibility path advances the
// same calculation in small pieces without changing seeded results.
export function finishSteps(steps){let part;do{part=steps.next();}while(!part.done);return part.value;}
