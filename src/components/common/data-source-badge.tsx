import type { DataSourceKind } from "../../types/data-source";
import { Badge, type BadgeVariant } from "./badge";

interface DataSourceCopy {
  readonly label: string;
  readonly description: string;
  readonly variant: BadgeVariant;
}

const DATA_SOURCE_COPY: Readonly<Record<DataSourceKind, DataSourceCopy>> = {
  demo: {
    label: "데모 데이터",
    description: "화면 체험을 위해 프론트엔드에 준비된 예시 데이터입니다.",
    variant: "primary",
  },
  sample: {
    label: "샘플 데이터",
    description: "현재 계정에 준비된 샘플 자산을 서버에서 조회했습니다.",
    variant: "warn",
  },
  account: {
    label: "내 계정 데이터",
    description: "현재 로그인한 계정에 등록된 데이터를 서버에서 조회했습니다.",
    variant: "normal",
  },
  unknown: {
    label: "서버 조회 데이터",
    description: "현재 계정의 데이터를 서버에서 조회했으며 샘플 여부는 확인되지 않았습니다.",
    variant: "default",
  },
};

export function toApiDataSourceKind(
  isSampleData: boolean | undefined,
): Exclude<DataSourceKind, "demo"> {
  if (isSampleData === true) return "sample";
  if (isSampleData === false) return "account";
  return "unknown";
}

export function getDataSourceCopy(kind: DataSourceKind): DataSourceCopy {
  return DATA_SOURCE_COPY[kind];
}

interface DataSourceBadgeProps {
  readonly kind: DataSourceKind;
}

export function DataSourceBadge({ kind }: DataSourceBadgeProps) {
  const copy = getDataSourceCopy(kind);
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}
