/**
 * 백엔드가 절전 상태에서 깨어나는 동안 화면 최상단에 뜨는 안내 배너.
 *
 * 무한 로딩처럼 보이는 첫 요청의 이유를 알려 준다. 한 번 뜨면 새로고침 전까지
 * 남는다(`api/cold-start-notice.ts`).
 */
import { useEffect } from "react";
import { useColdStartNotice } from "../../hooks/use-cold-start-notice";
import { useElementSize } from "../../hooks/use-element-size";
import { Icon } from "./icon";
import "./cold-start-banner.css";

/** 배너가 차지한 높이를 담아 두는 토큰. 화면 높이 계산이 이 값을 뺀다. */
const BANNER_HEIGHT_TOKEN = "--cold-start-banner-height";

function ColdStartBannerStrip() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const bannerHeight = size?.height ?? null;

  // 배너는 문서 맨 앞에 놓여 화면 전체를 아래로 민다. 밀린 만큼을 토큰에 적어
  // 100vh를 쓰는 셸들이 화면 밖으로 넘치지 않게 한다(tokens.css).
  useEffect(() => {
    if (bannerHeight === null) return;
    const root = document.documentElement;
    root.style.setProperty(BANNER_HEIGHT_TOKEN, `${bannerHeight}px`);
    return () => {
      root.style.removeProperty(BANNER_HEIGHT_TOKEN);
    };
  }, [bannerHeight]);

  return (
    <div ref={ref} className="cold-start-banner" role="status" aria-live="polite">
      <span className="cold-start-banner-icon" aria-hidden="true">
        <Icon name="alertTriangle" size={18} />
      </span>
      <p className="cold-start-banner-text">
        <span className="cold-start-banner-title">서버를 깨우는 중입니다. </span>
        무료 서버는 일정 시간 요청이 없으면 절전 상태로 내려갑니다. 첫 응답까지 1분
        정도 걸릴 수 있으니 화면을 그대로 두고 기다려 주세요.
      </p>
    </div>
  );
}

export function ColdStartBanner() {
  const isColdStartNoticed = useColdStartNotice();
  return isColdStartNoticed ? <ColdStartBannerStrip /> : null;
}
