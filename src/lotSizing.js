/**
 * Deterministik, kapasitesiz parti büyüklüğü modelleri.
 * holding[t], t döneminin sonunda elde tutulan birim başına stok maliyetidir.
 */

const lotDemand = (rows, start, end) => rows.slice(start, end + 1).reduce((sum, row) => sum + row.demand, 0)

export function holdingCost(rows, start, end) {
  let carriedUnitCost = 0
  let total = 0

  for (let period = start + 1; period <= end; period += 1) {
    carriedUnitCost += rows[period - 1].holding
    total += rows[period].demand * carriedUnitCost
  }

  return total
}

export function lotsToPlan(rows, lots) {
  const usefulLots = lots.filter(([start, end]) => lotDemand(rows, start, end) > 0)
  const production = Array(rows.length).fill(0)
  usefulLots.forEach(([start, end]) => { production[start] = lotDemand(rows, start, end) })

  let inventory = 0
  const stock = rows.map((row, index) => {
    inventory += production[index] - row.demand
    return inventory
  })

  const setupCost = usefulLots.reduce((sum, [start]) => sum + rows[start].setup, 0)
  const stockCost = usefulLots.reduce((sum, [start, end]) => sum + holdingCost(rows, start, end), 0)
  return { production, stock, lots: usefulLots, setupCost, stockCost, total: setupCost + stockCost }
}

export function l4l(rows) {
  return lotsToPlan(rows, rows.flatMap((row, index) => row.demand > 0 ? [[index, index]] : []))
}

export function silverMeal(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start += 1; continue }

    let end = start; let previousAverage = rows[start].setup
    while (end + 1 < rows.length) {
      const nextEnd = end + 1
      const average = (rows[start].setup + holdingCost(rows, start, nextEnd)) / (nextEnd - start + 1)
      if (average > previousAverage) break
      previousAverage = average; end = nextEnd
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

export function leastUnitCost(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start += 1; continue }

    let end = start; let quantity = rows[start].demand
    let previousUnitCost = rows[start].setup / quantity
    while (end + 1 < rows.length) {
      const nextEnd = end + 1
      const nextQuantity = quantity + rows[nextEnd].demand
      const unitCost = (rows[start].setup + holdingCost(rows, start, nextEnd)) / nextQuantity
      if (unitCost > previousUnitCost) break
      previousUnitCost = unitCost; quantity = nextQuantity; end = nextEnd
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

export function ppb(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start += 1; continue }

    let end = start
    while (end + 1 < rows.length) {
      const currentDifference = Math.abs(rows[start].setup - holdingCost(rows, start, end))
      const nextDifference = Math.abs(rows[start].setup - holdingCost(rows, start, end + 1))
      if (nextDifference > currentDifference) break
      end += 1
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

export function leastTotalCost(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start += 1; continue }

    let end = start; let bestDifference = rows[start].setup
    for (let nextEnd = start + 1; nextEnd < rows.length; nextEnd += 1) {
      const difference = Math.abs(rows[start].setup - holdingCost(rows, start, nextEnd))
      if (difference > bestDifference) break
      bestDifference = difference; end = nextEnd
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

export function wagnerWhitin(rows) {
  const periods = rows.length
  const costToGo = Array(periods + 1).fill(Infinity)
  const choice = Array(periods).fill(null)
  costToGo[periods] = 0

  for (let start = periods - 1; start >= 0; start -= 1) {
    if (rows[start].demand === 0) costToGo[start] = costToGo[start + 1]

    for (let end = start; end < periods; end += 1) {
      if (lotDemand(rows, start, end) === 0) continue
      const candidate = rows[start].setup + holdingCost(rows, start, end) + costToGo[end + 1]
      if (candidate < costToGo[start]) {
        costToGo[start] = candidate
        choice[start] = end
      }
    }
  }

  const lots = []; let start = 0
  while (start < periods) {
    if (choice[start] === null) { start += 1; continue }
    lots.push([start, choice[start]])
    start = choice[start] + 1
  }
  return lotsToPlan(rows, lots)
}

export const solver = { l4l, silver: silverMeal, luc: leastUnitCost, ww: wagnerWhitin, ppb, ltc: leastTotalCost }
