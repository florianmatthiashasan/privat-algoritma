"""Independent SciPy/HiGHS reconciliation. No JS interval/lot-cost helpers used."""
import argparse
import json
from pathlib import Path
import numpy as np
import scipy
from scipy import stats
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix


def fixtures():
    cases = [[1, 2, 3, 4, 5], [-4, 1, 0, 7, -2, 2, 1], [0] * 20 + [0.01, -0.5, 20], list(np.sin(np.arange(300)) + 0.2)]
    result = []
    for values in cases:
        test = stats.ttest_1samp(values, 0)
        ci = test.confidence_interval()
        result.append(dict(values=values, t=float(test.statistic), p=float(test.pvalue), df=float(test.df), ci=[float(ci.low), float(ci.high)]))
    return {"source": "scipy.stats.ttest_1samp / scipy.stats.t", "scipy": scipy.__version__, "cases": result,
            "tails": [dict(t=t, df=df, p=float(2 * stats.t.sf(abs(t), df))) for df in [1, 2, 4, 9, 29, 299, 75.25] for t in [0, .1, 1, 2, 5, 20]],
            "critical": [dict(df=df, value=float(stats.t.ppf(.975, df))) for df in [1, 2, 4, 9, 29, 299, 75.25]]}


def facility_milp(rows, backlog):
    """Open production periods and allocate each demand to an open period.
    y_p binary; z_pt fraction of demand t; sum_p z_pt=1; z_pt<=y_p.
    Per-unit transport is computed by explicit sums, not JS prefixes/DP.
    """
    n = len(rows)
    assignments = [(p, t) for p in range(n) for t in range(n) if rows[t]['demand'] > 0 and (backlog or p <= t)]
    demands = [t for t in range(n) if rows[t]['demand'] > 0]
    size = n + len(assignments)
    cost = np.zeros(size)
    cost[:n] = [row['setup'] for row in rows]
    matrix = lil_matrix((len(demands) + len(assignments), size), dtype=float)
    lower = np.r_[np.ones(len(demands)), np.full(len(assignments), -np.inf)]
    upper = np.r_[np.ones(len(demands)), np.zeros(len(assignments))]
    demand_index = {t: i for i, t in enumerate(demands)}
    for j, (p, t) in enumerate(assignments):
        unit = sum(rows[k]['holding'] for k in range(p, t)) if p <= t else sum(rows[k]['backlog'] for k in range(t, p))
        cost[n + j] = rows[t]['demand'] * unit
        matrix[demand_index[t], n + j] = 1
        matrix[len(demands) + j, n + j] = 1
        matrix[len(demands) + j, p] = -1
    answer = milp(cost, integrality=np.r_[np.ones(n), np.zeros(len(assignments))], bounds=Bounds(0, 1),
                  constraints=LinearConstraint(matrix.tocsc(), lower, upper), options={"mip_rel_gap": 0, "time_limit": 20})
    return answer


def check_statistics(run):
    checks = 0
    records = run['records']
    for comparison in run['comparisons']:
        mode, a, b = comparison['mode'], comparison['a'], comparison['b']
        rb = {r['problemId']: r for r in records if r['mode'] == mode and r['method'] == b}
        pairs = [(r, r['gap'] - rb[r['problemId']]['gap']) for r in records if r['mode'] == mode and r['method'] == a and not r['issues'] and not rb[r['problemId']]['issues']]
        delta = np.array([d for _, d in pairs])
        np.testing.assert_allclose(comparison['meanDifference'], np.mean(delta), atol=1e-10)
        if comparison['paired']['status'] == 'ok':
            answer = stats.ttest_1samp(delta, 0)
            np.testing.assert_allclose([comparison['paired']['t'], comparison['paired']['p']], [answer.statistic, answer.pvalue], rtol=1e-7, atol=1e-12)
            checks += 1
        groups = {}
        for row, d in pairs:
            key = (row['cellId'] + '/b=' + str(row['backlogRatio'])) if row.get('cellId') and 'backlogRatio' in row else row.get('cellId') or row['family']
            groups.setdefault(key, []).append(d)
        if comparison['stratified']['status'] == 'ok':
            variances = [((len(v) / len(delta)) ** 2) * np.var(v, ddof=1) / len(v) for v in groups.values()]
            v = sum(variances)
            df = v * v / sum(x * x / (len(g) - 1) for x, g in zip(variances, groups.values()))
            statistic = np.mean(delta) / np.sqrt(v)
            np.testing.assert_allclose([comparison['stratified']['t'], comparison['stratified']['df'], comparison['stratified']['p']], [statistic, df, 2 * stats.t.sf(abs(statistic), df)], rtol=1e-7, atol=1e-12)
            checks += 1
        nonzero = delta[np.abs(delta) > 1e-9]
        if len(nonzero):
            answer = stats.binomtest(int(np.sum(nonzero < 0)), len(nonzero), .5)
            np.testing.assert_allclose(comparison['signP'], answer.pvalue, rtol=1e-7, atol=1e-12)
            checks += 1
    return checks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixtures', action='store_true')
    parser.add_argument('--input', default='experiments/results.json')
    parser.add_argument('--problems', default='experiments/problems.json')
    parser.add_argument('--output', default='experiments/validation.json')
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    if args.fixtures:
        Path('src/statistics.fixtures.json').write_text(json.dumps(fixtures(), indent=2) + '\n')
        return
    run = json.loads(Path(args.input).read_text())
    problems = json.loads(Path(args.problems).read_text())['problems']
    if args.limit:
        problems = problems[:args.limit]
    references = {(r['problemId'], r['mode']): r for r in run['records'] if r['method'] == 'ww'}
    records = []
    for i, problem in enumerate(problems):
        for backlog in [False, True]:
            mode = 'backlog' if backlog else 'noBacklog'
            answer = facility_milp(problem['rows'], backlog)
            reference = references[(problem['id'], mode)]['total']
            certified = answer.status == 0 and abs(answer.fun - reference) <= 1e-6 * max(1, reference)
            records.append(dict(problemId=problem['id'], mode=mode, status=int(answer.status), certified=bool(certified), objective=None if answer.fun is None else float(answer.fun), reference=reference,
                                dualBound=None if getattr(answer, 'mip_dual_bound', None) is None else float(answer.mip_dual_bound), gap=None if getattr(answer, 'mip_gap', None) is None else float(answer.mip_gap)))
        if (i + 1) % 25 == 0:
            print(f'{i + 1}/{len(problems)} problem: HiGHS doğrulandı', flush=True)
    statistical_checks = check_statistics(run)
    result = dict(scipy=scipy.__version__, formulation='Independent facility-location MILP; binary setup, continuous demand allocation', inputSHA256=run.get('inputSHA256'),
                  modelVersion=run['modelVersion'], designVersion=run['designVersion'], statisticalChecks=statistical_checks, total=len(records), certified=sum(r['certified'] for r in records), records=records)
    Path(args.output).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'records'}, indent=2))
    if result['certified'] != result['total']:
        raise SystemExit('En az bir sonuç bağımsız MILP ile optimum olarak doğrulanamadı; validation.json dosyasına bakın.')


if __name__ == '__main__':
    main()
