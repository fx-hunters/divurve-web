/**
 * 환율 시계열 결측 히트맵 (이슈 #85).
 *
 * 통화쌍별로 조회 구간을 띠 하나로 깔고, 빠진 구간을 그 위에 표시한다. 띠를
 * 누르면 그 구간만 다시 받는다 — 보는 것에서 바로 조치로 이어지게 하려는 것이
 * 이 화면의 목적이다.
 *
 * 날짜 한 칸씩의 격자를 쓰지 않는 이유는 `admin-fx-gap-presenter.ts` 머리말에
 * 적었다. 요약하면 영업일 달력은 서버가 쥐고 있다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  backfillAdminFxGaps,
  fetchAdminFxGaps,
  type AdminFxBackfillReport,
  type AdminFxCoverage,
  type AdminFxPairCoverage,
} from "../../api/admin-fx-gaps";
import { toDefaultFxRateRange } from "./admin-datetime";
import type { AdminAuthFailure } from "./admin-errors";
import {
  formatCoverageRatio,
  toCoverageTone,
  toGapSegments,
  type AdminBackfillTarget,
} from "./admin-fx-gap-presenter";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

interface AdminFxGapHeatmapProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

/** 통화쌍 하나의 띠. 빠진 구간만 누를 수 있다. */
function CoverageRow({
  coverage,
  onSelectGap,
}: {
  readonly coverage: AdminFxPairCoverage;
  readonly onSelectGap: (target: AdminBackfillTarget) => void;
}) {
  const segments = toGapSegments(coverage);
  const tone = toCoverageTone(coverage);
  const pairCode = coverage.pairCode;

  return (
    <div className="admin-gap-row">
      <div className="admin-gap-row__head">
        <span className="admin-gap-row__pair">
          {formatAdminValue(pairCode)}
        </span>
        <span className={`admin-gap-row__ratio admin-gap-row__ratio--${tone}`}>
          {formatCoverageRatio(coverage.coverageRatio)}
        </span>
        <span className="admin-gap-row__missing">
          결측 {formatAdminValue(coverage.missingBusinessDays)}일 / 영업일{" "}
          {formatAdminValue(coverage.expectedBusinessDays)}일
        </span>
      </div>
      <div
        className="admin-gap-track"
        role="img"
        aria-label={`${formatAdminValue(pairCode)} 커버리지 ${formatCoverageRatio(
          coverage.coverageRatio,
        )}, 결측 구간 ${segments.length}개`}
      >
        {segments.map((segment) => (
          <button
            key={`${segment.from}-${segment.to}`}
            type="button"
            className="admin-gap-track__gap"
            style={{
              left: `${segment.leftPercent}%`,
              width: `${segment.widthPercent}%`,
            }}
            title={`${segment.from} ~ ${segment.to} (영업일 ${formatAdminValue(
              segment.businessDays,
            )}일)`}
            disabled={pairCode === null}
            onClick={() =>
              pairCode !== null &&
              onSelectGap({
                pairCode,
                from: segment.from,
                to: segment.to,
              })
            }
          >
            <span className="admin-visually-hidden">
              {`${formatAdminValue(pairCode)} ${segment.from}부터 ${
                segment.to
              }까지 결측 구간 다시 받기`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 백필 결과 요약. 남은 구간이 있으면 그것이 곧 서버도 답하지 못한 구간이다. */
function BackfillReportPanel({
  report,
}: {
  readonly report: AdminFxBackfillReport;
}) {
  const remaining = report.pairs.flatMap((pair) => pair.remainingGaps);
  const failures = report.pairs.filter(
    (pair) => pair.failureReason !== null,
  );

  return (
    <div className="admin-panel admin-panel--idle">
      <p>
        채움 {formatAdminValue(report.totalFilled)}일 · 고시 부재 확정{" "}
        {formatAdminValue(report.totalConfirmedAbsent)}일
      </p>
      {failures.map((pair) => (
        <p key={pair.pairCode ?? "unknown"}>
          {formatAdminValue(pair.pairCode)}: {pair.failureReason}
        </p>
      ))}
      {remaining.length > 0 && (
        <p>
          남은 구간 {remaining.length}개 — 다시 받아도 채워지지 않은 날입니다.
        </p>
      )}
    </div>
  );
}

export function AdminFxGapHeatmap({ onAuthFailure }: AdminFxGapHeatmapProps) {
  const defaultRange = useMemo(() => toDefaultFxRateRange(new Date()), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [target, setTarget] = useState<AdminBackfillTarget | null>(null);

  const coverage = useAdminRequest<
    [{ from: string; to: string }],
    AdminFxCoverage
  >(
    useCallback(
      (query: { from: string; to: string }) => fetchAdminFxGaps(query),
      [],
    ),
    onAuthFailure,
  );
  const backfill = useAdminRequest<
    [AdminBackfillTarget],
    AdminFxBackfillReport
  >(
    useCallback(
      (input: AdminBackfillTarget) => backfillAdminFxGaps(input),
      [],
    ),
    onAuthFailure,
  );

  const { send: loadCoverage } = coverage;
  useEffect(() => {
    void loadCoverage({ from: defaultRange.from, to: defaultRange.to });
  }, [loadCoverage, defaultRange]);

  const reload = () => {
    setTarget(null);
    void loadCoverage({ from, to });
  };

  /** 대상은 인자로 받는다 — 버튼이 대상이 있을 때만 그려져 가드가 필요 없다. */
  const runBackfill = async (selected: AdminBackfillTarget) => {
    await backfill.send(selected);
    setTarget(null);
    void loadCoverage({ from, to });
  };

  return (
    <AdminSection title="환율 결측">
      <p className="admin-panel admin-panel--idle">
        빠진 구간을 누르면 그 구간만 다시 받습니다. 전체 재적재가 아닙니다.
      </p>

      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          reload();
        }}
      >
        <label className="admin-field">
          <span>from</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>to</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button type="submit" className="admin-button admin-button--primary">
          조회
        </button>
      </form>

      {target !== null && (
        <div className="admin-panel admin-panel--warn">
          <p>
            {target.pairCode} {target.from} ~ {target.to} 구간을 다시 받습니다.
          </p>
          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={backfill.state.status === "loading"}
            onClick={() => {
              void runBackfill(target);
            }}
          >
            {backfill.state.status === "loading" ? "받는 중" : "백필"}
          </button>
          <button
            type="button"
            className="admin-button"
            onClick={() => setTarget(null)}
          >
            취소
          </button>
        </div>
      )}

      {backfill.state.status === "error" && (
        <AdminErrorPanel error={backfill.state.error} />
      )}
      {backfill.state.status === "success" && (
        <BackfillReportPanel report={backfill.state.result.data} />
      )}

      {coverage.state.status === "idle" && (
        <AdminLoadingPanel label="결측을 불러오는 중입니다." />
      )}
      {coverage.state.status === "loading" && (
        <AdminLoadingPanel label="결측을 불러오는 중입니다." />
      )}
      {coverage.state.status === "error" && (
        <AdminErrorPanel error={coverage.state.error} />
      )}
      {coverage.state.status === "success" && (
        <>
          <AdminMetaLine meta={coverage.state.result.meta} />
          {coverage.state.result.data.pairs.length === 0 ? (
            <p className="admin-empty">저장 대상 통화쌍이 없습니다.</p>
          ) : (
            coverage.state.result.data.pairs.map((pair, index) => (
              <CoverageRow
                key={pair.pairCode ?? `row-${index}`}
                coverage={pair}
                onSelectGap={setTarget}
              />
            ))
          )}
        </>
      )}
    </AdminSection>
  );
}
